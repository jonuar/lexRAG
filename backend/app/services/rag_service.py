import os
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Initialize embedding model (free, no API key required)
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
embedder = SentenceTransformer(EMBEDDING_MODEL)

# Initialize ChromaDB with persistent storage
chroma_client = chromadb.Client(
    Settings(
        persist_directory="./chroma_store",
        anonymized_telemetry=False,
    )
)

COLLECTION_NAME = "trademark_docs"

def get_collection():
    """Get or create the ChromaDB collection."""
    return chroma_client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def chunk_text(text: str) -> list[str]:
    """Split text into overlapping chunks for better retrieval."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=512,
        chunk_overlap=64,
        separators=["\n\n", "\n", ".", " "],
    )
    return splitter.split_text(text)


def ingest_document(doc_id: str, content: str, metadata: dict) -> dict:
    """
    Embed and store a document in ChromaDB.
    Returns summary of ingestion result.
    """
    collection = get_collection()
    chunks = chunk_text(content)

    if not chunks:
        return {"error": "Document produced no chunks after splitting."}

    # Generate embeddings for all chunks
    embeddings = embedder.encode(chunks).tolist()

    # Build unique IDs for each chunk
    ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [{**metadata, "chunk_index": i, "doc_id": doc_id} for i in range(len(chunks))]

    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=metadatas,
    )

    return {
        "doc_id": doc_id,
        "chunks_stored": len(chunks),
        "model": EMBEDDING_MODEL,
    }


def query_documents(question: str, n_results: int = 5) -> dict:
    """
    Embed the question and retrieve the most similar chunks.
    Returns retrieved context and a synthesized answer.
    """
    collection = get_collection()

    # Check collection is not empty
    if collection.count() == 0:
        return {"answer": "No documents have been ingested yet.", "sources": []}

    # Embed the query
    query_embedding = embedder.encode([question]).tolist()

    results = collection.query(
        query_embeddings=query_embedding,
        n_results=min(n_results, collection.count()),
        include=["documents", "metadatas", "distances"],
    )

    docs = results["documents"][0]
    metas = results["metadatas"][0]
    distances = results["distances"][0]

    # Build context block for prompt
    context = "\n\n---\n\n".join(
        [f"[Source: {m.get('title', 'Unknown')}]\n{d}" for d, m in zip(docs, metas)]
    )

    # Simple extractive answer: return most relevant chunk + context
    answer = _synthesize_answer(question, context)

    sources = [
        {
            "title": m.get("title", "Unknown"),
            "doc_id": m.get("doc_id", ""),
            "relevance_score": round(1 - dist, 4),
            "excerpt": doc[:200] + "..." if len(doc) > 200 else doc,
        }
        for doc, m, dist in zip(docs, metas, distances)
    ]

    return {"answer": answer, "sources": sources, "context_used": len(docs)}


def _synthesize_answer(question: str, context: str) -> str:
    """
    Lightweight answer synthesis without an LLM API.
    Returns the most relevant context passage as the answer.
    Uses simple heuristic ranking by keyword overlap.
    """
    question_words = set(question.lower().split())
    passages = context.split("\n\n---\n\n")

    scored = []
    for passage in passages:
        words = set(passage.lower().split())
        overlap = len(question_words & words)
        scored.append((overlap, passage))

    scored.sort(key=lambda x: x[0], reverse=True)
    best = scored[0][1] if scored else context

    # Strip source header if present
    lines = best.split("\n")
    if lines and lines[0].startswith("[Source:"):
        best = "\n".join(lines[1:]).strip()

    return best


def list_documents() -> list[dict]:
    """Return a deduplicated list of ingested documents."""
    collection = get_collection()
    if collection.count() == 0:
        return []

    results = collection.get(include=["metadatas"])
    seen = set()
    docs = []
    for meta in results["metadatas"]:
        doc_id = meta.get("doc_id", "")
        if doc_id not in seen:
            seen.add(doc_id)
            docs.append(
                {
                    "doc_id": doc_id,
                    "title": meta.get("title", "Untitled"),
                    "category": meta.get("category", "General"),
                }
            )
    return docs


def delete_document(doc_id: str) -> dict:
    """Delete all chunks associated with a document ID."""
    collection = get_collection()
    results = collection.get(where={"doc_id": doc_id}, include=["metadatas"])
    ids_to_delete = results["ids"]

    if not ids_to_delete:
        return {"error": f"Document '{doc_id}' not found."}

    collection.delete(ids=ids_to_delete)
    return {"deleted": doc_id, "chunks_removed": len(ids_to_delete)}
