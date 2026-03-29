from flask import Blueprint, request, jsonify
from app.services.rag_service import query_documents

query_bp = Blueprint("query", __name__)


@query_bp.route("/query", methods=["POST"])
def query():
    """
    Query the vector store with a natural language question.
    Body: { "question": str, "n_results": int (optional, default 5) }
    """
    data = request.get_json()

    if not data or not data.get("question"):
        return jsonify({"error": "Field 'question' is required."}), 400

    question = data["question"].strip()
    n_results = int(data.get("n_results", 5))

    if not question:
        return jsonify({"error": "Question cannot be empty."}), 400

    result = query_documents(question=question, n_results=n_results)
    return jsonify(result), 200
