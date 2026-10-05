"""
NWIS Synthetic Prototype Data Seed Script
==========================================
Populates the database with the core NWIS prototype dataset.

IMPORTANT: This data is entirely synthetic and fictional.
- Wells named X03–X21 are prototype identifiers, not real wells.
- Formations F1–F4 are synthetic prototypes, not real geological formations.
- Risk scores and event depths are demonstration values.
- This data is NOT real OIL data and does NOT represent real drilling operations.

The dataset is designed to support the locked NWIS demo story:
  X17 (active well, 3842m, F3) →
  X12 (primary offset, 2.1 km) →
  Historical events at 3845–3890m →
  Risk interval 3810–3870m →
  Mud Loss 87%, Torque Spike 81%, Stuck Pipe 68%

Usage:
  python seed.py            # seed (idempotent — skips if data exists)
  python seed.py --reset    # drop all data and reseed
"""

import sys
import argparse
from datetime import date, datetime
from sqlalchemy.orm import Session

# ── Windows UTF-8 fix ─────────────────────────────────────────────────────────
# PowerShell on Windows defaults to CP1252 which cannot encode emoji.
# Reconfigure stdout to UTF-8 before any print() calls.
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Bootstrap path so this script can be run from backend/ directory
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


from app.core.database import SessionLocal, engine
from app.models.base import Base
from app.models.models import (
    Formation, Reservoir, Well, WellTrajectory, DrillingParameter,
    OperationalEvent, EventMitigation, CasingProgram, CementingRecord,
    MudProgram, Document, RiskInterval, RiskPrediction, Alert, Recommendation,
)
from app.models.enums import (
    WellStatus, EventType, Severity, RiskType, AlertStatus,
    DocumentType, DocumentStatus, SuccessIndicator,
)


# ─────────────────────────────────────────────────────────────────────────────
# FORMATIONS (Synthetic prototype — F1–F4 only)
# ─────────────────────────────────────────────────────────────────────────────

FORMATIONS = [
    {"name": "F1", "description": "Synthetic prototype formation 1 (shallow)", "top_depth": 1500.0, "base_depth": 2200.0},
    {"name": "F2", "description": "Synthetic prototype formation 2 (intermediate)", "top_depth": 2200.0, "base_depth": 3100.0},
    {"name": "F3", "description": "Synthetic prototype formation 3 (primary demonstration formation)", "top_depth": 3100.0, "base_depth": 4000.0},
    {"name": "F4", "description": "Synthetic prototype formation 4 (deep)", "top_depth": 4000.0, "base_depth": 5000.0},
]


# ─────────────────────────────────────────────────────────────────────────────
# RESERVOIRS
# ─────────────────────────────────────────────────────────────────────────────

RESERVOIRS = [
    {"name": "R-Alpha", "description": "Synthetic prototype reservoir Alpha — shallow carbonate zone"},
    {"name": "R-Beta", "description": "Synthetic prototype reservoir Beta — primary demonstration reservoir"},
    {"name": "R-Gamma", "description": "Synthetic prototype reservoir Gamma — deep clastic"},
]


# ─────────────────────────────────────────────────────────────────────────────
# WELLS
# All coordinates are synthetic prototype values (not real well locations).
# Reference point for X17: 23.5°N, 68.2°E (fictional demonstration area)
# ─────────────────────────────────────────────────────────────────────────────

