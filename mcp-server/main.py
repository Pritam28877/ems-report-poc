"""
Ambulance Medical Report CMS — FastMCP Server
Exposes MCP-compliant tools for form generation and report management.
Shares the SQLite database with the Node.js backend (port 4000).
Transport: Streamable HTTP on port 8000 (MCP-native, compatible with
Claude Desktop, Cursor, and hospital EMR integrations via MCP protocol).
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from fastmcp import FastMCP

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------

load_dotenv(dotenv_path=Path(__file__).parent / ".env")

PORT = int(os.getenv("PORT", "8000"))
HOST = os.getenv("HOST", "0.0.0.0")

# ---------------------------------------------------------------------------
# FastMCP application
# ---------------------------------------------------------------------------

mcp = FastMCP(
    name="Ambulance Medical Report CMS",
    instructions=(
        "You are an MCP server for an ambulance medical report CMS. "
        "Use the available tools to detect incident types from paramedic "
        "transcripts, generate pre-filled form fields, validate report data, "
        "and manage reports in the database."
    ),
)

# ---------------------------------------------------------------------------
# Register tools — import here so db/client singleton is initialised once
# ---------------------------------------------------------------------------

from tools.form_tools import (  # noqa: E402
    detect_incident_type,
    generate_form_fields,
    get_template,
)
from tools.report_tools import (  # noqa: E402
    create_report,
    get_report,
    list_reports,
    validate_report,
)

mcp.tool()(get_template)
mcp.tool()(detect_incident_type)
mcp.tool()(generate_form_fields)
mcp.tool()(validate_report)
mcp.tool()(create_report)
mcp.tool()(get_report)
mcp.tool()(list_reports)

# ---------------------------------------------------------------------------
# Startup logging
# ---------------------------------------------------------------------------

_REGISTERED_TOOLS = [
    "get_template",
    "detect_incident_type",
    "generate_form_fields",
    "validate_report",
    "create_report",
    "get_report",
    "list_reports",
]


def _log_startup() -> None:
    separator = "=" * 60
    print(separator)
    print("  Ambulance Medical Report CMS — FastMCP Server")
    print(separator)
    print(f"  Transport : Streamable HTTP")
    print(f"  Host      : {HOST}")
    print(f"  Port      : {PORT}")
    print(f"  MCP Path  : /mcp")
    print(f"  Tools ({len(_REGISTERED_TOOLS)}):")
    for tool in _REGISTERED_TOOLS:
        print(f"    - {tool}")
    print(separator)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    _log_startup()
    mcp.run(
        transport="streamable-http",
        host=HOST,
        port=PORT,
    )
