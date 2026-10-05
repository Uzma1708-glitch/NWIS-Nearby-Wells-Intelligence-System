"""
NWIS API Router — Main aggregator
===================================
Collects all API sub-routers and mounts them under /api prefix (set in main.py).
"""

from fastapi import APIRouter

from app.api import wells, events, risk

api_router = APIRouter()

api_router.include_router(wells.router)
api_router.include_router(events.router)
api_router.include_router(risk.router)
