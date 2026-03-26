import uuid
from flask import Blueprint, request, jsonify
from app.services.rag_service import ingest_document, list_documents, delete_document

ingest_bp = Blueprint("ingest", __name__)


@ingest_bp.route("/ingest", methods=["POST"])
def ingest():
    """
    Ingest a text document into the vector store.
    Body: { "title": str, "content": str, "category": str }
    """
    data = request.get_json()

    if not data or not data.get("content"):
        return jsonify({"error": "Field 'content' is required."}), 400

    doc_id = str(uuid.uuid4())[:8]
    title = data.get("title", "Untitled Document")
    category = data.get("category", "General")

    result = ingest_document(
        doc_id=doc_id,
        content=data["content"],
        metadata={"title": title, "category": category},
    )

    if "error" in result:
        return jsonify(result), 422

    return jsonify({"success": True, **result}), 201


@ingest_bp.route("/documents", methods=["GET"])
def get_documents():
    """Return a list of all ingested documents."""
    docs = list_documents()
    return jsonify({"documents": docs, "total": len(docs)}), 200


@ingest_bp.route("/documents/<doc_id>", methods=["DELETE"])
def remove_document(doc_id: str):
    """Delete a document and all its chunks from the vector store."""
    result = delete_document(doc_id)
    if "error" in result:
        return jsonify(result), 404
    return jsonify({"success": True, **result}), 200
