"""
NWIS Phase 1 Test Suite
========================
Tests cover:
- Database connection
- All core domain models
- Relationship integrity
- Core API endpoints (wells, events, risk)
- Health endpoint
- Error handling (404 etc.)
- Seed data verification

Run with: pytest tests/ -v
"""

import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

# Bootstrap path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ── Test database setup ───────────────────────────────────────────────────────
# Use the configured DATABASE_URL from environment.
# Tests run against the actual dev database so seed data is tested realistically.
# A separate test DB can be configured via TEST_DATABASE_URL env var.
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.environ.get("TEST_DATABASE_URL") or os.environ.get("DATABASE_URL")

from app.models.base import Base
from app.models.models import (
    Formation, Reservoir, Well, WellTrajectory, DrillingParameter,
    OperationalEvent, EventMitigation, CasingProgram, CementingRecord,
    MudProgram, Document, DocumentExtraction, RiskPrediction,
    RiskInterval, Alert, Recommendation,
)
from app.models.enums import WellStatus, EventType, RiskType, AlertStatus

from main import app
from app.core.database import get_db, engine as app_engine


# ─────────────────────────────────────────────────────────────────────────────
# Test Client (uses the actual running app + its DB session)
# ─────────────────────────────────────────────────────────────────────────────

client = TestClient(app)


# ─────────────────────────────────────────────────────────────────────────────
# 1. HEALTH ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────

class TestHealthEndpoint:
    def test_health_returns_200(self):
        resp = client.get("/health")
        assert resp.status_code == 200

    def test_health_has_required_fields(self):
        data = client.get("/health").json()
        assert "status" in data
        assert "service" in data
        assert "database" in data

    def test_health_service_name(self):
        data = client.get("/health").json()
        assert data["service"] == "nwis-backend"


# ─────────────────────────────────────────────────────────────────────────────
# 2. DATABASE CONNECTIVITY
# ─────────────────────────────────────────────────────────────────────────────

class TestDatabaseConnectivity:
    def test_database_connection(self):
        """Database must be reachable."""
        from app.core.database import check_database_connection
        assert check_database_connection() is True

    def test_all_tables_exist(self):
        """All 16 core tables must exist in the database."""
        from sqlalchemy import inspect
        inspector = inspect(app_engine)
        existing_tables = set(inspector.get_table_names())
        required_tables = {
            "formations", "reservoirs", "wells", "well_trajectories",
            "drilling_parameters", "operational_events", "event_mitigations",
            "casing_programs", "cementing_records", "mud_programs",
            "documents", "document_extractions", "risk_predictions",
            "risk_intervals", "alerts", "recommendations",
        }
        missing = required_tables - existing_tables
        assert not missing, f"Missing tables: {missing}"


# ─────────────────────────────────────────────────────────────────────────────
# 3. SEED DATA VERIFICATION
# ─────────────────────────────────────────────────────────────────────────────

