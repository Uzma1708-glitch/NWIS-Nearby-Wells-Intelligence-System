"""
NWIS Pydantic Schemas — Operational Events & Mitigations
=========================================================
"""

from __future__ import annotations
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

from app.models.enums import EventType, Severity, SuccessIndicator


# ─────────────────────────────────────────────────────────────────────────────
# EVENT MITIGATION
# ─────────────────────────────────────────────────────────────────────────────

class EventMitigationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_id: int
    mitigation: str
    result: Optional[str] = None
    success_indicator: Optional[SuccessIndicator] = None
    notes: Optional[str] = None
    created_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# OPERATIONAL EVENT
# ─────────────────────────────────────────────────────────────────────────────

class OperationalEventBase(BaseModel):
    well_id: int
    event_type: EventType
    depth: Optional[float] = None
    start_depth: Optional[float] = None
    end_depth: Optional[float] = None
    formation_id: Optional[int] = None
    severity: Optional[Severity] = None
    cause: Optional[str] = None
    description: Optional[str] = None
    outcome: Optional[str] = None
    npt_hours: Optional[float] = None
    event_date: Optional[date] = None


class OperationalEventSummaryResponse(BaseModel):
    """Lightweight event for list views."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    well_id: int
    event_type: EventType
    depth: Optional[float] = None
    severity: Optional[Severity] = None
    description: Optional[str] = None
    event_date: Optional[date] = None
    created_at: datetime


class OperationalEventDetailResponse(OperationalEventBase):
    """Full event detail with mitigations."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
    mitigations: List[EventMitigationResponse] = []
