"""
NWIS Core Domain Models
========================
SQLAlchemy ORM models representing the complete NWIS knowledge domain.

Model hierarchy / relationships:
  Formation / Reservoir  (reference entities)
  Well                   (core entity — everything links to Well)
  WellTrajectory         (geospatial trajectory points)
  DrillingParameter      (time-series drilling data)
  OperationalEvent       (historical well events)
  EventMitigation        (how events were resolved)
  CasingProgram          (casing design records)
  CementingRecord        (cementing operations)
  MudProgram             (mud engineering records)
  Document               (historical source documents)
  DocumentExtraction     (NLP/OCR extracted data — Phase 7 ready)
  RiskPrediction         (AI-generated risk scores — Phase 5 ready)
  RiskInterval           (depth-based risk zones — Phase 5 & 6 ready)
  Alert                  (proactive alerts — Phase 6 ready)
  Recommendation         (evidence-backed actions — Phase 6 ready)
"""

import enum
from datetime import datetime, date
from typing import Optional, List

from sqlalchemy import (
    Column, Integer, String, Float, Text, Boolean, DateTime,
    Date, ForeignKey, Enum as SAEnum, UniqueConstraint, Index,
    Numeric, func,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.models.base import Base
from app.models.enums import (
    WellStatus, EventType, Severity, RiskType, AlertStatus,
    DocumentType, DocumentStatus, ExtractionReviewStatus, SuccessIndicator,
)


# ─────────────────────────────────────────────────────────────────────────────
# FORMATION
# ─────────────────────────────────────────────────────────────────────────────

class Formation(Base):
    """
    Synthetic prototype formation reference entity.
    F1–F4 are prototype formations — NOT real geological formations.
    Reusable across wells and risk intervals.
    """
    __tablename__ = "formations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    top_depth: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Typical top depth (m)")
    base_depth: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Typical base depth (m)")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    wells: Mapped[List["Well"]] = relationship("Well", back_populates="formation")
    events: Mapped[List["OperationalEvent"]] = relationship("OperationalEvent", back_populates="formation")
    risk_intervals: Mapped[List["RiskInterval"]] = relationship("RiskInterval", back_populates="formation")

    def __repr__(self) -> str:
        return f"<Formation(id={self.id}, name='{self.name}')>"


# ─────────────────────────────────────────────────────────────────────────────
# RESERVOIR
# ─────────────────────────────────────────────────────────────────────────────

class Reservoir(Base):
    """
    Reservoir reference entity.
    Supports future reservoir correlation, risk relevance, and well comparison.
    """
    __tablename__ = "reservoirs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    wells: Mapped[List["Well"]] = relationship("Well", back_populates="reservoir")

    def __repr__(self) -> str:
        return f"<Reservoir(id={self.id}, name='{self.name}')>"


# ─────────────────────────────────────────────────────────────────────────────
# WELL
# ─────────────────────────────────────────────────────────────────────────────