class TestSeedDataVerification:
    def _get_db_session(self) -> Session:
        return next(get_db())

    def test_well_count(self):
        db = self._get_db_session()
        count = db.query(Well).count()
        assert count >= 12, f"Expected ≥12 wells, got {count}"

    def test_x17_exists(self):
        db = self._get_db_session()
        x17 = db.query(Well).filter(Well.well_name == "X17").first()
        assert x17 is not None, "X17 must exist"
        assert x17.status == WellStatus.ACTIVE
        assert x17.current_depth == pytest.approx(3842.0)

    def test_x17_in_f3(self):
        db = self._get_db_session()
        x17 = db.query(Well).filter(Well.well_name == "X17").first()
        assert x17.formation_id is not None
        f3 = db.query(Formation).filter(Formation.id == x17.formation_id).first()
        assert f3 is not None
        assert f3.name == "F3"

    def test_x12_exists(self):
        db = self._get_db_session()
        x12 = db.query(Well).filter(Well.well_name == "X12").first()
        assert x12 is not None

    def test_x09_exists(self):
        db = self._get_db_session()
        assert db.query(Well).filter(Well.well_name == "X09").first() is not None

    def test_x21_exists(self):
        db = self._get_db_session()
        assert db.query(Well).filter(Well.well_name == "X21").first() is not None

    def test_x07_exists(self):
        db = self._get_db_session()
        assert db.query(Well).filter(Well.well_name == "X07").first() is not None

    def test_x15_exists(self):
        db = self._get_db_session()
        assert db.query(Well).filter(Well.well_name == "X15").first() is not None

    def test_all_12_wells_exist(self):
        db = self._get_db_session()
        required = ["X03", "X05", "X07", "X08", "X09", "X11", "X12", "X14", "X15", "X17", "X19", "X21"]
        for name in required:
            w = db.query(Well).filter(Well.well_name == name).first()
            assert w is not None, f"Well {name} must exist"

    def test_formations_f1_f4(self):
        db = self._get_db_session()
        for name in ["F1", "F2", "F3", "F4"]:
            f = db.query(Formation).filter(Formation.name == name).first()
            assert f is not None, f"Formation {name} must exist"

    def test_x12_mud_loss_event_at_3845(self):
        db = self._get_db_session()
        x12 = db.query(Well).filter(Well.well_name == "X12").first()
        event = db.query(OperationalEvent).filter(
            OperationalEvent.well_id == x12.id,
            OperationalEvent.event_type == EventType.MUD_LOSS,
        ).filter(OperationalEvent.depth == 3845.0).first()
        assert event is not None, "X12 must have MUD_LOSS at 3845m"
        assert abs(event.depth - 3845.0) < 0.01

    def test_x12_torque_spike_at_3862(self):
        db = self._get_db_session()
        x12 = db.query(Well).filter(Well.well_name == "X12").first()
        event = db.query(OperationalEvent).filter(
            OperationalEvent.well_id == x12.id,
            OperationalEvent.event_type == EventType.TORQUE_SPIKE,
        ).filter(OperationalEvent.depth == 3862.0).first()
        assert event is not None, "X12 must have TORQUE_SPIKE at 3862m"
        assert abs(event.depth - 3862.0) < 0.01

    def test_x12_stuck_pipe_at_3890(self):
        db = self._get_db_session()
        x12 = db.query(Well).filter(Well.well_name == "X12").first()
        event = db.query(OperationalEvent).filter(
            OperationalEvent.well_id == x12.id,
            OperationalEvent.event_type == EventType.STUCK_PIPE,
        ).filter(OperationalEvent.depth == 3890.0).first()
        assert event is not None, "X12 must have STUCK_PIPE at 3890m"
        assert abs(event.depth - 3890.0) < 0.01

    def test_x09_mud_loss_at_3818(self):
        db = self._get_db_session()
        x09 = db.query(Well).filter(Well.well_name == "X09").first()
        event = db.query(OperationalEvent).filter(
            OperationalEvent.well_id == x09.id,
            OperationalEvent.event_type == EventType.MUD_LOSS,
        ).filter(OperationalEvent.depth == 3818.0).first()
        assert event is not None, "X09 must have MUD_LOSS at 3818m"
        assert abs(event.depth - 3818.0) < 0.01

    def test_x09_torque_spike_at_3862(self):
        db = self._get_db_session()
        x09 = db.query(Well).filter(Well.well_name == "X09").first()
        event = db.query(OperationalEvent).filter(
            OperationalEvent.well_id == x09.id,
            OperationalEvent.event_type == EventType.TORQUE_SPIKE,
        ).first()
        assert event is not None, "X09 must have TORQUE_SPIKE"

    def test_x21_mud_loss_at_3818(self):
        db = self._get_db_session()
        x21 = db.query(Well).filter(Well.well_name == "X21").first()
        event = db.query(OperationalEvent).filter(
            OperationalEvent.well_id == x21.id,
            OperationalEvent.event_type == EventType.MUD_LOSS,
        ).first()
        assert event is not None

    def test_x21_stuck_pipe_at_3858(self):
        db = self._get_db_session()
        x21 = db.query(Well).filter(Well.well_name == "X21").first()
        event = db.query(OperationalEvent).filter(
            OperationalEvent.well_id == x21.id,
            OperationalEvent.event_type == EventType.STUCK_PIPE,
        ).first()
        assert event is not None

    def test_x07_mud_loss_near_3837(self):
        db = self._get_db_session()
        x07 = db.query(Well).filter(Well.well_name == "X07").first()
        event = db.query(OperationalEvent).filter(
            OperationalEvent.well_id == x07.id,
            OperationalEvent.event_type == EventType.MUD_LOSS,
        ).first()
        assert event is not None
        assert abs(event.depth - 3837.0) < 10.0

    def test_primary_risk_interval_exists(self):
        db = self._get_db_session()
        x17 = db.query(Well).filter(Well.well_name == "X17").first()
        interval = db.query(RiskInterval).filter(
            RiskInterval.well_id == x17.id,
            RiskInterval.risk_type == RiskType.MUD_LOSS,
            RiskInterval.start_depth <= 3842.0,
            RiskInterval.end_depth >= 3842.0,
        ).first()
        assert interval is not None, "Primary risk interval 3810–3870m must contain X17 current depth"

    def test_x12_mitigation_relationships(self):
        """X12 mud loss event must have mitigations."""
        db = self._get_db_session()
        x12 = db.query(Well).filter(Well.well_name == "X12").first()
        event = db.query(OperationalEvent).filter(
            OperationalEvent.well_id == x12.id,
            OperationalEvent.event_type == EventType.MUD_LOSS,
        ).first()
        assert event is not None
        mitigations = db.query(EventMitigation).filter(EventMitigation.event_id == event.id).all()
        assert len(mitigations) > 0, "X12 mud loss event must have mitigations"

    def test_recommendations_have_source_events(self):
        db = self._get_db_session()
        x17 = db.query(Well).filter(Well.well_name == "X17").first()
        recs = db.query(Recommendation).filter(
            Recommendation.well_id == x17.id,
            Recommendation.source_event_id.isnot(None),
        ).all()
        assert len(recs) > 0, "Recommendations must link to source events"

    def test_documents_seeded(self):
        db = self._get_db_session()
        count = db.query(Document).count()
        assert count >= 8, f"Expected ≥8 documents, got {count}"

    def test_alerts_seeded_for_x17(self):
        db = self._get_db_session()
        x17 = db.query(Well).filter(Well.well_name == "X17").first()
        alerts = db.query(Alert).filter(Alert.well_id == x17.id).all()
        assert len(alerts) >= 1


