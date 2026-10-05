"""
NWIS Pydantic Schemas — Well, Formation, Reservoir
====================================================
API request/response models separate from ORM models.
SQLAlchemy models are NOT directly exposed as API responses.
"""

from __future__ import annotations
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

from app.models.enums import WellStatus


# ─────────────────────────────────────────────────────────────────────────────
# FORMATION
# ─────────────────────────────────────────────────────────────────────────────

class FormationBase(BaseModel):
    name: str
    description: Optional[str] = None
    top_depth: Optional[float] = None
    base_depth: Optional[float] = None


class FormationCreate(FormationBase):
    pass


class FormationResponse(FormationBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# RESERVOIR
# ─────────────────────────────────────────────────────────────────────────────

class ReservoirBase(BaseModel):
    name: str
    description: Optional[str] = None


class ReservoirCreate(ReservoirBase):
    pass


class ReservoirResponse(ReservoirBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# WELL
# ─────────────────────────────────────────────────────────────────────────────

class WellBase(BaseModel):
    well_name: str
    status: WellStatus = WellStatus.ACTIVE
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    total_depth: Optional[float] = None
    current_depth: Optional[float] = None
    formation_id: Optional[int] = None
    reservoir_id: Optional[int] = None
    spud_date: Optional[date] = None
    completion_date: Optional[date] = None
    operator: Optional[str] = None
    field: Optional[str] = None
    notes: Optional[str] = None


class WellCreate(WellBase):
    pass


class WellSummaryResponse(BaseModel):
    """Lightweight well summary for list views and map layers."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    well_name: str
    status: WellStatus
    latitude: Optional[float]
    longitude: Optional[float]
    total_depth: Optional[float]
    current_depth: Optional[float]
    formation_id: Optional[int]
    reservoir_id: Optional[int]
    operator: Optional[str]
    field: Optional[str]


class WellDetailResponse(WellBase):
    """Full well detail including formation and reservoir names."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
    formation: Optional[FormationResponse] = None
    reservoir: Optional[ReservoirResponse] = None