def build_wells(formations: dict, reservoirs: dict) -> list:
    f3 = formations["F3"]
    f2 = formations["F2"]
    r_beta = reservoirs["R-Beta"]
    r_alpha = reservoirs["R-Alpha"]

    return [
        # ── PRIMARY ACTIVE WELL ─────────────────────────────────────────────
        {
            "well_name": "X17",
            "status": WellStatus.ACTIVE,
            "latitude": 23.5000,
            "longitude": 68.2000,
            "total_depth": 4200.0,
            "current_depth": 3842.0,
            "formation_id": f3.id,
            "reservoir_id": r_beta.id,
            "spud_date": date(2024, 3, 15),
            "completion_date": None,
            "operator": "ONGC",
            "field": "Prototype Field Alpha",
            "notes": "Primary active demonstration well. Currently drilling in F3 at 3842m (synthetic).",
        },
        # ── PRIMARY NEARBY OFFSET ───────────────────────────────────────────
        {
            "well_name": "X12",
            "status": WellStatus.COMPLETED,
            "latitude": 23.5190,  # ~2.1 km north of X17
            "longitude": 68.2000,
            "total_depth": 4150.0,
            "current_depth": 4150.0,
            "formation_id": f3.id,
            "reservoir_id": r_beta.id,
            "spud_date": date(2022, 8, 10),
            "completion_date": date(2023, 2, 20),
            "operator": "ONGC",
            "field": "Prototype Field Alpha",
            "notes": "Primary offset. Experienced MUD_LOSS@3845m, TORQUE_SPIKE@3862m, STUCK_PIPE@3890m.",
        },
        # ── SECONDARY NEARBY OFFSETS ────────────────────────────────────────
        {
            "well_name": "X09",
            "status": WellStatus.COMPLETED,
            "latitude": 23.5422,  # ~4.7 km north of X17
            "longitude": 68.2000,
            "total_depth": 4050.0,
            "current_depth": 4050.0,
            "formation_id": f3.id,
            "reservoir_id": r_beta.id,
            "spud_date": date(2021, 5, 1),
            "completion_date": date(2021, 11, 30),
            "operator": "ONGC",
            "field": "Prototype Field Alpha",
            "notes": "Offset. MUD_LOSS@3818m, TORQUE_SPIKE@3862m.",
        },
        {
            "well_name": "X21",
            "status": WellStatus.COMPLETED,
            "latitude": 23.5342,  # ~3.8 km north of X17
            "longitude": 68.2000,
            "total_depth": 4100.0,
            "current_depth": 4100.0,
            "formation_id": f3.id,
            "reservoir_id": r_beta.id,
            "spud_date": date(2023, 1, 20),
            "completion_date": date(2023, 8, 15),
            "operator": "ONGC",
            "field": "Prototype Field Alpha",
            "notes": "Offset. MUD_LOSS@3818m, STUCK_PIPE@3858m.",
        },
        {
            "well_name": "X07",
            "status": WellStatus.COMPLETED,
            "latitude": 23.5080,
            "longitude": 68.1940,
            "total_depth": 3920.0,
            "current_depth": 3920.0,
            "formation_id": f3.id,
            "reservoir_id": r_beta.id,
            "spud_date": date(2020, 9, 5),
            "completion_date": date(2021, 3, 20),
            "operator": "ONGC",
            "field": "Prototype Field Alpha",
            "notes": "Offset. MUD_LOSS@3837m.",
        },
        {
            "well_name": "X15",
            "status": WellStatus.COMPLETED,
            "latitude": 23.4910,
            "longitude": 68.2050,
            "total_depth": 4000.0,
            "current_depth": 4000.0,
            "formation_id": f3.id,
            "reservoir_id": r_beta.id,
            "spud_date": date(2022, 11, 10),
            "completion_date": date(2023, 5, 25),
            "operator": "ONGC",
            "field": "Prototype Field Alpha",
            "notes": "Regional well. Minor torque anomaly observed at ~3850m.",
        },
        # ── REGIONAL WELLS ──────────────────────────────────────────────────
        {
            "well_name": "X03",
            "status": WellStatus.COMPLETED,
            "latitude": 23.4750,
            "longitude": 68.1800,
            "total_depth": 3700.0,
            "current_depth": 3700.0,
            "formation_id": f2.id,
            "reservoir_id": r_alpha.id,
            "spud_date": date(2019, 6, 15),
            "completion_date": date(2020, 1, 10),
            "operator": "ONGC",
            "field": "Prototype Field Beta",
            "notes": "Regional reference well — F2 target.",
        },
        {
            "well_name": "X05",
            "status": WellStatus.COMPLETED,
            "latitude": 23.5600,
            "longitude": 68.2200,
            "total_depth": 4300.0,
            "current_depth": 4300.0,
            "formation_id": f3.id,
            "reservoir_id": r_beta.id,
            "spud_date": date(2020, 3, 1),
            "completion_date": date(2020, 10, 30),
            "operator": "ONGC",
            "field": "Prototype Field Alpha",
            "notes": "Regional reference. Drilled through F3.",
        },
        {
            "well_name": "X08",
            "status": WellStatus.SUSPENDED,
            "latitude": 23.4880,
            "longitude": 68.2300,
            "total_depth": 3200.0,
            "current_depth": 3200.0,
            "formation_id": f2.id,
            "reservoir_id": r_alpha.id,
            "spud_date": date(2021, 2, 20),
            "completion_date": None,
            "operator": "ONGC",
            "field": "Prototype Field Beta",
            "notes": "Suspended — mechanical issues at 3200m.",
        },
        {
            "well_name": "X11",
            "status": WellStatus.COMPLETED,
            "latitude": 23.5700,
            "longitude": 68.1750,
            "total_depth": 4400.0,
            "current_depth": 4400.0,
            "formation_id": f3.id,
            "reservoir_id": r_beta.id,
            "spud_date": date(2022, 4, 5),
            "completion_date": date(2022, 12, 20),
            "operator": "ONGC",
            "field": "Prototype Field Alpha",
            "notes": "Deeper well. Cementing issue noted.",
        },
        {
            "well_name": "X14",
            "status": WellStatus.COMPLETED,
            "latitude": 23.4650,
            "longitude": 68.2100,
            "total_depth": 3850.0,
            "current_depth": 3850.0,
            "formation_id": f3.id,
            "reservoir_id": r_beta.id,
            "spud_date": date(2023, 6, 10),
            "completion_date": date(2023, 12, 5),
            "operator": "ONGC",
            "field": "Prototype Field Alpha",
            "notes": "Similar total depth to F3 target.",
        },
        {
            "well_name": "X19",
            "status": WellStatus.PLANNED,
            "latitude": 23.5150,
            "longitude": 68.1900,
            "total_depth": 4250.0,
            "current_depth": None,
            "formation_id": None,
            "reservoir_id": r_beta.id,
            "spud_date": date(2025, 1, 15),
            "completion_date": None,
            "operator": "ONGC",
            "field": "Prototype Field Alpha",
            "notes": "Planned well — adjacent to X17 corridor.",
        },
    ]


# ─────────────────────────────────────────────────────────────────────────────
# OPERATIONAL EVENTS (Locked per prompt specification)
# ─────────────────────────────────────────────────────────────────────────────