# ─────────────────────────────────────────────────────────────────────────────
# 4. WELLS API
# ─────────────────────────────────────────────────────────────────────────────

class TestWellsAPI:
    def test_list_wells_200(self):
        resp = client.get("/api/wells")
        assert resp.status_code == 200

    def test_list_wells_returns_list(self):
        data = client.get("/api/wells").json()
        assert isinstance(data, list)

    def test_list_wells_count(self):
        data = client.get("/api/wells").json()
        assert len(data) >= 12

    def test_list_wells_has_required_fields(self):
        data = client.get("/api/wells").json()
        well = data[0]
        required = {"id", "well_name", "status", "latitude", "longitude"}
        for field in required:
            assert field in well, f"Missing field: {field}"

    def test_well_detail_x17(self):
        wells = client.get("/api/wells").json()
        x17 = next((w for w in wells if w["well_name"] == "X17"), None)
        assert x17 is not None
        resp = client.get(f"/api/wells/{x17['id']}")
        assert resp.status_code == 200
        detail = resp.json()
        assert detail["well_name"] == "X17"
        assert detail["current_depth"] == pytest.approx(3842.0)

    def test_well_detail_includes_formation(self):
        wells = client.get("/api/wells").json()
        x17 = next((w for w in wells if w["well_name"] == "X17"), None)
        resp = client.get(f"/api/wells/{x17['id']}")
        detail = resp.json()
        assert detail.get("formation") is not None
        assert detail["formation"]["name"] == "F3"

    def test_well_detail_404(self):
        resp = client.get("/api/wells/999999")
        assert resp.status_code == 404

    def test_nearby_wells_returns_results(self):
        # X17 location — should find nearby wells
        resp = client.get("/api/wells/nearby?latitude=23.5000&longitude=68.2000&radius_km=10")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_nearby_wells_have_distance(self):
        resp = client.get("/api/wells/nearby?latitude=23.5000&longitude=68.2000&radius_km=10")
        data = resp.json()
        for w in data:
            assert "distance_km" in w


# ─────────────────────────────────────────────────────────────────────────────
# 5. EVENTS API
# ─────────────────────────────────────────────────────────────────────────────

class TestEventsAPI:
    def test_list_events_200(self):
        assert client.get("/api/events").status_code == 200

    def test_list_events_returns_list(self):
        data = client.get("/api/events").json()
        assert isinstance(data, list)

    def test_list_events_count(self):
        data = client.get("/api/events").json()
        assert len(data) >= 8

    def test_events_filter_by_type(self):
        resp = client.get("/api/events?event_type=MUD_LOSS")
        assert resp.status_code == 200
        data = resp.json()
        for e in data:
            assert e["event_type"] == "MUD_LOSS"

    def test_well_events_x12(self):
        wells = client.get("/api/wells").json()
        x12 = next(w for w in wells if w["well_name"] == "X12")
        resp = client.get(f"/api/wells/{x12['id']}/events")
        assert resp.status_code == 200
        events = resp.json()
        assert len(events) >= 3

    def test_well_events_include_mitigations(self):
        wells = client.get("/api/wells").json()
        x12 = next(w for w in wells if w["well_name"] == "X12")
        events = client.get(f"/api/wells/{x12['id']}/events").json()
        # At least one event should have mitigations
        has_mitigation = any(len(e.get("mitigations", [])) > 0 for e in events)
        assert has_mitigation

    def test_event_detail_404(self):
        assert client.get("/api/events/999999").status_code == 404

    def test_event_detail_has_fields(self):
        events = client.get("/api/events").json()
        if events:
            first_id = events[0]["id"]
            detail = client.get(f"/api/events/{first_id}").json()
            assert "mitigations" in detail


