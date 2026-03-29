from flask import Blueprint, jsonify
from app.services.rag_service import get_collection

health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health():
    """Health check endpoint for Render and monitoring."""
    try:
        collection = get_collection()
        doc_count = collection.count()
        return jsonify({
            "status": "ok",
            "vector_store": "chromadb",
            "chunks_indexed": doc_count,
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "detail": str(e)}), 500
