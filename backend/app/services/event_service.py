"""
NWIS Event Service
==================
Business logic for operational event retrieval.
"""

from typing import List, Optional
from sqlalchemy.orm import Session, joinedload

from app.models.models import OperationalEvent
from app.models.enums import EventType


def get_events(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    event_type: Optional[EventType] = None,
) -> List[OperationalEvent]:
    """Return events, optionally filtered by event type."""
    query = db.query(OperationalEvent).options(
        joinedload(OperationalEvent.mitigations),
        joinedload(OperationalEvent.formation),
    )
    if event_type:
        query = query.filter(OperationalEvent.event_type == event_type)
    return query.order_by(OperationalEvent.depth).offset(skip).limit(limit).all()


def get_events_for_well(
    db: Session,
    well_id: int,
    event_type: Optional[EventType] = None,
) -> List[OperationalEvent]:
    """Return all events for a given well, optionally filtered by type."""
    query = db.query(OperationalEvent).options(
        joinedload(OperationalEvent.mitigations),
        joinedload(OperationalEvent.formation),
    ).filter(OperationalEvent.well_id == well_id)

    if event_type:
        query = query.filter(OperationalEvent.event_type == event_type)

    return query.order_by(OperationalEvent.depth).all()


def get_event_by_id(db: Session, event_id: int) -> Optional[OperationalEvent]:
    """Return a single event with mitigations eagerly loaded."""
    return (
        db.query(OperationalEvent)
        .options(
            joinedload(OperationalEvent.mitigations),
            joinedload(OperationalEvent.formation),
        )
        .filter(OperationalEvent.id == event_id)
        .first()
    )