def build_events(wells: dict, formations: dict) -> list:
    f3 = formations["F3"]

    return [
        # ── X12 events ──────────────────────────────────────────────────────
        {
            "well_name": "X12",
            "event_type": EventType.MUD_LOSS,
            "depth": 3845.0,
            "start_depth": 3840.0,
            "end_depth": 3852.0,
            "formation_id": f3.id,
            "severity": Severity.HIGH,
            "cause": "Natural fracture network encountered at transition into F3 base",
            "description": "Significant mud loss observed at 3845m during rotary drilling. Loss rate ~25 bbl/hr. Returns lost completely within 2 hours.",
            "outcome": "Controlled with LCM pills and reduced ECD. Bridging material effective after 3rd treatment.",
            "npt_hours": 18.5,
            "event_date": date(2022, 12, 10),
            "mitigations": [
                {
                    "mitigation": "Pumped 50-bbl LCM pill (mixed coarse/medium) — 30 bbl/hr reduction achieved.",
                    "result": "Partial returns restored after first pill.",
                    "success_indicator": SuccessIndicator.PARTIAL,
                },
                {
                    "mitigation": "Reduced ECD to 1.08 sg by lowering flow rate to 1400 lpm.",
                    "result": "Stabilised loss rate, no full return yet.",
                    "success_indicator": SuccessIndicator.PARTIAL,
                },
                {
                    "mitigation": "Pumped 30-bbl graphite/calcium carbonate pill. Spot-squeezed at fracture depth.",
                    "result": "Full returns restored. Continued drilling with modified mud weight.",
                    "success_indicator": SuccessIndicator.SUCCESS,
                },
            ],
        },
        {
            "well_name": "X12",
            "event_type": EventType.TORQUE_SPIKE,
            "depth": 3862.0,
            "formation_id": f3.id,
            "severity": Severity.MEDIUM,
            "cause": "Differential sticking tendency in tight F3 interval. Elevated mud cake buildup.",
            "description": "Torque increased from 18 kNm to 34 kNm over 2-hour period at 3862m. Intermittent stick-slip observed on surface torque trace.",
            "outcome": "Reduced WOB and applied reamer passes. Torque stabilised within 4 hours.",
            "npt_hours": 4.0,
            "event_date": date(2022, 12, 18),
            "mitigations": [
                {
                    "mitigation": "Reduced WOB from 25 klbs to 15 klbs and increased RPM from 90 to 120.",
                    "result": "Torque reduced to 24 kNm. Stick-slip reduced.",
                    "success_indicator": SuccessIndicator.PARTIAL,
                },
                {
                    "mitigation": "Applied lubricant (LUBE-EZ) at 3% concentration. Rotated off bottom 3 times.",
                    "result": "Torque returned to 18 kNm. Drilling resumed.",
                    "success_indicator": SuccessIndicator.SUCCESS,
                },
            ],
        },
        {
            "well_name": "X12",
            "event_type": EventType.STUCK_PIPE,
            "depth": 3890.0,
            "formation_id": f3.id,
            "severity": Severity.CRITICAL,
            "cause": "Differential sticking. Pipe left stationary >15 min during connection in high-pressure zone.",
            "description": "Drill string became stuck at 3890m during connection. Unable to rotate or reciprocate. High differential pressure regime. 42 hours total recovery operation.",
            "outcome": "String freed using combination of spotting fluid, jarring and controlled overpull.",
            "npt_hours": 42.0,
            "event_date": date(2023, 1, 5),
            "mitigations": [
                {
                    "mitigation": "Spotted 20-bbl diesel/detergent spotting fluid at stuck point.",
                    "result": "No immediate improvement after 6 hours.",
                    "success_indicator": SuccessIndicator.FAILURE,
                },
                {
                    "mitigation": "Jarred down 200 klbs overpull for 4 hours using downhole jar.",
                    "result": "String began to move. Partial reciprocation restored.",
                    "success_indicator": SuccessIndicator.PARTIAL,
                },
                {
                    "mitigation": "Combined jarring with 30-bbl spotting fluid re-spot and gradual WOB increase.",
                    "result": "String fully freed. Resumed with 10-minute connections max and continuous rotation.",
                    "success_indicator": SuccessIndicator.SUCCESS,
                },
            ],
        },
        # ── X09 events ──────────────────────────────────────────────────────
        {
            "well_name": "X09",
            "event_type": EventType.MUD_LOSS,
            "depth": 3818.0,
            "formation_id": f3.id,
            "severity": Severity.MEDIUM,
            "cause": "Entry into F3 zone with elevated natural fracture density. Mud weight slightly overbalanced.",
            "description": "Partial mud losses at 3818m on entry into F3. Loss rate 10–15 bbl/hr. Returns degraded but not lost.",
            "outcome": "Managed with LCM treatment and ECD reduction.",
            "npt_hours": 8.0,
            "event_date": date(2021, 9, 14),
            "mitigations": [
                {
                    "mitigation": "Pumped 40-bbl LCM pill (medium granular). Reduced flow rate by 15%.",
                    "result": "Loss rate reduced to <3 bbl/hr. Drilling continued.",
                    "success_indicator": SuccessIndicator.SUCCESS,
                },
            ],
        },
        {
            "well_name": "X09",
            "event_type": EventType.TORQUE_SPIKE,
            "depth": 3862.0,
            "formation_id": f3.id,
            "severity": Severity.MEDIUM,
            "cause": "Tight F3 interval. Similar lithology to X12 torque zone.",
            "description": "Torque spike at 3862m — consistent with X12 experience at same depth. Intermittent stick-slip.",
            "outcome": "Managed with WOB reduction and lubrication. No stuck pipe.",
            "npt_hours": 3.0,
            "event_date": date(2021, 10, 2),
            "mitigations": [
                {
                    "mitigation": "Reduced WOB, increased RPM, added lubricant at 2.5% concentration.",
                    "result": "Torque normalised within 2 hours.",
                    "success_indicator": SuccessIndicator.SUCCESS,
                },
            ],
        },
        # ── X21 events ──────────────────────────────────────────────────────
        {
            "well_name": "X21",
            "event_type": EventType.MUD_LOSS,
            "depth": 3818.0,
            "formation_id": f3.id,
            "severity": Severity.HIGH,
            "cause": "F3 entry fracture zone. Higher fracture intensity than X09.",
            "description": "Severe mud losses at 3818m. Loss rate 40+ bbl/hr. Drilling halted. Full LCM remediation required.",
            "outcome": "Controlled after 2 LCM treatments and cement plug.",
            "npt_hours": 24.0,
            "event_date": date(2023, 4, 8),
            "mitigations": [
                {
                    "mitigation": "Pumped 2 × 50-bbl LCM pills with graphite and CaCO3.",
                    "result": "Partial reduction. Still losing ~15 bbl/hr.",
                    "success_indicator": SuccessIndicator.PARTIAL,
                },
                {
                    "mitigation": "Set cement plug at 3815m. Waited 18 hours WOC. Re-drilled.",
                    "result": "Losses eliminated. Drill-out successful.",
                    "success_indicator": SuccessIndicator.SUCCESS,
                },
            ],
        },
        {
            "well_name": "X21",
            "event_type": EventType.STUCK_PIPE,
            "depth": 3858.0,
            "formation_id": f3.id,
            "severity": Severity.HIGH,
            "cause": "Differential sticking in tight F3 sequence at 3858m.",
            "description": "Drill string stuck during connection at 3858m. Similar mechanism to X12 stuck pipe at 3890m.",
            "outcome": "Freed using spotting fluid and jarring after 28 hours.",
            "npt_hours": 28.0,
            "event_date": date(2023, 6, 10),
            "mitigations": [
                {
                    "mitigation": "Spotted 25-bbl diesel-based spotting fluid. Jarred continuously.",
                    "result": "String freed after 28 hours. Resumed drilling.",
                    "success_indicator": SuccessIndicator.SUCCESS,
                },
            ],
        },
        # ── X07 events ──────────────────────────────────────────────────────
        {
            "well_name": "X07",
            "event_type": EventType.MUD_LOSS,
            "depth": 3837.0,
            "formation_id": f3.id,
            "severity": Severity.MEDIUM,
            "cause": "Lost circulation zone in F3.",
            "description": "Mud losses at 3837m. Rate 12–18 bbl/hr. Managed without significant NPT.",
            "outcome": "LCM treatment successful.",
            "npt_hours": 6.0,
            "event_date": date(2021, 1, 20),
            "mitigations": [
                {
                    "mitigation": "LCM pill pumped. Flow rate reduced.",
                    "result": "Losses stopped. Drilling continued.",
                    "success_indicator": SuccessIndicator.SUCCESS,
                },
            ],
        },
        # ── X11 Cementing event ──────────────────────────────────────────────
        {
            "well_name": "X11",
            "event_type": EventType.CEMENTING_ISSUE,
            "depth": 3900.0,
            "formation_id": f3.id,
            "severity": Severity.MEDIUM,
            "cause": "Poor cement bond at 9-5/8 casing shoe due to gas migration.",
            "description": "CBL/VDL showed poor bond at 3900m. Gas migration through cement column suspected.",
            "outcome": "Remedial squeeze cement job performed. Bond improved.",
            "npt_hours": 36.0,
            "event_date": date(2022, 11, 8),
            "mitigations": [
                {
                    "mitigation": "Squeeze cement job at 3900m. Used thixotropic cement with anti-gas-migration additive.",
                    "result": "Improved bond confirmed on repeat CBL. Passed pressure test.",
                    "success_indicator": SuccessIndicator.SUCCESS,
                },
            ],
        },
    ]


