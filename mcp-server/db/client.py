"""
SQLite client for the MCP server.
Shares the database file with the Node.js backend.
Uses WAL mode for safe concurrent access.
"""

import os
import sqlite3
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

_connection: sqlite3.Connection | None = None


def _resolve_db_path() -> Path:
    raw = os.getenv("DB_PATH", "../backend/data/reports.db")
    # Resolve relative to mcp-server/ directory (parent of db/)
    base = Path(__file__).parent.parent
    resolved = (base / raw).resolve()
    return resolved


def get_db() -> sqlite3.Connection:
    """
    Return a singleton SQLite connection with WAL mode enabled.
    Creates the database directory if it does not exist yet.
    Raises RuntimeError if the connection cannot be established.
    """
    global _connection

    if _connection is not None:
        # Verify the connection is still alive
        try:
            _connection.execute("SELECT 1")
            return _connection
        except sqlite3.ProgrammingError:
            _connection = None

    db_path = _resolve_db_path()

    # Create parent directories if they don't exist (Node backend may not have
    # initialised yet when MCP server starts)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        conn = sqlite3.connect(
            str(db_path),
            check_same_thread=False,
            timeout=5.0,
        )
        conn.row_factory = sqlite3.Row

        # WAL mode pragmas — must be set before any DML
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA busy_timeout=5000")
        conn.execute("PRAGMA foreign_keys=ON")
        conn.commit()

        _connection = conn
        return _connection

    except sqlite3.Error as exc:
        raise RuntimeError(
            f"Failed to open SQLite database at {db_path}: {exc}"
        ) from exc


def close_db() -> None:
    """Close the singleton connection if open."""
    global _connection
    if _connection is not None:
        try:
            _connection.close()
        finally:
            _connection = None
