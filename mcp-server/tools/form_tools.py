"""
Form-related MCP tools for the ambulance medical report CMS.

Tools:
  - get_template         → fetch a form template by incident type
  - detect_incident_type → classify a paramedic transcript
  - generate_form_fields → pre-fill form fields from a transcript
"""

import json
import re
import sqlite3
from typing import Any

from db.client import get_db

# ---------------------------------------------------------------------------
# Keyword maps for incident classification
# ---------------------------------------------------------------------------

INCIDENT_KEYWORDS: dict[str, list[str]] = {
    "cardiac": [
        "chest pain",
        "palpitations",
        "cardiac",
        "heart attack",
        "ecg",
        "rhythm",
        "stemi",
        "defibrillation",
        "cpr",
        "shortness of breath with cardiac history",
        "syncope",
    ],
    "trauma": [
        "mva",
        "car accident",
        "fall",
        "injury",
        "fracture",
        "laceration",
        "bleeding",
        "trauma",
        "penetrating",
        "stab",
        "gsw",
        "gunshot",
    ],
    "respiratory": [
        "breathing difficulty",
        "asthma",
        "copd",
        "wheezing",
        "dyspnea",
        "respiratory",
        "oxygen",
        "spo2",
        "nebulizer",
        "stridor",
    ],
}

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    return dict(row)


