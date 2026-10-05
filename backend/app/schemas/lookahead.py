"""
NWIS Pydantic Schemas — Dynamic Look-Ahead Engine & Explainable Findings
========================================================================
"""

from __future__ import annotations
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class LookaheadFinding(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    target_well_id: str = Field(..., description="Target well identifier (e.g. X12, X09)")
    offset_well_id: str = Field(..., description="Offset well identifier that experienced the event")
    offset_well_name: str = Field(..., description="Offset well display name")
    event_type: str = Field(..., description="Operational hazard/event type (e.g. MUD_LOSS, STUCK_PIPE)")
    severity: Optional[str] = Field(None, description="Event severity (LOW, MEDIUM, HIGH, CRITICAL)")
    event_depth_m: Optional[float] = Field(None, description="Recorded depth in meters (point or interval top)")
    interval_start_m: Optional[float] = Field(None, description="Interval start depth (m)")
    interval_end_m: Optional[float] = Field(None, description="Interval end depth (m)")
    distance_km: float = Field(..., description="Distance between target well and offset well (km)")
    formation_name: Optional[str] = Field(None, description="Geological formation name at event depth")
    formation_relationship: str = Field(
        ...,
        description="Relationship to target well formation (e.g. Identical target formation, Different, Unknown)"
    )
    source_evidence: Optional[str] = Field(
        None,
        description="Source document and page citation (e.g. DDR_X12_3845.pdf (Page 4))"
    )
    provenance_label: str = Field(
        ...,
        description="Provenance classification (HISTORICAL_OFFSET_DDR, NLOG_OFFSET_ARCHIVE, SIMULATED_PROTOTYPE)"
    )
    relevance_explanation: str = Field(
        ...,
        description="Plain-language explanation of why this offset event is relevant to look-ahead window"
    )
    limitations: str = Field(
        ...,
        description="Explicit limitation disclaimer — does NOT represent a failure probability"
    )
    mitigation_measure: Optional[str] = Field(
        None,
        description="Field-verified mitigation recorded for this incident"
    )


class LookaheadQueryRequest(BaseModel):
    target_well_id: str = Field(..., description="Target well name or numeric ID")
    current_depth: Optional[float] = Field(None, description="Current drilling depth in meters (MD)")
    lookahead_distance: float = Field(200.0, ge=10.0, le=2000.0, description="Look-ahead distance in meters (e.g. 100, 200, 500)")
    radius_km: float = Field(10.0, ge=0.5, le=100.0, description="Search radius in kilometers")
    depth_reference: str = Field("MD", description="Depth reference datum (MD, TVD, TVDSS)")
    depth_source: str = Field("ENGINEER_INPUT", description="Source of depth (ENGINEER_INPUT, TELEMETRY, SIMULATION)")


class LookaheadAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    target_well_id: str
    target_well_name: str
    current_depth_m: Optional[float]
    lookahead_distance_m: float
    analysis_start_m: Optional[float]
    analysis_end_m: Optional[float]
    depth_reference: str
    depth_source: str
    search_radius_km: float
    offset_wells_count: int
    findings_count: int
    status: str  # "SUCCESS", "MISSING_CURRENT_DEPTH", "NO_NEARBY_WELLS", "NO_HISTORICAL_EVENTS"
    status_message: str
    findings: List[LookaheadFinding]
    alert_summary: Optional[str] = None
    formations_in_interval: List[str] = Field(default_factory=list)