# ─────────────────────────────────────────────────────────────────────────────
# DOCUMENTS
# ─────────────────────────────────────────────────────────────────────────────

def build_documents(wells: dict) -> list:
    return [
        {"well_name": "X12", "document_type": DocumentType.WCR, "filename": "WCR_X12.pdf",
         "source": "ONGC EDC Archive", "notes": "Well Completion Report for X12"},
        {"well_name": "X12", "document_type": DocumentType.DDR, "filename": "DDR_X12_3845.pdf",
         "source": "ONGC DDR System", "notes": "Daily Drilling Report — X12 day of mud loss at 3845m"},
        {"well_name": "X12", "document_type": DocumentType.DDR, "filename": "DDR_X12_3862.pdf",
         "source": "ONGC DDR System", "notes": "Daily Drilling Report — X12 day of torque spike at 3862m"},
        {"well_name": "X09", "document_type": DocumentType.WCR, "filename": "WCR_X09.pdf",
         "source": "ONGC EDC Archive", "notes": "Well Completion Report for X09"},
        {"well_name": "X09", "document_type": DocumentType.DDR, "filename": "DDR_X09_3818.pdf",
         "source": "ONGC DDR System", "notes": "Daily Drilling Report — X09 mud loss at 3818m"},
        {"well_name": "X21", "document_type": DocumentType.WCR, "filename": "WCR_X21.pdf",
         "source": "ONGC EDC Archive", "notes": "Well Completion Report for X21"},
        {"well_name": "X21", "document_type": DocumentType.DDR, "filename": "DDR_X21_3858.pdf",
         "source": "ONGC DDR System", "notes": "Daily Drilling Report — X21 stuck pipe at 3858m"},
        {"well_name": "X07", "document_type": DocumentType.DDR, "filename": "DDR_X07_3837.pdf",
         "source": "ONGC DDR System", "notes": "Daily Drilling Report — X07 mud loss at 3837m"},
    ]


