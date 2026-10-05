"""
NWIS Domain Enumerations
=========================
All PostgreSQL-native ENUMs used across the NWIS domain models.
Centralised here so they can be reused in schemas and service logic.
"""

import enum


# ── Well Status ───────────────────────────────────────────────────────────────
class WellStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    SUSPENDED = "SUSPENDED"
    ABANDONED = "ABANDONED"
    PLANNED = "PLANNED"


# ── Operational Event Types ───────────────────────────────────────────────────
class EventType(str, enum.Enum):
    MUD_LOSS = "MUD_LOSS"
    KICK = "KICK"
    STUCK_PIPE = "STUCK_PIPE"
    TORQUE_SPIKE = "TORQUE_SPIKE"
    OVERPRESSURE = "OVERPRESSURE"
    FISHING = "FISHING"
    NPT = "NPT"
    CEMENTING_ISSUE = "CEMENTING_ISSUE"
    OTHER = "OTHER"


# ── Event Severity ────────────────────────────────────────────────────────────
class Severity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


# ── Risk Types ────────────────────────────────────────────────────────────────
class RiskType(str, enum.Enum):
    MUD_LOSS = "MUD_LOSS"
    STUCK_PIPE = "STUCK_PIPE"
    OVERPRESSURE = "OVERPRESSURE"
    TORQUE_SPIKE = "TORQUE_SPIKE"
    CEMENTING_ISSUE = "CEMENTING_ISSUE"
    KICK = "KICK"
    OTHER = "OTHER"


# ── Alert Status ──────────────────────────────────────────────────────────────
class AlertStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"


# ── Document Types ────────────────────────────────────────────────────────────
class DocumentType(str, enum.Enum):
    WCR = "WCR"                        # Well Completion Report
    DDR = "DDR"                        # Daily Drilling Report
    DRILLING_REPORT = "DRILLING_REPORT"
    MUD_LOG = "MUD_LOG"
    OTHER = "OTHER"


# ── Document Processing Status ────────────────────────────────────────────────
class DocumentStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"


# ── Extraction Review Status ──────────────────────────────────────────────────
class ExtractionReviewStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"


# ── Mitigation Success Indicator ─────────────────────────────────────────────
class SuccessIndicator(str, enum.Enum):
    SUCCESS = "SUCCESS"
    PARTIAL = "PARTIAL"
    FAILURE = "FAILURE"
    UNKNOWN = "UNKNOWN"
