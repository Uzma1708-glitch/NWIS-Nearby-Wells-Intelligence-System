"""
NWIS Backend Application Entry Point
=====================================
FastAPI application for the Nearby Wells Intelligence System.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.router import api_router
from app.api.health import health_router


def create_application() -> FastAPI:
    """Create and configure the FastAPI application."""
    application = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "NWIS — Nearby Wells Intelligence System. "
            "AI-Powered Offset Well Knowledge and Decision Support Platform "
            "for Drilling Operations. SIH PS 26121."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ───────────────────────────────────────────────────────────────
    application.include_router(health_router)
    application.include_router(api_router, prefix="/api")

    return application


app = create_application()
