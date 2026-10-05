"""
NWIS Pydantic Schemas — Risk, Alerts, Recommendations
======================================================
"""

from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

from app.models.enums import RiskType, Severity, AlertStatus


# ─────────────────────────────────────────────────────────────────────────────
# RISK INTERVAL
# ─────────────────────────────────────────────────────────────────────────────

class RiskIntervalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    well_id: int
    risk_type: RiskType
    start_depth: float
    end_depth: float
    formation_id: Optional[int] = None
    evidence: Optional[str] = None
    occurrence_count: Optional[int] = None
    created_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# RISK PREDICTION
# ─────────────────────────────────────────────────────────────────────────────

class RiskPredictionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    well_id: int
    risk_type: RiskType
    depth: Optional[float] = None
    score: Optional[float] = None
    confidence: Optional[float] = None
    explanation: Optional[str] = None
    model_version: Optional[str] = None
    created_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# ALERT
# ─────────────────────────────────────────────────────────────────────────────

class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    well_id: int
    risk_type: RiskType
    depth: Optional[float] = None
    severity: Severity
    message: str
    status: AlertStatus
    created_at: datetime
    updated_at: datetime


class AlertStatusUpdate(BaseModel):
    status: AlertStatus


# ─────────────────────────────────────────────────────────────────────────────
# RECOMMENDATION
# ─────────────────────────────────────────────────────────────────────────────

class RecommendationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    well_id: int
    risk_type: RiskType
    recommendation: str
    evidence: Optional[str] = None
    source_event_id: Optional[int] = None
    priority: Optional[int] = None
    created_at: datetime
