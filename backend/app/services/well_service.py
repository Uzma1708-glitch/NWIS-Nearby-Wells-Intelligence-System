"""
NWIS Well Service
==================
Business logic for well retrieval.
All database queries go through this service layer — not directly in route handlers.
"""

import math
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session, joinedload

from app.models.models import Well, Formation, Reservoir
from app.models.enums import WellStatus


def get_wells(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[WellStatus] = None,
) -> List[Well]:
    """Return a list of wells, optionally filtered by status."""
    query = db.query(Well).options(
        joinedload(Well.formation),
        joinedload(Well.reservoir),
    )
    if status:
        query = query.filter(Well.status == status)
    return query.offset(skip).limit(limit).all()


def get_well_by_id(db: Session, well_id: int) -> Optional[Well]:
    """Return a well with formation and reservoir eagerly loaded, or None."""
    return (
        db.query(Well)
        .options(
            joinedload(Well.formation),
            joinedload(Well.reservoir),
        )
        .filter(Well.id == well_id)
        .first()
    )


def get_well_by_name(db: Session, well_name: str) -> Optional[Well]:
    """Return a well by exact name, or None."""
    return db.query(Well).filter(Well.well_name == well_name).first()


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Compute approximate great-circle distance in kilometres between two points.
    Used for nearby-well radius queries in the service layer.
    Phase 3 (GIS module) may extend this with PostGIS or spatial indexing.
    """
    R = 6371.0  # Earth radius (km)
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def get_nearby_wells(
    db: Session,
    latitude: float,
    longitude: float,
    radius_km: float = 10.0,
    exclude_well_id: Optional[int] = None,
) -> List[Tuple[Well, float]]:
    """
    Return wells within radius_km of the given coordinates.
    Returns list of (well, distance_km) tuples sorted by distance ascending.

    Note: This is a service-layer Haversine calculation for Phase 1.
    Phase 3 can replace or extend this with PostGIS ST_DWithin for performance.
    """
    wells = db.query(Well).options(
        joinedload(Well.formation),
        joinedload(Well.reservoir),
    ).filter(
        Well.latitude.isnot(None),
        Well.longitude.isnot(None),
    ).all()

    results = []
    for well in wells:
        if exclude_well_id and well.id == exclude_well_id:
            continue
        dist = _haversine_km(latitude, longitude, well.latitude, well.longitude)
        if dist <= radius_km:
            results.append((well, round(dist, 3)))

    results.sort(key=lambda x: x[1])
    return results
