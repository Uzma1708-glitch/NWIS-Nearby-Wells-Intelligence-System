"""
NWIS Events API Routes
=======================
GET /api/events                   — all events (filterable by type)
GET /api/wells/{well_id}/events   — events for a specific well
GET /api/events/{event_id}        — event detail with mitigations
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.enums import EventType
from app.schemas.events import OperationalEventSummaryResponse, OperationalEventDetailResponse
from app.services import event_service

router = APIRouter(tags=["Events"])


@router.get("/events", response_model=List[OperationalEventSummaryResponse], summary="List all events")
def list_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    event_type: Optional[EventType] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Returns a summary list of all operational events.
    Filterable by event_type for Knowledge Repository views.
    """
    return event_service.get_events(db, skip=skip, limit=limit, event_type=event_type)


@router.get("/wells/{well_id}/events", response_model=List[OperationalEventDetailResponse], summary="Well events")
def get_well_events(
    well_id: int,
    event_type: Optional[EventType] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Returns all events for a given well with mitigations.
    Used by Well Intelligence, Correlation, and Risk modules.
    Returns empty list (not 404) if well has no events.
    """
    return event_service.get_events_for_well(db, well_id=well_id, event_type=event_type)


@router.get("/events/{event_id}", response_model=OperationalEventDetailResponse, summary="Event detail")
def get_event(event_id: int, db: Session = Depends(get_db)):
    """
    Returns full event detail including all mitigations.
    Returns 404 if event does not exist.
    """
    event = event_service.get_event_by_id(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail=f"Event with id={event_id} not found")
    return event