# ─────────────────────────────────────────────────────────────────────────────
# RISK INTERVALS
# Primary demo interval: 3810–3870m (synthetic prototype)
# ─────────────────────────────────────────────────────────────────────────────

def build_risk_intervals(wells: dict, formations: dict) -> list:
    f3 = formations["F3"]
    x17_id = wells["X17"].id

    return [
        {
            "well_id": x17_id,
            "risk_type": RiskType.MUD_LOSS,
            "start_depth": 3810.0,
            "end_depth": 3870.0,
            "formation_id": f3.id,
            "occurrence_count": 4,  # X12, X09, X21, X07 all had mud loss in this zone
            "evidence": (
                "4 nearby offset wells (X12@3845m, X09@3818m, X21@3818m, X07@3837m) "
                "experienced mud loss within 3810–3870m in F3. "
                "Natural fracture network suspected at F3 transition."
            ),
        },
        {
            "well_id": x17_id,
            "risk_type": RiskType.TORQUE_SPIKE,
            "start_depth": 3855.0,
            "end_depth": 3875.0,
            "formation_id": f3.id,
            "occurrence_count": 2,  # X12 and X09
            "evidence": (
                "X12 and X09 both experienced torque spikes at 3862m in F3. "
                "Tight interval with differential sticking tendency and mud cake buildup."
            ),
        },
        {
            "well_id": x17_id,
            "risk_type": RiskType.STUCK_PIPE,
            "start_depth": 3850.0,
            "end_depth": 3900.0,
            "formation_id": f3.id,
            "occurrence_count": 2,  # X12@3890m, X21@3858m
            "evidence": (
                "X12 experienced critical stuck pipe at 3890m (42 hrs NPT). "
                "X21 experienced stuck pipe at 3858m (28 hrs NPT). "
                "Both due to differential sticking in tight F3 sequence. "
                "Risk highest during connections — do not leave string stationary >10 min."
            ),
        },
    ]


# ─────────────────────────────────────────────────────────────────────────────
# RISK PREDICTIONS (Synthetic prototype scores for X17 at 3842m)
# Scores are demonstration values ONLY — not validated real-world probabilities.
# ─────────────────────────────────────────────────────────────────────────────

def build_risk_predictions(wells: dict) -> list:
    x17_id = wells["X17"].id

    return [
        {
            "well_id": x17_id,
            "risk_type": RiskType.MUD_LOSS,
            "depth": 3842.0,
            "score": 0.87,
            "confidence": 0.82,
            "explanation": (
                "4 of 5 nearby offset wells experienced mud loss within 3810–3870m in F3. "
                "X12 (2.1km): MUD_LOSS@3845m. X09 (4.7km): MUD_LOSS@3818m. "
                "X21 (3.8km): MUD_LOSS@3818m. X07: MUD_LOSS@3837m. "
                "Current depth 3842m is within primary risk interval. "
                "Risk elevated. [SYNTHETIC PROTOTYPE SCORE]"
            ),
            "model_version": "prototype-v1",
        },
        {
            "well_id": x17_id,
            "risk_type": RiskType.TORQUE_SPIKE,
            "depth": 3842.0,
            "score": 0.81,
            "confidence": 0.75,
            "explanation": (
                "X12 and X09 experienced torque spikes at 3862m — 20m ahead. "
                "Tight F3 interval with known differential sticking tendency. "
                "Approaching torque risk zone. [SYNTHETIC PROTOTYPE SCORE]"
            ),
            "model_version": "prototype-v1",
        },
        {
            "well_id": x17_id,
            "risk_type": RiskType.STUCK_PIPE,
            "depth": 3842.0,
            "score": 0.68,
            "confidence": 0.70,
            "explanation": (
                "X12 critical stuck pipe at 3890m (42 hrs). X21 stuck pipe at 3858m. "
                "Mechanism: differential sticking during connections. "
                "X17 is 16–48m from historical stuck pipe depths. [SYNTHETIC PROTOTYPE SCORE]"
            ),
            "model_version": "prototype-v1",
        },
        {
            "well_id": x17_id,
            "risk_type": RiskType.OVERPRESSURE,
            "depth": 3842.0,
            "score": 0.42,
            "confidence": 0.55,
            "explanation": (
                "Moderate overpressure risk based on F3 pore pressure gradient history. "
                "No direct nearby well overpressure events recorded in this interval. "
                "[SYNTHETIC PROTOTYPE SCORE]"
            ),
            "model_version": "prototype-v1",
        },
        {
            "well_id": x17_id,
            "risk_type": RiskType.CEMENTING_ISSUE,
            "depth": 3842.0,
            "score": 0.23,
            "confidence": 0.60,
            "explanation": (
                "X11 experienced cementing issue at 3900m. Relevant but 58m below current depth. "
                "Low immediate risk at current depth. Monitor at casing point. [SYNTHETIC PROTOTYPE SCORE]"
            ),
            "model_version": "prototype-v1",
        },
    ]


# ─────────────────────────────────────────────────────────────────────────────
# ALERTS (Proactive alerts for X17 at 3842m)
# ─────────────────────────────────────────────────────────────────────────────