def _parse_fields(fields_json: str | None) -> list[dict[str, Any]]:
    if not fields_json:
        return []
    try:
        parsed = json.loads(fields_json)
        return parsed if isinstance(parsed, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


def _fetch_template(
    db: sqlite3.Connection, incident_type: str
) -> dict[str, Any] | None:
    cursor = db.execute(
        "SELECT * FROM form_templates WHERE incident_type = ? LIMIT 1",
        (incident_type,),
    )
    row = cursor.fetchone()
    if row is None:
        return None
    data = _row_to_dict(row)
    data["fields"] = _parse_fields(data.get("fields"))
    return data


def _extract_vitals(transcript: str) -> dict[str, Any]:
    """
    Run regex patterns over a paramedic transcript and return a dict of
    extracted values.  Each value is a tuple of (extracted_value, confidence).
    """
    text = transcript  # keep original case for some patterns
    lower = transcript.lower()

    results: dict[str, tuple[str, float]] = {}

    # Patient name — "patient is John Doe" / "name is Jane Smith"
    m = re.search(
        r"(?:patient\s+is|name\s+is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)",
        transcript,
        re.IGNORECASE,
    )
    if m:
        results["patient_name"] = (m.group(1).strip(), 0.85)

    # Age — "42 year old" / "42-year-old"
    m = re.search(r"(\d{1,3})[- ]year[- ]old", lower)
    if m:
        results["age"] = (m.group(1), 0.95)

    # Gender
    gender_map = {
        "female": "female",
        "woman": "female",
        "male": "male",
        "man": "male",
    }
    for word, gender in gender_map.items():
        if re.search(rf"\b{word}\b", lower):
            results["gender"] = (gender, 0.9)
            break

    # Blood pressure — "blood pressure 120/80" / "BP 120 over 80"
    m = re.search(
        r"(?:blood\s+pressure|bp)\s+(\d{2,3})\s*[/over\s]+\s*(\d{2,3})",
        lower,
    )
    if m:
        results["blood_pressure"] = (f"{m.group(1)}/{m.group(2)}", 0.95)

    # Heart rate — "heart rate 72" / "pulse 72" / "72 bpm"
    m = re.search(r"(?:heart\s+rate|pulse)\s+(\d{2,3})", lower)
    if not m:
        m = re.search(r"(\d{2,3})\s+bpm", lower)
    if m:
        results["heart_rate"] = (m.group(1), 0.9)

    # SpO2 — "SpO2 98" / "oxygen sat 98" / "98 percent"
    m = re.search(r"(?:spo2|oxygen\s+sat(?:uration)?)\s+(\d{2,3})", lower)
    if not m:
        m = re.search(r"(\d{2,3})\s*(?:%|percent)", lower)
    if m:
        val = int(m.group(1))
        if 50 <= val <= 100:  # sanity check — must be a percentage
            results["spo2"] = (str(val), 0.9)

    # Location — "at 123 Main Street" / "on Oak Avenue"
    m = re.search(
        r"(?:at|on)\s+(\d+\s+[A-Z][a-zA-Z\s]+(?:Street|St|Avenue|Ave|Road|Rd|"
        r"Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct)(?:\s*,\s*[A-Za-z\s]+)?)",
        text,
        re.IGNORECASE,
    )
    if m:
        results["location"] = (m.group(1).strip(), 0.8)

    # Paramedic name — "paramedic Smith" / "medic Jones" / "this is Martinez"
    m = re.search(
        r"(?:paramedic|medic|this\s+is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
        transcript,
        re.IGNORECASE,
    )
    if m:
        results["paramedic_name"] = (m.group(1).strip(), 0.85)

    return results  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# MCP Tools
# ---------------------------------------------------------------------------


def get_template(incident_type: str) -> dict[str, Any]:
    """
    Retrieve a form template for the given incident type from the database.

    Looks up the form_templates table by incident_type (trauma, cardiac,
    respiratory, general). Falls back to the 'general' template when the
    requested type is not found.

    Returns a dict with keys: id, name, incident_type, fields (list of field
    objects). Raises ValueError if no template exists at all.
    """
    db = get_db()

    template = _fetch_template(db, incident_type)

    if template is None and incident_type != "general":
        template = _fetch_template(db, "general")

    if template is None:
        raise ValueError(
            f"No form template found for incident_type='{incident_type}' "
            "and no 'general' fallback template exists in the database."
        )

    return template


def detect_incident_type(transcript: str) -> dict[str, Any]:
    """
    Analyse a paramedic transcript and detect the most likely incident type.

    Scans the transcript for medical keywords associated with cardiac, trauma,
    and respiratory categories. Returns the category with the highest keyword
    hit count. Ties are broken by category priority (cardiac > trauma >
    respiratory). Falls back to 'general' when no keywords match.

    Returns a dict with keys:
      - incident_type (str): detected category
      - confidence (float): 0.0–1.0 based on keyword density
      - keyword_matches (list[str]): keywords found in the transcript
    """
    if not transcript or not transcript.strip():
        return {
            "incident_type": "general",
            "confidence": 0.0,
            "keyword_matches": [],
        }

    lower = transcript.lower()
    scores: dict[str, list[str]] = {cat: [] for cat in INCIDENT_KEYWORDS}

    for category, keywords in INCIDENT_KEYWORDS.items():
        for kw in keywords:
            if kw in lower:
                scores[category].append(kw)

    total_matches = sum(len(v) for v in scores.values())

    if total_matches == 0:
        return {
            "incident_type": "general",
            "confidence": 0.0,
            "keyword_matches": [],
        }

    # Pick category with most matches; priority order breaks ties
    priority = ["cardiac", "trauma", "respiratory"]
    best_cat = max(priority, key=lambda c: len(scores[c]))
    best_matches = scores[best_cat]

    # Confidence: ratio of matched keywords vs total keywords in that category
    max_possible = len(INCIDENT_KEYWORDS[best_cat])
    confidence = round(min(len(best_matches) / max_possible, 1.0), 3)

    all_matches = [kw for lst in scores.values() for kw in lst]

    return {
        "incident_type": best_cat,
        "confidence": confidence,
        "keyword_matches": all_matches,
    }


def generate_form_fields(
    transcript: str, incident_type: str
) -> dict[str, Any]:
    """
    Pre-fill form fields by extracting values from a paramedic transcript.

    Fetches the template for the given incident_type, then uses regex-based
    extraction to attempt to fill each field with data found in the transcript.
    Fields that could not be extracted are returned with value=null and
    ai_filled=false. Extracted fields include an ai_confidence score.

    Returns a dict with key 'fields': a list of field objects enriched with:
      - value: extracted value or null
      - ai_filled (bool): whether the AI populated this field
      - ai_confidence (float): confidence of the extraction (0.0–1.0)
    """
    # Fetch template to know which fields exist
    template = get_template(incident_type)
    template_fields: list[dict[str, Any]] = template.get("fields", [])

    # Extract vitals/demographics from transcript
    extracted = _extract_vitals(transcript)

    # Canonical key aliases — map template field keys to extraction keys
    KEY_ALIASES: dict[str, list[str]] = {
        "patient_name": ["patient_name", "name"],
        "age": ["age"],
        "gender": ["gender", "sex"],
        "blood_pressure": ["blood_pressure", "bp"],
        "heart_rate": ["heart_rate", "hr", "pulse"],
        "spo2": ["spo2", "oxygen_saturation", "o2_sat"],
        "location": ["location", "address"],
        "paramedic_name": ["paramedic_name", "paramedic", "medic"],
    }

    def _lookup(field_key: str) -> tuple[str, float] | None:
        """Find an extracted value for a template field key."""
        fk = field_key.lower().replace(" ", "_").replace("-", "_")
        # Direct hit
        if fk in extracted:
            return extracted[fk]
        # Alias lookup
        for canonical, aliases in KEY_ALIASES.items():
            if fk in aliases or fk == canonical:
                if canonical in extracted:
                    return extracted[canonical]
        return None

    enriched: list[dict[str, Any]] = []
    for field in template_fields:
        field_copy = dict(field)
        field_key = field_copy.get("key") or field_copy.get("name") or ""

        match = _lookup(field_key)
        if match is not None:
            field_copy["value"] = match[0]
            field_copy["ai_filled"] = True
            field_copy["ai_confidence"] = match[1]
        else:
            field_copy.setdefault("value", None)
            field_copy["ai_filled"] = False
            field_copy["ai_confidence"] = 0.0

        enriched.append(field_copy)

    return {"fields": enriched}
