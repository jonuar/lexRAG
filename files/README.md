# LexRAG — Legal Document Intelligence

> Semantic search and natural language Q&A over legal and trademark documents,  
> powered by RAG (Retrieval-Augmented Generation), sentence-transformers, ChromaDB, and Flask.

![LexRAG UI](docs/preview.png)

---

## Overview

LexRAG is a production-ready RAG pipeline designed for legal and intellectual property documents. It allows users to ingest unstructured legal text, index it as vector embeddings, and query it using natural language — returning semantically relevant answers with source attribution.

**Why this matters for legal IP search:**  
Traditional keyword search fails when users ask questions like *"What is the standard for trademark confusion?"* — the answer may live across multiple documents using different terminology. Semantic search solves this by understanding meaning, not just words. This is the same principle behind modern legal discovery tools and platforms like Trademarkia.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js Frontend                    │
│              (Vercel · TypeScript · CSS vars)           │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP (REST)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    Flask REST API                       │
│                                                         │
│   POST /api/ingest   →  chunk → embed → store          │
│   POST /api/query    →  embed → search → synthesize    │
│   GET  /api/documents                                   │
│   GET  /api/health                                      │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
┌──────────────────┐        ┌──────────────────────────┐
│  sentence-        │        │       ChromaDB           │
│  transformers     │        │  (persistent vector      │
│  all-MiniLM-L6-v2 │        │   store · cosine sim)    │
│  (free, local)    │        │                          │
└──────────────────┘        └──────────────────────────┘
```

### RAG Pipeline — Step by Step

```
INGEST
  Raw text
    └─► RecursiveCharacterTextSplitter (512 tokens, 64 overlap)
          └─► SentenceTransformer.encode()  →  float32 vectors
                └─► ChromaDB.add()          →  persisted to disk

QUERY
  User question
    └─► SentenceTransformer.encode()        →  query vector
          └─► ChromaDB.query()              →  top-K chunks (cosine)
                └─► Context assembly        →  ranked passages
                      └─► Answer synthesis  →  returned to client
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| API | Flask 3 + Flask-CORS | Lightweight, production-proven Python web framework |
| Embeddings | sentence-transformers `all-MiniLM-L6-v2` | Free, fast, no API key required — 384-dim vectors |
| Vector Store | ChromaDB | Simple setup, persistent storage, cosine similarity |
| Text Splitting | LangChain `RecursiveCharacterTextSplitter` | Overlap-aware chunking for better context retrieval |
| Frontend | Next.js 14 + TypeScript | Production-grade, deploys instantly to Vercel |
| Containerization | Docker + docker-compose | Consistent environments, Render-ready |
| Deployment (API) | Render (free tier) | Docker-native, persistent disk for ChromaDB |
| Deployment (UI) | Vercel | Zero-config Next.js deployment |

---

## Project Structure

```
lexrag/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask app factory
│   │   ├── routes/
│   │   │   ├── ingest.py        # POST /api/ingest, GET/DELETE /api/documents
│   │   │   ├── query.py         # POST /api/query
│   │   │   └── health.py        # GET /api/health
│   │   └── services/
│   │       └── rag_service.py   # Core RAG logic: embed, store, retrieve
│   ├── run.py                   # Entrypoint
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx         # Main UI: Query · Ingest · Documents tabs
│   │   │   └── globals.css
│   │   └── lib/
│   │       └── api.ts           # Typed API client
│   ├── next.config.js
│   ├── vercel.json
│   └── package.json
├── docker-compose.yml           # Local full-stack development
├── render.yaml                  # Render deployment config
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker (optional, recommended)

### Option A — Docker (recommended)

```bash
git clone https://github.com/jonuar/lexrag.git
cd lexrag

# Start the backend (first run downloads the embedding model ~90MB)
docker-compose up --build

# Backend running at http://localhost:5000
```

### Option B — Local Python

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt
python run.py
```

### Frontend

```bash
cd frontend
npm install

# Set your backend URL
echo "NEXT_PUBLIC_API_URL=http://localhost:5000" > .env.local

npm run dev
# → http://localhost:3000
```

---

## API Reference

### `POST /api/ingest`

Ingest a document into the vector store.

**Request**
```json
{
  "title": "ApplePay – Trademark Class 36",
  "content": "ApplePay is a registered trademark by Apple Inc...",
  "category": "Financial Services"
}
```

**Response**
```json
{
  "success": true,
  "doc_id": "a3f1bc2d",
  "chunks_stored": 4,
  "model": "all-MiniLM-L6-v2"
}
```

---

### `POST /api/query`

Query the knowledge base with natural language.

**Request**
```json
{
  "question": "What is the likelihood of confusion standard for trademarks?",
  "n_results": 5
}
```

**Response**
```json
{
  "answer": "Under the Lanham Act, trademark infringement occurs when...",
  "sources": [
    {
      "title": "Likelihood of Confusion – Legal Standard",
      "doc_id": "b2c9de1a",
      "relevance_score": 0.91,
      "excerpt": "Courts apply the DuPont factors including..."
    }
  ],
  "context_used": 3
}
```

---

### `GET /api/documents`

List all ingested documents.

### `DELETE /api/documents/:doc_id`

Remove a document and all its chunks from the vector store.

### `GET /api/health`

Health check — returns ChromaDB status and total chunks indexed.

---

## Deployment

### Backend → Render

1. Push to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Select your repo, use `./backend` as root directory
4. Choose **Docker** as runtime
5. Add a **Disk** mount at `/app/chroma_store` (1GB free tier)
6. Deploy — Render auto-reads `render.yaml`

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
2. Set root directory to `frontend`
3. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL = https://your-lexrag-backend.onrender.com
   ```
4. Deploy

---

## Design Decisions

**Why sentence-transformers instead of OpenAI embeddings?**  
No API key or cost required. `all-MiniLM-L6-v2` is a well-benchmarked model that performs strongly on semantic similarity tasks, making it a practical choice for production environments with budget constraints.

**Why ChromaDB instead of Qdrant or Pinecone?**  
ChromaDB runs entirely in-process with persistent local storage — ideal for a focused demo. The architecture is designed so the vector store can be swapped: replacing `rag_service.py`'s ChromaDB calls with a Qdrant client requires minimal changes.

**Why Flask instead of FastAPI?**  
Flask is explicitly listed in the target job requirements. FastAPI would be a natural evolution for async workloads.

**Chunk size 512 / overlap 64 — why?**  
Legal text is dense. 512 tokens preserves enough sentence context for meaningful embeddings. 64-token overlap ensures retrieval doesn't miss answers that straddle chunk boundaries.

---

## Roadmap

- [ ] Replace extractive synthesis with an LLM call (Ollama / OpenAI) for generative answers
- [ ] Add PDF upload support via `/api/ingest/pdf`
- [ ] Migrate vector store to Qdrant for payload filtering and named collections
- [ ] Add SageMaker-based reranking pipeline
- [ ] Streaming responses via SSE

---

## Author

**Joshua Núñez Arcila** — Full-Stack & AI Engineer  
[linkedin.com/in/joshuanunezarcila](https://linkedin.com/in/joshuanunezarcila) · [github.com/jonuar](https://github.com/jonuar)
