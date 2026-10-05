"""
Alembic Environment Configuration for NWIS
============================================
Reads DATABASE_URL from environment variables — never hardcoded.
Imports all ORM models to enable autogenerate of migrations.
"""

import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# ── Ensure app package is importable ──────────────────────────────────────────
# When running alembic from backend/ directory, this adds backend/ to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

# ── Import all models so autogenerate detects them ────────────────────────────
from app.models.base import Base
from app.models.models import (  # noqa: F401 — import triggers registration
    Formation, Reservoir, Well, WellTrajectory, DrillingParameter,
    OperationalEvent, EventMitigation, CasingProgram, CementingRecord,
    MudProgram, Document, DocumentExtraction, RiskPrediction,
    RiskInterval, Alert, Recommendation,
)

# ── Alembic Config ────────────────────────────────────────────────────────────
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Use the declarative base metadata for autogenerate
target_metadata = Base.metadata

# Inject DATABASE_URL from environment
database_url = os.environ.get("DATABASE_URL")
if not database_url:
    raise RuntimeError(
        "DATABASE_URL environment variable is not set. "
        "Copy backend/.env.example to backend/.env and configure it."
    )
config.set_main_option("sqlalchemy.url", database_url)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode — generates SQL without a live connection."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode — applies to a live database."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
