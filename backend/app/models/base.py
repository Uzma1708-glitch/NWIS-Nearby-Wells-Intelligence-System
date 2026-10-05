"""
NWIS SQLAlchemy Declarative Base
==================================
All ORM models inherit from this base.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Shared declarative base for all NWIS ORM models."""
    pass