def build_alerts(wells: dict) -> list:
    x17_id = wells["X17"].id

    return [
        {
            "well_id": x17_id,
            "risk_type": RiskType.MUD_LOSS,
            "depth": 3842.0,
            "severity": Severity.HIGH,
            "status": AlertStatus.ACTIVE,
            "message": (
                "PROACTIVE ALERT — MUD LOSS RISK ELEVATED. "
                "X17 is currently at 3842m within the historical mud loss risk zone (3810–3870m). "
                "4 nearby offset wells experienced mud loss in this interval. "
                "Recommended: Pre-treat with LCM, monitor pit volume continuously, "
                "reduce ECD at formation transition. [Synthetic prototype alert]"
            ),
        },
        {
            "well_id": x17_id,
            "risk_type": RiskType.TORQUE_SPIKE,
            "depth": 3842.0,
            "severity": Severity.MEDIUM,
            "status": AlertStatus.ACTIVE,
            "message": (
                "APPROACHING TORQUE SPIKE ZONE. "
                "X12 and X09 experienced torque spikes at 3862m — 20m ahead of current depth. "
                "Recommended: Monitor torque/drag trends, apply lubricant, "
                "reduce WOB if torque increases >20% above baseline. [Synthetic prototype alert]"
            ),
        },
    ]


# ─────────────────────────────────────────────────────────────────────────────
# RECOMMENDATIONS (Evidence-backed for X17)
# ─────────────────────────────────────────────────────────────────────────────

def build_recommendations(wells: dict, events_map: dict) -> list:
    x17_id = wells["X17"].id

    return [
        {
            "well_id": x17_id,
            "risk_type": RiskType.MUD_LOSS,
            "recommendation": (
                "Pre-treat with 50-bbl LCM pill (mixed coarse/medium granular) before "
                "entering 3840–3870m interval. Maintain ECD ≤ 1.08 sg. "
                "Monitor pit volume every 15 min. Keep LCM inventory on rig."
            ),
            "evidence": (
                "Based on X12 mud loss at 3845m: LCM pill + ECD reduction was effective. "
                "X09 mud loss at 3818m controlled with single LCM treatment. "
                "X21 required cement plug for severe losses."
            ),
            "source_event_key": ("X12", EventType.MUD_LOSS, 3845.0),
            "priority": 1,
        },
        {
            "well_id": x17_id,
            "risk_type": RiskType.STUCK_PIPE,
            "recommendation": (
                "Limit connection time to ≤10 minutes in 3850–3900m interval. "
                "Maintain continuous string rotation during connections where possible. "
                "Have spotting fluid (25 bbl diesel-based) pre-mixed and available. "
                "Conduct wiper trips if torque/drag increases unexpectedly."
            ),
            "evidence": (
                "X12: critical stuck pipe at 3890m (42 hrs NPT) — freed with spotting fluid + jarring. "
                "X21: stuck pipe at 3858m (28 hrs NPT). "
                "Both cases: differential sticking during connections in tight F3 sequence."
            ),
            "source_event_key": ("X12", EventType.STUCK_PIPE, 3890.0),
            "priority": 2,
        },
        {
            "well_id": x17_id,
            "risk_type": RiskType.TORQUE_SPIKE,
            "recommendation": (
                "If torque increases >20% from baseline in 3855–3875m interval: "
                "reduce WOB to 15 klbs, increase RPM to 120+, "
                "apply lubricant at 2.5–3% concentration, "
                "perform off-bottom rotation for 15 min before resuming."
            ),
            "evidence": (
                "X12 torque spike at 3862m (4 hrs NPT): controlled with WOB reduction + lubrication. "
                "X09 torque spike at 3862m (3 hrs NPT): same approach effective. "
                "Both wells in same F3 interval."
            ),
            "source_event_key": ("X12", EventType.TORQUE_SPIKE, 3862.0),
            "priority": 3,
        },
    ]


# ─────────────────────────────────────────────────────────────────────────────
# WELL TRAJECTORIES (synthetic — X17 active well)
# ─────────────────────────────────────────────────────────────────────────────

def build_trajectories(wells: dict) -> list:
    x17_id = wells["X17"].id
    base_lat, base_lon = 23.5000, 68.2000

    # Simple synthetic vertical-ish trajectory for X17
    points = []
    for i, md in enumerate(range(0, 4001, 200)):
        points.append({
            "well_id": x17_id,
            "measured_depth": float(md),
            "inclination": min(i * 0.5, 8.0),  # gently deviated
            "azimuth": 45.0,
            "latitude": base_lat - (i * 0.00005),
            "longitude": base_lon + (i * 0.00005),
            "true_vertical_depth": float(md) * 0.997,  # near-vertical
        })
    return points


# ─────────────────────────────────────────────────────────────────────────────
# DRILLING PARAMETERS (synthetic — X17 around current depth)
# ─────────────────────────────────────────────────────────────────────────────

def build_drilling_parameters(wells: dict) -> list:
    x17_id = wells["X17"].id

    params = []
    # Parameters at key depths for X17
    depth_configs = [
        (3800.0, 22.0, 18.0, 90.0, 16.0, 1.10, 1600.0, 3400.0, 310.0),
        (3810.0, 20.0, 18.0, 88.0, 17.0, 1.11, 1580.0, 3380.0, 312.0),
        (3820.0, 18.0, 19.0, 92.0, 18.5, 1.11, 1560.0, 3360.0, 315.0),
        (3830.0, 15.0, 20.0, 95.0, 20.0, 1.12, 1540.0, 3340.0, 318.0),
        (3842.0, 12.0, 22.0, 98.0, 24.0, 1.12, 1520.0, 3320.0, 320.0),  # current depth
    ]
    # (depth, rop, wob, rpm, torque, ecd, mud_flow, spp, hookload)
    for depth, rop, wob, rpm, torque, ecd, mud_flow, spp, hookload in depth_configs:
        params.append({
            "well_id": x17_id,
            "depth": depth,
            "rop": rop,
            "wob": wob,
            "rpm": rpm,
            "torque": torque,
            "ecd": ecd,
            "mud_flow": mud_flow,
            "spp": spp,
            "hookload": hookload,
        })
    return params


