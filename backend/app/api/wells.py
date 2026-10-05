"""
NWIS Wells API Routes
======================
GET /api/wells            — list all wells
GET /api/wells/{id}       — well detail with formation/reservoir
GET /api/wells/nearby     — wells within radius of coordinates
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.enums import WellStatus
from app.schemas.well import WellSummaryResponse, WellDetailResponse
from app.services import well_service

router = APIRouter(prefix="/wells", tags=["Wells"])


@router.get("", response_model=List[WellSummaryResponse], summary="List all wells")
def list_wells(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[WellStatus] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Returns a summary list of all wells.
    Suitable for map markers and well selection lists.
    """
    return well_service.get_wells(db, skip=skip, limit=limit, status=status)


@router.get("/nearby", summary="Find wells near a coordinate")
def nearby_wells(
    latitude: float = Query(..., description="Reference latitude"),
    longitude: float = Query(..., description="Reference longitude"),
    radius_km: float = Query(10.0, ge=0.1, le=500.0, description="Search radius (km)"),
    exclude_well_id: Optional[int] = Query(None, description="Well ID to exclude from results"),
    db: Session = Depends(get_db),
):
    """
    Returns wells within the specified radius sorted by distance ascending.
    Used by the Nearby Wells / GIS module (Phase 3).
    Distances are Haversine approximations — Phase 3 may add PostGIS precision.
    """
    results = well_service.get_nearby_wells(
        db,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
        exclude_well_id=exclude_well_id,
    )
    return [
        {
            "id": w.id,
            "well_name": w.well_name,
            "status": w.status,
            "latitude": w.latitude,
            "longitude": w.longitude,
            "total_depth": w.total_depth,
            "current_depth": w.current_depth,
            "formation_id": w.formation_id,
            "operator": w.operator,
            "distance_km": dist,
        }
        for w, dist in results
    ]


@router.get("/{well_id}", response_model=WellDetailResponse, summary="Well detail")
def get_well(well_id: int, db: Session = Depends(get_db)):
    """
    Returns full well detail including formation and reservoir.
    Returns 404 if the well does not exist.
    """
    well = well_service.get_well_by_id(db, well_id)
    if not well:
        raise HTTPException(status_code=404, detail=f"Well with id={well_id} not found")
    return well
