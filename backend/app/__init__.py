from flask import Flask
from flask_cors import CORS
from .routes.ingest import ingest_bp
from .routes.query import query_bp
from .routes.health import health_bp


def create_app():
    app = Flask(__name__)
    CORS(app, origins=["*"])

    # Register blueprints
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(ingest_bp, url_prefix="/api")
    app.register_blueprint(query_bp, url_prefix="/api")

    return app
