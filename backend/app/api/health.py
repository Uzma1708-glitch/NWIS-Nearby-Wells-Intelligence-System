"""
NWIS Health Endpoint
=====================
GET /health — verifies backend is alive and database is connected.
Does not expose sensitive information.
"""

from fastapi import APIRouter
from app.core.database import check_database_connection

health_router = APIRouter(tags=["Health"])


@health_router.get("/health", summary="Health check")
def health_check():
    """
    Returns the operational status of the NWIS backend.
    Verifies process is alive and database connectivity.
    """
    db_ok = check_database_connection()
    return {
        "status": "ok" if db_ok else "degraded",
        "service": "nwis-backend",
        "database": "connected" if db_ok else "unavailable",
    }