# ─────────────────────────────────────────────────────────────────────────────
# CASING PROGRAMS
# ─────────────────────────────────────────────────────────────────────────────

def build_casing_programs(wells: dict) -> list:
    x17_id = wells["X17"].id
    x12_id = wells["X12"].id

    return [
        {"well_id": x17_id, "casing_size": "20 inch", "setting_depth": 500.0, "grade": "K55", "weight": 94.0, "connection": "BTC", "notes": "Conductor casing"},
        {"well_id": x17_id, "casing_size": "13-3/8 inch", "setting_depth": 1800.0, "grade": "K55", "weight": 68.0, "connection": "BTC", "notes": "Surface casing"},
        {"well_id": x17_id, "casing_size": "9-5/8 inch", "setting_depth": 3300.0, "grade": "L80", "weight": 47.0, "connection": "BTC", "notes": "Intermediate casing — above F3"},
        {"well_id": x12_id, "casing_size": "20 inch", "setting_depth": 480.0, "grade": "K55", "weight": 94.0, "connection": "BTC", "notes": "Conductor"},
        {"well_id": x12_id, "casing_size": "13-3/8 inch", "setting_depth": 1750.0, "grade": "K55", "weight": 68.0, "connection": "BTC", "notes": "Surface casing"},
        {"well_id": x12_id, "casing_size": "9-5/8 inch", "setting_depth": 3290.0, "grade": "L80", "weight": 47.0, "connection": "BTC", "notes": "Intermediate casing"},
    ]


# ─────────────────────────────────────────────────────────────────────────────
# CEMENTING RECORDS
# ─────────────────────────────────────────────────────────────────────────────

def build_cementing_records(wells: dict) -> list:
    x17_id = wells["X17"].id
    x11_id = wells["X11"].id

    return [
        {
            "well_id": x17_id, "depth": 3300.0, "cement_type": "Class G + silica flour",
            "volume": 45.0, "displacement_volume": 38.0,
            "issue": None, "result": "Good bond confirmed on CBL/VDL",
            "notes": "9-5/8 casing cement — no issues",
        },
        {
            "well_id": x11_id, "depth": 3900.0, "cement_type": "Class G + anti-gas-migration additive",
            "volume": 52.0, "displacement_volume": 44.0,
            "issue": "Poor initial bond at shoe — gas migration suspected",
            "result": "Remedial squeeze successful. Bond confirmed on repeat CBL.",
            "notes": "Required squeeze job. See DDR for X11.",
        },
    ]


# ─────────────────────────────────────────────────────────────────────────────
# MUD PROGRAMS
# ─────────────────────────────────────────────────────────────────────────────

def build_mud_programs(wells: dict) -> list:
    x17_id = wells["X17"].id
    x12_id = wells["X12"].id

    return [
        {"well_id": x17_id, "depth": 3800.0, "mud_type": "OBM", "density": 1.10, "viscosity": 38.0, "ph": None, "notes": "Pre-F3 mud program"},
        {"well_id": x17_id, "depth": 3842.0, "mud_type": "OBM", "density": 1.12, "viscosity": 42.0, "ph": None, "notes": "Current mud program at 3842m. Monitoring ECD closely."},
        {"well_id": x12_id, "depth": 3845.0, "mud_type": "OBM", "density": 1.10, "viscosity": 40.0, "ph": None, "notes": "Mud program at time of mud loss event. ECD elevated due to cuttings loading."},
        {"well_id": x12_id, "depth": 3862.0, "mud_type": "OBM", "density": 1.08, "viscosity": 38.0, "ph": None, "notes": "Post-mud-loss. ECD reduced. Lubricant added."},
    ]


# ─────────────────────────────────────────────────────────────────────────────
# SEED EXECUTION
# ─────────────────────────────────────────────────────────────────────────────