class Well(Base):
    """
    Core NWIS entity. Every module links back to a well.
    Supports geospatial location (lat/lon) for future map functionality.
    current_depth tracks live drilling state; total_depth is the target.
    """
    __tablename__ = "wells"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    well_name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    status: Mapped[WellStatus] = mapped_column(
        SAEnum(WellStatus, name="well_status"), nullable=False, default=WellStatus.ACTIVE
    )

    # Geospatial — supports future map layer
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Depth tracking
    total_depth: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Target TD (m)")
    current_depth: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Current drilling depth (m)")

    # Formation & Reservoir FK — primary formation at current depth
    formation_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("formations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    reservoir_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("reservoirs.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Drilling schedule
    spud_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    completion_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Metadata
    operator: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    field: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    formation: Mapped[Optional["Formation"]] = relationship("Formation", back_populates="wells")
    reservoir: Mapped[Optional["Reservoir"]] = relationship("Reservoir", back_populates="wells")
    trajectories: Mapped[List["WellTrajectory"]] = relationship(
        "WellTrajectory", back_populates="well", cascade="all, delete-orphan"
    )
    drilling_parameters: Mapped[List["DrillingParameter"]] = relationship(
        "DrillingParameter", back_populates="well", cascade="all, delete-orphan"
    )
    events: Mapped[List["OperationalEvent"]] = relationship(
        "OperationalEvent", back_populates="well", cascade="all, delete-orphan"
    )
    casing_programs: Mapped[List["CasingProgram"]] = relationship(
        "CasingProgram", back_populates="well", cascade="all, delete-orphan"
    )
    cementing_records: Mapped[List["CementingRecord"]] = relationship(
        "CementingRecord", back_populates="well", cascade="all, delete-orphan"
    )
    mud_programs: Mapped[List["MudProgram"]] = relationship(
        "MudProgram", back_populates="well", cascade="all, delete-orphan"
    )
    documents: Mapped[List["Document"]] = relationship(
        "Document", back_populates="well", cascade="all, delete-orphan"
    )
    risk_predictions: Mapped[List["RiskPrediction"]] = relationship(
        "RiskPrediction", back_populates="well", cascade="all, delete-orphan"
    )
    risk_intervals: Mapped[List["RiskInterval"]] = relationship(
        "RiskInterval", back_populates="well", cascade="all, delete-orphan"
    )
    alerts: Mapped[List["Alert"]] = relationship(
        "Alert", back_populates="well", cascade="all, delete-orphan"
    )
    recommendations: Mapped[List["Recommendation"]] = relationship(
        "Recommendation", back_populates="well", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Well(id={self.id}, name='{self.well_name}', status={self.status})>"


# ─────────────────────────────────────────────────────────────────────────────
# WELL TRAJECTORY
# ─────────────────────────────────────────────────────────────────────────────

class WellTrajectory(Base):
    """
    Individual trajectory survey points for a well.
    Supports future directional drilling visualisation and map path rendering.
    Well stores surface coordinates; WellTrajectory stores the directional path.
    """
    __tablename__ = "well_trajectories"
    __table_args__ = (
        Index("ix_traj_well_depth", "well_id", "measured_depth"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    well_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("wells.id", ondelete="CASCADE"), nullable=False, index=True
    )
    measured_depth: Mapped[float] = mapped_column(Float, nullable=False, comment="MD (m)")
    inclination: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Degrees from vertical")
    azimuth: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Degrees from North")
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    true_vertical_depth: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="TVD (m)")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # ── Relationships ──────────────────────────────────────────────────────────
    well: Mapped["Well"] = relationship("Well", back_populates="trajectories")

    def __repr__(self) -> str:
        return f"<WellTrajectory(well_id={self.well_id}, md={self.measured_depth}m)>"


# ─────────────────────────────────────────────────────────────────────────────
# DRILLING PARAMETER
# ─────────────────────────────────────────────────────────────────────────────

class DrillingParameter(Base):
    """
    Time-series drilling parameters per well at a given depth/timestamp.
    Critical for future correlation, live drilling simulation, and risk analysis.
    """
    __tablename__ = "drilling_parameters"
    __table_args__ = (
        Index("ix_dp_well_depth", "well_id", "depth"),
        Index("ix_dp_well_ts", "well_id", "timestamp"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    well_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("wells.id", ondelete="CASCADE"), nullable=False, index=True
    )
    timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    depth: Mapped[float] = mapped_column(Float, nullable=False, comment="Depth (m) at measurement")

    # Core drilling parameters
    rop: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Rate of Penetration (m/hr)")
    wob: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Weight on Bit (klbs)")
    rpm: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Rotations per minute")
    torque: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Surface torque (kNm)")
    ecd: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Equivalent Circulating Density (sg)")
    mud_flow: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Mud flow rate (lpm)")
    spp: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Standpipe pressure (psi)")
    hookload: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Hookload (klbs)")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # ── Relationships ──────────────────────────────────────────────────────────
    well: Mapped["Well"] = relationship("Well", back_populates="drilling_parameters")

    def __repr__(self) -> str:
        return f"<DrillingParameter(well_id={self.well_id}, depth={self.depth}m)>"


# ─────────────────────────────────────────────────────────────────────────────
# OPERATIONAL EVENT
# ─────────────────────────────────────────────────────────────────────────────

class OperationalEvent(Base):
    """
    Historical drilling events — the heart of the NWIS knowledge repository.
    Future Correlation, Risk Intelligence, Copilot and Recommendations all
    trace back to these structured event records.
    """
    __tablename__ = "operational_events"
    __table_args__ = (
        Index("ix_event_well_type", "well_id", "event_type"),
        Index("ix_event_depth", "well_id", "depth"),
        Index("ix_event_formation", "formation_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    well_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("wells.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type: Mapped[EventType] = mapped_column(
        SAEnum(EventType, name="event_type"), nullable=False, index=True
    )

    # Depth context
    depth: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Point depth (m)")
    start_depth: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Interval start (m)")
    end_depth: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Interval end (m)")

    # Geological context
    formation_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("formations.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Classification
    severity: Mapped[Optional[Severity]] = mapped_column(
        SAEnum(Severity, name="severity"), nullable=True
    )

    # Narrative
    cause: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    outcome: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    npt_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Non-productive time (hours)")

    # Timestamps
    event_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    well: Mapped["Well"] = relationship("Well", back_populates="events")
    formation: Mapped[Optional["Formation"]] = relationship("Formation", back_populates="events")
    mitigations: Mapped[List["EventMitigation"]] = relationship(
        "EventMitigation", back_populates="event", cascade="all, delete-orphan"
    )
    recommendations: Mapped[List["Recommendation"]] = relationship(
        "Recommendation", back_populates="source_event"
    )

    def __repr__(self) -> str:
        return f"<OperationalEvent(id={self.id}, well_id={self.well_id}, type={self.event_type}, depth={self.depth}m)>"


# ─────────────────────────────────────────────────────────────────────────────
# EVENT MITIGATION
# ─────────────────────────────────────────────────────────────────────────────

class EventMitigation(Base):
    """
    Actions taken to resolve an OperationalEvent.
    The Recommendation engine queries these records to answer:
    "What worked in comparable situations?"
    """
    __tablename__ = "event_mitigations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    event_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("operational_events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    mitigation: Mapped[str] = mapped_column(Text, nullable=False)
    result: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    success_indicator: Mapped[Optional[SuccessIndicator]] = mapped_column(
        SAEnum(SuccessIndicator, name="success_indicator"), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # ── Relationships ──────────────────────────────────────────────────────────
    event: Mapped["OperationalEvent"] = relationship("OperationalEvent", back_populates="mitigations")

    def __repr__(self) -> str:
        return f"<EventMitigation(id={self.id}, event_id={self.event_id}, success={self.success_indicator})>"


# ─────────────────────────────────────────────────────────────────────────────
# CASING PROGRAM
# ─────────────────────────────────────────────────────────────────────────────

class CasingProgram(Base):
    """
    Casing design records per well.
    Supports future casing program comparison across offset wells.
    """
    __tablename__ = "casing_programs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    well_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("wells.id", ondelete="CASCADE"), nullable=False, index=True
    )
    casing_size: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, comment='e.g. "9-5/8 inch"')
    setting_depth: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Setting depth (m)")
    grade: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, comment='e.g. "L80"')
    weight: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="lb/ft")
    connection: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # ── Relationships ──────────────────────────────────────────────────────────
    well: Mapped["Well"] = relationship("Well", back_populates="casing_programs")

    def __repr__(self) -> str:
        return f"<CasingProgram(id={self.id}, well_id={self.well_id}, size='{self.casing_size}')>"


# ─────────────────────────────────────────────────────────────────────────────
# CEMENTING RECORD
# ─────────────────────────────────────────────────────────────────────────────

class CementingRecord(Base):
    """
    Cementing operation records per well.
    Supports cementing issue risk analysis and historical comparison.
    """
    __tablename__ = "cementing_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    well_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("wells.id", ondelete="CASCADE"), nullable=False, index=True
    )
    depth: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Cement depth (m)")
    cement_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    volume: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Volume (m³)")
    displacement_volume: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Displacement (m³)")
    issue: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    result: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # ── Relationships ──────────────────────────────────────────────────────────
    well: Mapped["Well"] = relationship("Well", back_populates="cementing_records")

    def __repr__(self) -> str:
        return f"<CementingRecord(id={self.id}, well_id={self.well_id}, depth={self.depth}m)>"


# ─────────────────────────────────────────────────────────────────────────────
# MUD PROGRAM
# ─────────────────────────────────────────────────────────────────────────────

class MudProgram(Base):
    """
    Mud engineering records per well at depth intervals.
    Supports mud loss analysis, historical comparison, and risk correlation.
    """
    __tablename__ = "mud_programs"
    __table_args__ = (
        Index("ix_mud_well_depth", "well_id", "depth"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    well_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("wells.id", ondelete="CASCADE"), nullable=False, index=True
    )
    depth: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Depth at measurement (m)")
    mud_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, comment='e.g. "OBM", "WBM"')
    density: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Density (sg)")
    viscosity: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Viscosity (cP)")
    ph: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # ── Relationships ──────────────────────────────────────────────────────────
    well: Mapped["Well"] = relationship("Well", back_populates="mud_programs")

    def __repr__(self) -> str:
        return f"<MudProgram(id={self.id}, well_id={self.well_id}, depth={self.depth}m, type='{self.mud_type}')>"


# ─────────────────────────────────────────────────────────────────────────────
# DOCUMENT
# ─────────────────────────────────────────────────────────────────────────────

class Document(Base):
    """
    Historical source document metadata.
    Represents WCRs, DDRs, Drilling Reports, Mud Logs.
    Actual OCR/NLP processing is Phase 7 — Phase 1 establishes the storage structure.
    """
    __tablename__ = "documents"
    __table_args__ = (
        Index("ix_doc_well_type", "well_id", "document_type"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    well_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("wells.id", ondelete="CASCADE"), nullable=False, index=True
    )
    document_type: Mapped[DocumentType] = mapped_column(
        SAEnum(DocumentType, name="document_type"), nullable=False, index=True
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    source: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, comment="Original source system")
    file_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="Storage path or reference")
    status: Mapped[DocumentStatus] = mapped_column(
        SAEnum(DocumentStatus, name="document_status"),
        nullable=False,
        default=DocumentStatus.PENDING,
    )
    upload_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    well: Mapped["Well"] = relationship("Well", back_populates="documents")
    extractions: Mapped[List["DocumentExtraction"]] = relationship(
        "DocumentExtraction", back_populates="document", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Document(id={self.id}, well_id={self.well_id}, filename='{self.filename}', status={self.status})>"


# ─────────────────────────────────────────────────────────────────────────────
# DOCUMENT EXTRACTION
# ─────────────────────────────────────────────────────────────────────────────

class DocumentExtraction(Base):
    """
    Individual data fields extracted from a Document via NLP/OCR.
    Phase 7 will populate this — Phase 1 establishes the schema.
    review_status allows human-in-the-loop validation.
    """
    __tablename__ = "document_extractions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    document_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    field_name: Mapped[str] = mapped_column(String(255), nullable=False, comment="Extracted field key")
    extracted_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="Extracted field value")
    confidence: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True, comment="Model confidence score 0.0–1.0"
    )
    review_status: Mapped[ExtractionReviewStatus] = mapped_column(
        SAEnum(ExtractionReviewStatus, name="extraction_review_status"),
        nullable=False,
        default=ExtractionReviewStatus.PENDING,
    )
    reviewer_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    document: Mapped["Document"] = relationship("Document", back_populates="extractions")

    def __repr__(self) -> str:
        return f"<DocumentExtraction(id={self.id}, doc_id={self.document_id}, field='{self.field_name}')>"


# ─────────────────────────────────────────────────────────────────────────────
# RISK PREDICTION
# ─────────────────────────────────────────────────────────────────────────────

class RiskPrediction(Base):
    """
    AI-generated risk score for a well at a given depth.
    Phase 5 will populate this via the risk engine.
    explanation field enforces explainability — a core NWIS principle.
    Prototype scores are NOT validated real-world probabilities.
    """
    __tablename__ = "risk_predictions"
    __table_args__ = (
        Index("ix_rp_well_type_depth", "well_id", "risk_type", "depth"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    well_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("wells.id", ondelete="CASCADE"), nullable=False, index=True
    )
    risk_type: Mapped[RiskType] = mapped_column(
        SAEnum(RiskType, name="risk_type"), nullable=False, index=True
    )
    depth: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Depth of prediction (m)")
    score: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True, comment="Risk score 0.0–1.0 (prototype only)"
    )
    confidence: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True, comment="Model confidence 0.0–1.0"
    )
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    model_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # ── Relationships ──────────────────────────────────────────────────────────
    well: Mapped["Well"] = relationship("Well", back_populates="risk_predictions")

    def __repr__(self) -> str:
        return f"<RiskPrediction(id={self.id}, well_id={self.well_id}, type={self.risk_type}, score={self.score})>"


