"""
NWIS Look-Ahead Service
=======================
Dynamic look-ahead engine that evaluates historical offset hazards
across an engineer-configured interval relative to the active target well.
"""

import math
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.models.models import Well, OperationalEvent, Formation, Document
from app.schemas.lookahead import LookaheadFinding, LookaheadAnalysisResponse


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance in kilometers using the Haversine formula."""
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def find_well_by_identifier(db: Session, identifier: str | int) -> Optional[Well]:
    """Finds a well by integer ID or string well_name."""
    if isinstance(identifier, int) or (isinstance(identifier, str) and identifier.isdigit()):
        well = db.query(Well).filter(Well.id == int(identifier)).first()
        if well:
            return well
    return db.query(Well).filter(Well.well_name == str(identifier).strip().upper()).first()


def run_lookahead_analysis(
    db: Session,
    target_well_id: str,
    current_depth: Optional[float],
    lookahead_distance: float = 200.0,
    radius_km: float = 10.0,
    depth_reference: str = "MD",
    depth_source: str = "ENGINEER_INPUT"
) -> LookaheadAnalysisResponse:
    """
    Executes dynamic look-ahead analysis for a specific target well.
    Calculates analysis_start and analysis_end, then queries offset events
    strictly within that window.
    """
    target_well = find_well_by_identifier(db, target_well_id)
    if not target_well:
        # If well is not found in database, return clear not-found response
        return LookaheadAnalysisResponse(
            target_well_id=str(target_well_id),
            target_well_name=str(target_well_id),
            current_depth_m=current_depth,
            lookahead_distance_m=lookahead_distance,
            analysis_start_m=current_depth,
            analysis_end_m=(current_depth + lookahead_distance) if current_depth is not None else None,
            depth_reference=depth_reference,
            depth_source=depth_source,
            search_radius_km=radius_km,
            offset_wells_count=0,
            findings_count=0,
            status="WELL_NOT_FOUND",
            status_message=f"Target well '{target_well_id}' was not found in the repository.",
            findings=[],
            alert_summary=None,
            formations_in_interval=[]
        )

    # 1. Check if current depth is missing
    if current_depth is None or current_depth <= 0:
        return LookaheadAnalysisResponse(
            target_well_id=str(target_well.id),
            target_well_name=target_well.well_name,
            current_depth_m=None,
            lookahead_distance_m=lookahead_distance,
            analysis_start_m=None,
            analysis_end_m=None,
            depth_reference=depth_reference,
            depth_source=depth_source,
            search_radius_km=radius_km,
            offset_wells_count=0,
            findings_count=0,
            status="MISSING_CURRENT_DEPTH",
            status_message=f"Target well {target_well.well_name} requires current bit depth to evaluate look-ahead hazards.",
            findings=[],
            alert_summary=None,
            formations_in_interval=[]
        )

    analysis_start = float(current_depth)
    analysis_end = float(current_depth + lookahead_distance)

    # 2. Check target well coordinates
    if target_well.latitude is None or target_well.longitude is None:
        return LookaheadAnalysisResponse(
            target_well_id=str(target_well.id),
            target_well_name=target_well.well_name,
            current_depth_m=current_depth,
            lookahead_distance_m=lookahead_distance,
            analysis_start_m=analysis_start,
            analysis_end_m=analysis_end,
            depth_reference=depth_reference,
            depth_source=depth_source,
            search_radius_km=radius_km,
            offset_wells_count=0,
            findings_count=0,
            status="MISSING_COORDINATES",
            status_message=f"Target well {target_well.well_name} is missing surface coordinates. Unable to compute offset proximity.",
            findings=[],
            alert_summary=None,
            formations_in_interval=[]
        )

    # 3. Find offset wells within search radius (excluding target well)
    all_other_wells = db.query(Well).filter(Well.id != target_well.id).all()
    nearby_offsets: List[Tuple[Well, float]] = []

    for w in all_other_wells:
        if w.latitude is not None and w.longitude is not None:
            dist = haversine_km(target_well.latitude, target_well.longitude, w.latitude, w.longitude)
            if dist <= radius_km:
                nearby_offsets.append((w, round(dist, 2)))

    # Sort offsets by distance ascending
    nearby_offsets.sort(key=lambda x: x[1])

    if not nearby_offsets:
        return LookaheadAnalysisResponse(
            target_well_id=str(target_well.id),
            target_well_name=target_well.well_name,
            current_depth_m=current_depth,
            lookahead_distance_m=lookahead_distance,
            analysis_start_m=analysis_start,
            analysis_end_m=analysis_end,
            depth_reference=depth_reference,
            depth_source=depth_source,
            search_radius_km=radius_km,
            offset_wells_count=0,
            findings_count=0,
            status="NO_NEARBY_WELLS",
            status_message=f"No offset wells found within {radius_km:.1f} km radius of {target_well.well_name}.",
            findings=[],
            alert_summary=None,
            formations_in_interval=[]
        )

    offset_ids = [w.id for w, _ in nearby_offsets]
    offset_dist_map = {w.id: dist for w, dist in nearby_offsets}
    offset_obj_map = {w.id: w for w, _ in nearby_offsets}

    # 4. Query historical offset events in interval [analysis_start, analysis_end]
    events_query = (
        db.query(OperationalEvent)
        .filter(
            OperationalEvent.well_id.in_(offset_ids),
            or_(
                and_(OperationalEvent.depth >= analysis_start, OperationalEvent.depth <= analysis_end),
                and_(OperationalEvent.start_depth <= analysis_end, OperationalEvent.end_depth >= analysis_start),
            )
        )
        .all()
    )

    # Determine formations in interval
    formations_found = set()
    target_fm_name = target_well.formation.name if target_well.formation else "Unknown Formation"

    findings: List[LookaheadFinding] = []

    for ev in events_query:
        off_well = offset_obj_map.get(ev.well_id)
        if not off_well:
            continue

        dist_km = offset_dist_map.get(ev.well_id, 0.0)
        ev_depth = ev.depth or ev.start_depth or analysis_start
        ev_fm_name = ev.formation.name if ev.formation else (off_well.formation.name if off_well.formation else None)

        if ev_fm_name:
            formations_found.add(ev_fm_name)

        # Formation relationship
        if ev_fm_name and target_well.formation and ev_fm_name == target_well.formation.name:
            fm_rel = f"Identical target formation ({ev_fm_name})"
        elif ev_fm_name and target_well.formation:
            fm_rel = f"Offset formation ({ev_fm_name}) vs Target ({target_well.formation.name})"
        elif ev_fm_name:
            fm_rel = f"Offset in {ev_fm_name} (target formation unconfirmed)"
        else:
            fm_rel = "Formation relationship unconfirmed (missing formation log)"

        # Evidence / Source document citation
        doc_source = None
        if hasattr(ev, 'source_doc') and ev.source_doc:
            doc_source = ev.source_doc
        elif off_well.documents:
            doc_source = f"{off_well.documents[0].filename} ({off_well.documents[0].document_type.value})"
        else:
            doc_source = f"DDR archive for {off_well.well_name} (Incident record #{ev.id})"

        # Mitigations
        mitigation_txt = None
        if ev.mitigations:
            mitigation_txt = ", ".join(m.mitigation for m in ev.mitigations if m.mitigation)
        elif hasattr(ev, 'mitigation') and ev.mitigation:
            mitigation_txt = ev.mitigation
        else:
            mitigation_txt = "Standard field mitigation protocol applied"

        # Plain language explainable relevance explanation
        event_name = ev.event_type.value.replace("_", " ") if hasattr(ev.event_type, 'value') else str(ev.event_type)
        severity_label = ev.severity.value if hasattr(ev.severity, 'value') else str(ev.severity or 'MEDIUM')

        relevance_exp = (
            f"Offset well {off_well.well_name} ({dist_km:.1f} km away) encountered {severity_label} {event_name} "
            f"at {ev_depth:.0f}m {depth_reference} ({fm_rel}). "
            f"Falls within active {lookahead_distance:.0f}m look-ahead window ({analysis_start:.0f}m–{analysis_end:.0f}m {depth_reference})."
        )

        limitations_msg = (
            "Historical observation on an offset well. Geological heterogeneity and mud weight variations "
            "mean hazards may not recur; this is an empirical reference, NOT a deterministic failure probability."
        )

        provenance = "HISTORICAL_OFFSET_DDR" if "DDR" in (doc_source or "") else "HISTORICAL_WELL_RECORD"

        findings.append(
            LookaheadFinding(
                target_well_id=str(target_well.id),
                offset_well_id=str(off_well.id),
                offset_well_name=off_well.well_name,
                event_type=event_name,
                severity=severity_label,
                event_depth_m=ev.depth,
                interval_start_m=ev.start_depth,
                interval_end_m=ev.end_depth,
                distance_km=dist_km,
                formation_name=ev_fm_name,
                formation_relationship=fm_rel,
                source_evidence=doc_source,
                provenance_label=provenance,
                relevance_explanation=relevance_exp,
                limitations=limitations_msg,
                mitigation_measure=mitigation_txt
            )
        )

    # Sort findings by depth
    findings.sort(key=lambda f: f.event_depth_m or f.interval_start_m or 0)

    # Build alert summary if any critical or high findings exist
    alert_summary = None
    if findings:
        high_events = [f for f in findings if f.severity in ("HIGH", "CRITICAL")]
        if high_events:
            unique_wells = list({f.offset_well_name for f in high_events})
            unique_types = list({f.event_type for f in high_events})
            alert_summary = (
                f"{target_well.well_name} look-ahead ({analysis_start:.0f}m–{analysis_end:.0f}m {depth_reference}): "
                f"Historical {', '.join(unique_types)} recorded on nearby offsets ({', '.join(unique_wells)})."
            )

    status = "SUCCESS" if findings else "NO_HISTORICAL_EVENTS"
    status_msg = (
        f"Identified {len(findings)} historical offset incidents within the {lookahead_distance:.0f}m look-ahead window "
        f"({analysis_start:.0f}m–{analysis_end:.0f}m {depth_reference})."
        if findings
        else f"No historical events recorded on offset wells within {analysis_start:.0f}m–{analysis_end:.0f}m {depth_reference}."
    )

    return LookaheadAnalysisResponse(
        target_well_id=str(target_well.id),
        target_well_name=target_well.well_name,
        current_depth_m=current_depth,
        lookahead_distance_m=lookahead_distance,
        analysis_start_m=analysis_start,
        analysis_end_m=analysis_end,
        depth_reference=depth_reference,
        depth_source=depth_source,
        search_radius_km=radius_km,
        offset_wells_count=len(nearby_offsets),
        findings_count=len(findings),
        status=status,
        status_message=status_msg,
        findings=findings,
        alert_summary=alert_summary,
        formations_in_interval=list(formations_found)
    )