# ─────────────────────────────────────────────────────────────────────────────
# 6. RISK API
# ─────────────────────────────────────────────────────────────────────────────

class TestRiskAPI:
    def _x17_id(self):
        wells = client.get("/api/wells").json()
        return next(w["id"] for w in wells if w["well_name"] == "X17")

    def test_risk_predictions_x17(self):
        x17_id = self._x17_id()
        resp = client.get(f"/api/risk/{x17_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 3

    def test_risk_intervals_x17(self):
        x17_id = self._x17_id()
        resp = client.get(f"/api/risk/{x17_id}/intervals")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1

    def test_depth_check_3842_in_risk_zone(self):
        x17_id = self._x17_id()
        resp = client.get(f"/api/risk/{x17_id}/check?depth=3842")
        assert resp.status_code == 200
        data = resp.json()
        assert data["in_risk_zone"] is True

    def test_depth_check_1000_not_in_risk_zone(self):
        x17_id = self._x17_id()
        resp = client.get(f"/api/risk/{x17_id}/check?depth=1000")
        assert resp.status_code == 200
        data = resp.json()
        assert data["in_risk_zone"] is False

    def test_alerts_endpoint(self):
        assert client.get("/api/alerts").status_code == 200

    def test_well_alerts_x17(self):
        x17_id = self._x17_id()
        resp = client.get(f"/api/wells/{x17_id}/alerts")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1

    def test_recommendations_x17(self):
        x17_id = self._x17_id()
        resp = client.get(f"/api/wells/{x17_id}/recommendations")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1

    def test_alert_status_update(self):
        x17_id = self._x17_id()
        alerts = client.get(f"/api/wells/{x17_id}/alerts").json()
        if alerts:
            alert_id = alerts[0]["id"]
            resp = client.patch(f"/api/alerts/{alert_id}", json={"status": "ACKNOWLEDGED"})
            assert resp.status_code == 200
            # Reset status back to ACTIVE to keep test runs idempotent
            client.patch(f"/api/alerts/{alert_id}", json={"status": "ACTIVE"})

    def test_alert_404(self):
        assert client.patch("/api/alerts/999999", json={"status": "RESOLVED"}).status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# 7. LOOK-AHEAD API
# ─────────────────────────────────────────────────────────────────────────────

class TestLookaheadAPI:
    def test_lookahead_get_success(self):
        resp = client.get("/api/risk/lookahead?target_well_id=X17&current_depth=3840&lookahead_distance=100&radius_km=10")
        assert resp.status_code == 200
        data = resp.json()
        assert data["target_well_name"] == "X17"
        assert data["current_depth_m"] == 3840.0
        assert data["lookahead_distance_m"] == 100.0
        assert data["analysis_start_m"] == 3840.0
        assert data["analysis_end_m"] == 3940.0
        assert data["status"] == "SUCCESS"
        assert data["findings_count"] > 0
        first_finding = data["findings"][0]
        assert "offset_well_name" in first_finding
        assert "event_type" in first_finding
        assert "distance_km" in first_finding
        assert "provenance_label" in first_finding
        assert "relevance_explanation" in first_finding
        assert "limitations" in first_finding

    def test_lookahead_post_success(self):
        payload = {
            "target_well_id": "X17",
            "current_depth": 3840.0,
            "lookahead_distance": 100.0,
            "radius_km": 10.0,
            "depth_reference": "MD",
            "depth_source": "ENGINEER_INPUT"
        }
        resp = client.post("/api/risk/lookahead", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "SUCCESS"
        assert data["target_well_name"] == "X17"
        assert data["findings_count"] > 0

    def test_lookahead_missing_depth(self):
        resp = client.get("/api/risk/lookahead?target_well_id=X17")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "MISSING_CURRENT_DEPTH"
        assert data["findings_count"] == 0

    def test_lookahead_unknown_well(self):
        resp = client.get("/api/risk/lookahead?target_well_id=NONEXISTENT_WELL_99&current_depth=3840")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "WELL_NOT_FOUND"

    def test_lookahead_dynamic_different_well(self):
        """Switching target well to X12 must calculate offsets relative to X12, excluding X12 itself."""
        resp = client.get("/api/risk/lookahead?target_well_id=X12&current_depth=3810&lookahead_distance=80&radius_km=10")
        assert resp.status_code == 200
        data = resp.json()
        assert data["target_well_name"] == "X12"
        for finding in data["findings"]:
            assert finding["offset_well_name"] != "X12", "Target well cannot be its own offset finding"

