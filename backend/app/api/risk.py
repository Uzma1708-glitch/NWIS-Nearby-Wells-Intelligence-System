"""
NWIS Risk API Routes
=====================
GET /api/risk/{well_id}           — risk predictions for a well
GET /api/risk/{well_id}/intervals — historical risk intervals
GET /api/risk/{well_id}/check     — check if current depth is in a risk interval
GET /api/alerts                   — all alerts
GET /api/alerts/{id}              — alert detail
PATCH /api/alerts/{id}            — update alert status
GET /api/wells/{id}/alerts        — active alerts for a well
GET /api/wells/{id}/recommendations — recommendations for a well
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.enums import RiskType, AlertStatus
from app.schemas.risk import (
    RiskPredictionResponse,
    RiskIntervalResponse,
    AlertResponse,
    AlertStatusUpdate,
    RecommendationResponse,
)
from app.schemas.lookahead import (
    LookaheadQueryRequest,
    LookaheadAnalysisResponse,
)
from app.services import risk_service, lookahead_service

router = APIRouter(tags=["Risk & Alerts"])


# ── Dynamic Look-Ahead Analysis ──────────────────────────────────────────────

@router.get("/risk/lookahead", response_model=LookaheadAnalysisResponse, summary="Dynamic look-ahead analysis (GET)")
def get_lookahead_analysis(
    target_well_id: str = Query(..., description="Target well identifier (e.g. X17, X12, X09)"),
    current_depth: Optional[float] = Query(None, description="Current drilling depth (m MD)"),
    lookahead_distance: float = Query(200.0, ge=10.0, le=2000.0, description="Look-ahead window distance (m)"),
    radius_km: float = Query(10.0, ge=0.1, le=500.0, description="Search radius (km)"),
    depth_reference: str = Query("MD", description="Depth reference datum (MD, TVD, TVDSS)"),
    depth_source: str = Query("ENGINEER_INPUT", description="Source of depth (ENGINEER_INPUT, TELEMETRY, SIMULATION)"),
    db: Session = Depends(get_db),
):
    """
    Executes dynamic look-ahead hazard analysis for the specified target well and interval.
    Downstream queries offset events within [current_depth, current_depth + lookahead_distance].
    """
    return lookahead_service.run_lookahead_analysis(
        db=db,
        target_well_id=target_well_id,
        current_depth=current_depth,
        lookahead_distance=lookahead_distance,
        radius_km=radius_km,
        depth_reference=depth_reference,
        depth_source=depth_source,
    )


@router.post("/risk/lookahead", response_model=LookaheadAnalysisResponse, summary="Dynamic look-ahead analysis (POST)")
def post_lookahead_analysis(
    body: LookaheadQueryRequest,
    db: Session = Depends(get_db),
):
    """
    POST body version of dynamic look-ahead hazard analysis.
    """
    return lookahead_service.run_lookahead_analysis(
        db=db,
        target_well_id=body.target_well_id,
        current_depth=body.current_depth,
        lookahead_distance=body.lookahead_distance,
        radius_km=body.radius_km,
        depth_reference=body.depth_reference,
        depth_source=body.depth_source,
    )


# ── Risk Predictions ──────────────────────────────────────────────────────────

@router.get("/risk/{well_id}", response_model=List[RiskPredictionResponse], summary="Risk predictions")
def get_risk_predictions(well_id: int, db: Session = Depends(get_db)):
    """Risk predictions for a well. Phase 5 will add POST /risk/analyze."""
    return risk_service.get_risk_predictions_for_well(db, well_id=well_id)


@router.get("/risk/{well_id}/intervals", response_model=List[RiskIntervalResponse], summary="Risk intervals")
def get_risk_intervals(
    well_id: int,
    risk_type: Optional[RiskType] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Historical depth-based risk intervals for a well.
    The alert engine (Phase 6) uses these to determine if current depth is in a risk zone.
    """
    return risk_service.get_risk_intervals_for_well(db, well_id=well_id, risk_type=risk_type)


@router.get("/risk/{well_id}/check", summary="Check depth against risk intervals")
def check_depth_in_risk_interval(
    well_id: int,
    depth: float = Query(..., description="Current drilling depth (m)"),
    db: Session = Depends(get_db),
):
    """
    Returns risk intervals that contain the given depth.
    Returns empty list if depth is not in any known risk zone.
    This is the core Phase 6 alert trigger query.
    """
    intervals = risk_service.depth_in_risk_interval(db, well_id=well_id, current_depth=depth)
    return {
        "well_id": well_id,
        "queried_depth": depth,
        "in_risk_zone": len(intervals) > 0,
        "matching_intervals": [
            {
                "id": i.id,
                "risk_type": i.risk_type,
                "start_depth": i.start_depth,
                "end_depth": i.end_depth,
                "evidence": i.evidence,
            }
            for i in intervals
        ],
    }


# ── Alerts ────────────────────────────────────────────────────────────────────

@router.get("/alerts", response_model=List[AlertResponse], summary="List all alerts")
def list_alerts(
    status: Optional[AlertStatus] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Return all alerts, filterable by status."""
    return risk_service.get_all_alerts(db, status=status, skip=skip, limit=limit)


@router.get("/wells/{well_id}/alerts", response_model=List[AlertResponse], summary="Active alerts for a well")
def get_well_alerts(well_id: int, db: Session = Depends(get_db)):
    """Return active alerts for a specific well."""
    return risk_service.get_active_alerts_for_well(db, well_id=well_id)


@router.patch("/alerts/{alert_id}", response_model=AlertResponse, summary="Update alert status")
def update_alert_status(
    alert_id: int,
    body: AlertStatusUpdate,
    db: Session = Depends(get_db),
):
    """Acknowledge or resolve an alert."""
    from app.models.models import Alert
    from datetime import datetime

    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert with id={alert_id} not found")

    alert.status = body.status
    if body.status == AlertStatus.ACKNOWLEDGED and not alert.acknowledged_at:
        alert.acknowledged_at = datetime.utcnow()
    elif body.status == AlertStatus.RESOLVED and not alert.resolved_at:
        alert.resolved_at = datetime.utcnow()

    db.commit()
    db.refresh(alert)
    return alert


# ── Recommendations ───────────────────────────────────────────────────────────

@router.get(
    "/wells/{well_id}/recommendations",
    response_model=List[RecommendationResponse],
    summary="Recommendations for a well",
)
def get_well_recommendations(
    well_id: int,
    risk_type: Optional[RiskType] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Returns evidence-backed recommendations for a well.
    Each recommendation links to a source historical event for explainability.
    """
    return risk_service.get_recommendations_for_well(db, well_id=well_id, risk_type=risk_type)
