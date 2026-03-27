import sys
import sqlite3
import os
from pathlib import Path


def _get_base_dir() -> Path:
    """Returns writable base directory: next to .exe (frozen) or project root (dev)."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).parent.parent.parent


DB_PATH = _get_base_dir() / "data" / "prospector.db"


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False, timeout=30, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=30000")
    return conn


def init_db():
    from backend.database.models import create_tables, seed_templates
    conn = get_connection()
    create_tables(conn)
    seed_templates(conn)
    conn.close()