# ─────────────────────────────────────────────────────────────────────────────
# RISK INTERVAL
# ─────────────────────────────────────────────────────────────────────────────

class RiskInterval(Base):
    """
    Depth intervals associated with elevated historical risk.
    The Alert engine compares current_depth against these intervals
    to determine whether a proactive alert should be raised.
    Primary demo interval: 3810m–3870m (synthetic prototype).
    """
    __tablename__ = "risk_intervals"
    __table_args__ = (
        Index("ix_ri_well_type", "well_id", "risk_type"),
        Index("ix_ri_depth_range", "start_depth", "end_depth"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    well_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("wells.id", ondelete="CASCADE"), nullable=False, index=True
    )
    risk_type: Mapped[RiskType] = mapped_column(
        SAEnum(RiskType, name="risk_type"), nullable=False, index=True
    )
    start_depth: Mapped[float] = mapped_column(Float, nullable=False, comment="Interval start (m)")
    end_depth: Mapped[float] = mapped_column(Float, nullable=False, comment="Interval end (m)")
    formation_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("formations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    evidence: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="Summary of supporting events")
    occurrence_count: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, comment="Number of offset wells with this risk in interval"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # ── Relationships ──────────────────────────────────────────────────────────
    well: Mapped["Well"] = relationship("Well", back_populates="risk_intervals")
    formation: Mapped[Optional["Formation"]] = relationship("Formation", back_populates="risk_intervals")

    def __repr__(self) -> str:
        return (
            f"<RiskInterval(id={self.id}, well_id={self.well_id}, "
            f"type={self.risk_type}, {self.start_depth}–{self.end_depth}m)>"
        )


# ─────────────────────────────────────────────────────────────────────────────
# ALERT
# ─────────────────────────────────────────────────────────────────────────────

class Alert(Base):
    """
    Proactive drilling alerts generated by the NWIS alert engine (Phase 6).
    Phase 1 establishes persistent structure and lifecycle status.
    Alerts are well-specific and severity-classified.
    """
    __tablename__ = "alerts"
    __table_args__ = (
        Index("ix_alert_well_status", "well_id", "status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    well_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("wells.id", ondelete="CASCADE"), nullable=False, index=True
    )
    risk_type: Mapped[RiskType] = mapped_column(
        SAEnum(RiskType, name="risk_type"), nullable=False, index=True
    )
    depth: Mapped[Optional[float]] = mapped_column(Float, nullable=True, comment="Depth trigger (m)")
    severity: Mapped[Severity] = mapped_column(
        SAEnum(Severity, name="severity"), nullable=False
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[AlertStatus] = mapped_column(
        SAEnum(AlertStatus, name="alert_status"),
        nullable=False,
        default=AlertStatus.ACTIVE,
    )
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    well: Mapped["Well"] = relationship("Well", back_populates="alerts")

    def __repr__(self) -> str:
        return f"<Alert(id={self.id}, well_id={self.well_id}, type={self.risk_type}, severity={self.severity})>"


# ─────────────────────────────────────────────────────────────────────────────
# RECOMMENDATION
# ─────────────────────────────────────────────────────────────────────────────

class Recommendation(Base):
    """
    Evidence-backed drilling recommendations.
    source_event_id links every recommendation to the historical OperationalEvent
    that provides its evidence — satisfying the NWIS explainability principle.
    """
    __tablename__ = "recommendations"
    __table_args__ = (
        Index("ix_rec_well_risk", "well_id", "risk_type"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    well_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("wells.id", ondelete="CASCADE"), nullable=False, index=True
    )
    risk_type: Mapped[RiskType] = mapped_column(
        SAEnum(RiskType, name="risk_type"), nullable=False, index=True
    )
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)
    evidence: Mapped[Optional[str]] = mapped_column(Text, nullable=True, comment="Narrative evidence summary")
    source_event_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("operational_events.id", ondelete="SET NULL"), nullable=True, index=True
    )
    priority: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, comment="Display priority (lower = higher priority)"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # ── Relationships ──────────────────────────────────────────────────────────
    well: Mapped["Well"] = relationship("Well", back_populates="recommendations")
    source_event: Mapped[Optional["OperationalEvent"]] = relationship(
        "OperationalEvent", back_populates="recommendations"
    )

    def __repr__(self) -> str:
        return f"<Recommendation(id={self.id}, well_id={self.well_id}, type={self.risk_type})>"
