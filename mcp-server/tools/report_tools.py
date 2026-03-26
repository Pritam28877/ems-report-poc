"""
Report CRUD MCP tools for the ambulance medical report CMS.

Tools:
  - validate_report → validate form_data against the template schema
  - create_report   → insert a new report into the database
  - get_report      → fetch a full report with fields and timeline
  - list_reports    → list reports with optional filters
"""

import json
import sqlite3
from datetime import datetime, timezone
from typing import Any

from db.client import get_db

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    return dict(row)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_required_field_keys(db: sqlite3.Connection, incident_type: str) -> list[str]:
    """Return the keys of all required fields for an incident_type template."""
    cursor = db.execute(
        "SELECT fields FROM form_templates WHERE incident_type = ? LIMIT 1",
        (incident_type,),
    )
    row = cursor.fetchone()
    if row is None:
        return []

    try:
        fields: list[dict[str, Any]] = json.loads(row["fields"] or "[]")
    except (json.JSONDecodeError, TypeError):
        return []

    return [
        f.get("key") or f.get("name") or ""
        for f in fields
        if f.get("required", False)
        and (f.get("key") or f.get("name"))
    ]


# ---------------------------------------------------------------------------
# MCP Tools
# ---------------------------------------------------------------------------


def validate_report(form_data: dict, incident_type: str) -> dict[str, Any]:
    """
    Validate form_data against the required fields defined in the template.

    Fetches the form template for incident_type from the database and checks
    that every required field has a non-empty value in form_data.

    Returns a dict with:
      - valid (bool): true when all required fields are present and non-empty
      - missing_fields (list[str]): keys of required fields that are absent
      - warnings (list[str]): soft warnings (e.g. optional but recommended fields)
    """
    db = get_db()
    required_keys = _get_required_field_keys(db, incident_type)

    missing: list[str] = []
    for key in required_keys:
        val = form_data.get(key)
        if val is None or str(val).strip() == "":
            missing.append(key)

    warnings: list[str] = []

    # Soft checks — not required, but expected in a quality report
    recommended = ["notes", "chief_complaint", "treatment_given"]
    for rec in recommended:
        if rec not in form_data or not form_data.get(rec):
            if rec not in required_keys:
                warnings.append(
                    f"Field '{rec}' is missing — consider adding it for completeness."
                )

    return {
        "valid": len(missing) == 0,
        "missing_fields": missing,
        "warnings": warnings,
    }


def create_report(
    incident_type: str,
    status: str,
    patient_name: str,
    patient_age: int | None,
    patient_gender: str | None,
    location: str | None,
    paramedic_name: str | None,
    paramedic_id: str | None,
    notes: str | None,
    form_data: dict,
    transcript: str | None = None,
    audio_url: str | None = None,
) -> dict[str, Any]:
    """
    Create a new ambulance medical report in the database.

    Inserts a row into the reports table, saves each form field into
    report_fields (one row per key/value pair), and appends an initial
    timeline entry marking the report as created via MCP.

    form_data must be a flat dict of field_key → field_value.

    Returns a dict with:
      - report_id (int): the auto-assigned primary key
      - status (str): the status value stored
      - created_at (str): ISO-8601 timestamp of creation
    """
    db = get_db()
    now = _now_iso()

    try:
        cursor = db.execute(
            """
            INSERT INTO reports (
                incident_type, status, patient_name, patient_age,
                patient_gender, location, paramedic_name, paramedic_id,
                notes, transcript, audio_url, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                incident_type,
                status,
                patient_name,
                patient_age,
                patient_gender,
                location,
                paramedic_name,
                paramedic_id,
                notes,
                transcript,
                audio_url,
                now,
                now,
            ),
        )
        report_id: int = cursor.lastrowid  # type: ignore[assignment]

        # Insert report_fields rows
        for field_key, field_value in form_data.items():
            db.execute(
                """
                INSERT INTO report_fields (report_id, field_key, field_value, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (report_id, str(field_key), json.dumps(field_value), now),
            )

        # Initial timeline entry
        db.execute(
            """
            INSERT INTO report_timeline (report_id, event, actor, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (report_id, "Report created via MCP", paramedic_name or "MCP Server", now),
        )

        db.commit()

    except sqlite3.Error as exc:
        db.rollback()
        raise RuntimeError(f"Failed to create report: {exc}") from exc

    return {
        "report_id": report_id,
        "status": status,
        "created_at": now,
    }


def get_report(report_id: int) -> dict[str, Any]:
    """
    Fetch a complete report by its primary key.

    Retrieves the core report row, all associated report_fields, and the full
    timeline of events. Returns a single dict with keys:
      - report: core report data
      - fields: list of {field_key, field_value} dicts
      - timeline: list of {event, actor, created_at} dicts

    Raises ValueError when the report does not exist.
    """
    db = get_db()

    cursor = db.execute("SELECT * FROM reports WHERE id = ?", (report_id,))
    report_row = cursor.fetchone()
    if report_row is None:
        raise ValueError(f"Report with id={report_id} not found.")

    report = _row_to_dict(report_row)

    fields_cursor = db.execute(
        "SELECT field_key, field_value, created_at FROM report_fields WHERE report_id = ? ORDER BY rowid",
        (report_id,),
    )
    fields: list[dict[str, Any]] = []
    for row in fields_cursor.fetchall():
        field = _row_to_dict(row)
        # Deserialise JSON-stored values back to Python objects
        try:
            field["field_value"] = json.loads(field["field_value"])
        except (json.JSONDecodeError, TypeError):
            pass
        fields.append(field)

    timeline_cursor = db.execute(
        """
        SELECT event, actor, created_at
        FROM report_timeline
        WHERE report_id = ?
        ORDER BY created_at ASC
        """,
        (report_id,),
    )
    timeline = [_row_to_dict(r) for r in timeline_cursor.fetchall()]

    return {
        "report": report,
        "fields": fields,
        "timeline": timeline,
    }


def list_reports(
    status: str | None = None,
    incident_type: str | None = None,
    limit: int = 20,
) -> dict[str, Any]:
    """
    List report summaries with optional filtering by status and incident_type.

    Both filters are optional; when omitted all reports are included.
    Results are ordered by created_at descending (newest first).
    Maximum rows returned is capped by the limit parameter (default 20).

    Returns a dict with:
      - reports (list): each entry is a summary dict with core report columns
      - total (int): number of reports returned (may be less than real total)
      - filters (dict): the filters that were applied
    """
    db = get_db()

    query = "SELECT * FROM reports WHERE 1=1"
    params: list[Any] = []

    if status is not None and status.strip():
        query += " AND status = ?"
        params.append(status.strip())

    if incident_type is not None and incident_type.strip():
        query += " AND incident_type = ?"
        params.append(incident_type.strip())

    safe_limit = max(1, min(limit, 200))  # cap at 200 rows
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(safe_limit)

    try:
        cursor = db.execute(query, params)
        rows = cursor.fetchall()
    except sqlite3.Error as exc:
        raise RuntimeError(f"Failed to list reports: {exc}") from exc

    reports = [_row_to_dict(r) for r in rows]

    return {
        "reports": reports,
        "total": len(reports),
        "filters": {
            "status": status,
            "incident_type": incident_type,
            "limit": safe_limit,
        },
    }
