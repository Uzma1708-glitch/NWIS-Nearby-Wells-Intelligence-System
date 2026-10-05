"""
NWIS Risk Service
==================
Business logic for risk intervals, predictions, alerts, and recommendations.
Phase 5 & 6 will extend this service with the full risk/alert engine.
Phase 1 provides the read-path foundation.
"""

from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.models import RiskInterval, RiskPrediction, Alert, Recommendation
from app.models.enums import RiskType, AlertStatus


def get_risk_intervals_for_well(
    db: Session,
    well_id: int,
    risk_type: Optional[RiskType] = None,
) -> List[RiskInterval]:
    """Return risk intervals for a well, optionally filtered by risk type."""
    query = db.query(RiskInterval).filter(RiskInterval.well_id == well_id)
    if risk_type:
        query = query.filter(RiskInterval.risk_type == risk_type)
    return query.order_by(RiskInterval.start_depth).all()


def get_risk_predictions_for_well(
    db: Session,
    well_id: int,
) -> List[RiskPrediction]:
    """Return risk predictions for a well, ordered by depth."""
    return (
        db.query(RiskPrediction)
        .filter(RiskPrediction.well_id == well_id)
        .order_by(RiskPrediction.depth)
        .all()
    )


def get_active_alerts_for_well(
    db: Session,
    well_id: int,
) -> List[Alert]:
    """Return active alerts for a well."""
    return (
        db.query(Alert)
        .filter(Alert.well_id == well_id, Alert.status == AlertStatus.ACTIVE)
        .order_by(Alert.created_at.desc())
        .all()
    )


def get_all_alerts(
    db: Session,
    status: Optional[AlertStatus] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[Alert]:
    """Return all alerts, optionally filtered by status."""
    query = db.query(Alert)
    if status:
        query = query.filter(Alert.status == status)
    return query.order_by(Alert.created_at.desc()).offset(skip).limit(limit).all()


def get_recommendations_for_well(
    db: Session,
    well_id: int,
    risk_type: Optional[RiskType] = None,
) -> List[Recommendation]:
    """Return recommendations for a well, optionally filtered by risk type."""
    query = db.query(Recommendation).filter(Recommendation.well_id == well_id)
    if risk_type:
        query = query.filter(Recommendation.risk_type == risk_type)
    return query.order_by(Recommendation.priority).all()


def depth_in_risk_interval(
    db: Session,
    well_id: int,
    current_depth: float,
) -> List[RiskInterval]:
    """
    Return risk intervals that contain the given current depth.
    Used by the alert engine (Phase 6) to check if an active well
    is approaching or within a known historical risk zone.
    """
    return (
        db.query(RiskInterval)
        .filter(
            RiskInterval.well_id == well_id,
            RiskInterval.start_depth <= current_depth,
            RiskInterval.end_depth >= current_depth,
        )
        .all()
    )
