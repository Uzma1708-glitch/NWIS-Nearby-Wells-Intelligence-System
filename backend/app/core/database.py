"""
NWIS Database Session & Connection Management
==============================================
Provides SQLAlchemy engine, session factory, and FastAPI dependency.
Database URL is read from environment — never hardcoded.

Target Database: PostgreSQL (production / staging)
Dev Override:    SQLite (local development, file in project directory)

Dialect Notes:
- SQLAlchemy 2.1+ defaults to psycopg3 for PostgreSQL.
  We use psycopg2-binary, so plain postgresql:// URLs are normalised
  to postgresql+psycopg2://.
- SQLite URLs (sqlite:///./path.db) are used as-is.
"""

import os
from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from app.core.config import settings


def _normalise_db_url(url: str) -> str:
    """
    Normalise the database URL for the correct SQLAlchemy dialect.
    - postgresql:// / postgres:// → postgresql+psycopg2://
    - sqlite:// → used as-is
    """
    if url.startswith("postgresql://") or url.startswith("postgres://"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1).replace(
            "postgres://", "postgresql+psycopg2://", 1
        )
    return url


_db_url = _normalise_db_url(settings.DATABASE_URL)
_is_sqlite = _db_url.startswith("sqlite")

from sqlalchemy.pool import NullPool

if _is_sqlite:
    # SQLite: use NullPool to prevent connection exhaustion in test suites / dev
    engine = create_engine(
        _db_url,
        connect_args={"check_same_thread": False},
        poolclass=NullPool,
        echo=settings.DEBUG,
    )
else:
    # PostgreSQL (production target)
    engine = create_engine(
        _db_url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        echo=settings.DEBUG,
    )

# ── Session Factory ────────────────────────────────────────────────────────────
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# ── FastAPI Dependency ─────────────────────────────────────────────────────────
def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a database session per request.
    The session is properly closed after the request completes (or fails).
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> bool:
    """
    Attempt a simple connectivity check.
    Returns True if the database is reachable, False otherwise.
    Used by the health endpoint.
    """
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