def seed(db: Session, reset: bool = False) -> None:
    """
    Idempotent seed function.
    If reset=True, clears all seeded data first.
    If reset=False, skips seeding if wells already exist.
    """
    if reset:
        print("🔄 Reset requested — clearing existing data...")
        for model in [
            Recommendation, Alert, RiskPrediction, RiskInterval,
            DocumentExtraction if False else type(None),
            Document, MudProgram, CementingRecord, CasingProgram,
            EventMitigation, OperationalEvent, DrillingParameter,
            WellTrajectory, Well, Reservoir, Formation,
        ]:
            if model is type(None):
                continue
            db.query(model).delete()
        db.commit()
        print("✅ Data cleared.")

    # Skip if already seeded
    existing_well_count = db.query(Well).count()
    if existing_well_count > 0 and not reset:
        print(f"ℹ️  Database already has {existing_well_count} wells. Skipping seed. Use --reset to reseed.")
        return

    print("🌱 Seeding NWIS prototype database...")

    # ── Formations ──────────────────────────────────────────────────────────
    formations_map = {}
    for f_data in FORMATIONS:
        f = Formation(**f_data)
        db.add(f)
        db.flush()
        formations_map[f.name] = f
    print(f"  ✓ {len(formations_map)} formations seeded (F1–F4)")

    # ── Reservoirs ──────────────────────────────────────────────────────────
    reservoirs_map = {}
    for r_data in RESERVOIRS:
        r = Reservoir(**r_data)
        db.add(r)
        db.flush()
        reservoirs_map[r.name] = r
    print(f"  ✓ {len(reservoirs_map)} reservoirs seeded")

    # ── Wells ────────────────────────────────────────────────────────────────
    wells_map = {}
    for w_data in build_wells(formations_map, reservoirs_map):
        w = Well(**w_data)
        db.add(w)
        db.flush()
        wells_map[w.well_name] = w
    print(f"  ✓ {len(wells_map)} wells seeded: {', '.join(wells_map.keys())}")

    # ── Operational Events + Mitigations ────────────────────────────────────
    events_map = {}  # key: (well_name, event_type, depth) → event object
    event_count = 0
    mitigation_count = 0
    for e_data in build_events(wells_map, formations_map):
        well_name = e_data.pop("well_name")
        mitigations = e_data.pop("mitigations", [])
        well = wells_map[well_name]
        event = OperationalEvent(well_id=well.id, **e_data)
        db.add(event)
        db.flush()

        key = (well_name, event.event_type, event.depth)
        events_map[key] = event
        event_count += 1

        for m_data in mitigations:
            m = EventMitigation(event_id=event.id, **m_data)
            db.add(m)
            mitigation_count += 1

    print(f"  ✓ {event_count} operational events seeded")
    print(f"  ✓ {mitigation_count} event mitigations seeded")

    # ── Documents ────────────────────────────────────────────────────────────
    doc_count = 0
    for d_data in build_documents(wells_map):
        well_name = d_data.pop("well_name")
        well = wells_map[well_name]
        doc = Document(well_id=well.id, status=DocumentStatus.PENDING, **d_data)
        db.add(doc)
        doc_count += 1
    print(f"  ✓ {doc_count} document metadata records seeded (pending OCR)")

    # ── Risk Intervals ───────────────────────────────────────────────────────
    for ri_data in build_risk_intervals(wells_map, formations_map):
        db.add(RiskInterval(**ri_data))
    print(f"  ✓ 3 risk intervals seeded (primary: 3810–3870m MUD_LOSS)")

    # ── Risk Predictions ─────────────────────────────────────────────────────
    for rp_data in build_risk_predictions(wells_map):
        db.add(RiskPrediction(**rp_data))
    print(f"  ✓ 5 synthetic risk predictions seeded for X17")

    # ── Alerts ───────────────────────────────────────────────────────────────
    for a_data in build_alerts(wells_map):
        db.add(Alert(**a_data))
    print(f"  ✓ 2 proactive alerts seeded for X17")

    # ── Recommendations ──────────────────────────────────────────────────────
    for rec_data in build_recommendations(wells_map, events_map):
        source_key = rec_data.pop("source_event_key", None)
        source_event = events_map.get(source_key) if source_key else None
        rec = Recommendation(
            **rec_data,
            source_event_id=source_event.id if source_event else None,
        )
        db.add(rec)
    print(f"  ✓ 3 evidence-backed recommendations seeded for X17")

    # ── Well Trajectories ────────────────────────────────────────────────────
    for t_data in build_trajectories(wells_map):
        db.add(WellTrajectory(**t_data))
    print(f"  ✓ Trajectory points seeded for X17")

    # ── Drilling Parameters ──────────────────────────────────────────────────
    for p_data in build_drilling_parameters(wells_map):
        db.add(DrillingParameter(**p_data))
    print(f"  ✓ Drilling parameters seeded for X17")

    # ── Casing Programs ──────────────────────────────────────────────────────
    for c_data in build_casing_programs(wells_map):
        db.add(CasingProgram(**c_data))
    print(f"  ✓ Casing programs seeded")

    # ── Cementing Records ────────────────────────────────────────────────────
    for cr_data in build_cementing_records(wells_map):
        db.add(CementingRecord(**cr_data))
    print(f"  ✓ Cementing records seeded")

    # ── Mud Programs ─────────────────────────────────────────────────────────
    for mp_data in build_mud_programs(wells_map):
        db.add(MudProgram(**mp_data))
    print(f"  ✓ Mud programs seeded")

    db.commit()
    print("\n✅ NWIS prototype database seeded successfully.")
    print("\n📊 Seed summary:")
    print(f"   Wells:           {db.query(Well).count()}")
    print(f"   Formations:      {db.query(Formation).count()}")
    print(f"   Reservoirs:      {db.query(Reservoir).count()}")
    print(f"   Events:          {db.query(OperationalEvent).count()}")
    print(f"   Mitigations:     {db.query(EventMitigation).count()}")
    print(f"   Documents:       {db.query(Document).count()}")
    print(f"   Risk Intervals:  {db.query(RiskInterval).count()}")
    print(f"   Risk Predictions:{db.query(RiskPrediction).count()}")
    print(f"   Alerts:          {db.query(Alert).count()}")
    print(f"   Recommendations: {db.query(Recommendation).count()}")
    print(f"   Trajectories:    {db.query(WellTrajectory).count()}")
    print(f"   Drilling Params: {db.query(DrillingParameter).count()}")


def main():
    parser = argparse.ArgumentParser(description="NWIS Database Seed Script")
    parser.add_argument("--reset", action="store_true", help="Clear all data and reseed")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        seed(db, reset=args.reset)
    except Exception as e:
        db.rollback()
        print(f"\n❌ Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
