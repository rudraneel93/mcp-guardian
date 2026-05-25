"""Per-session multi-call read-then-exfil chain detection."""

from __future__ import annotations

import json
import re
import time
from typing import Any, Optional

from .path_guard import evaluate_path_guard, extract_path_argument_values
from .types import CallContext, PolicyDecision

try:
    from .session_flow_store import append_flow_event_sync, get_flow_history_sync, record_sensitive_response_access
except ImportError:
    append_flow_event_sync = None  # type: ignore

FLOW_WINDOW_MS = 5 * 60 * 1000

SENSITIVE_READ_TOOLS = frozenset(
    {
        "read_file",
        "read_text_file",
        "read",
        "get_file_contents",
        "cat",
        "head",
        "tail",
        "list_directory",
        "list_files",
    }
)

EXFIL_TOOL_NAMES = frozenset(
    {"http_request", "post_webhook", "send_message", "notify", "upload", "send_email"}
)
NON_EXFIL_TOOLS = SENSITIVE_READ_TOOLS | frozenset(
    {"puppeteer_navigate", "puppeteer_screenshot", "search", "search_files", "query", "echo"}
)
EXFIL_HINT = re.compile(
    r"\b(?:webhook|callback|post|upload|send|forward|notify|http_request|fetch_url|transmit)\b",
    re.I,
)
EXFIL_BODY_HINT = re.compile(
    r"\b(?:previous|prior|last|result|output|response|file\s+contents|data\s+from)\b",
    re.I,
)

_history: dict[str, list[dict[str, Any]]] = {}


def flow_session_key(ctx: CallContext) -> str:
    tenant = ctx.tenant_id or "default"
    sub = "anon"
    if ctx.agent_identity:
        sub = ctx.agent_identity.client_id or ctx.agent_identity.sub or "anon"
    return f"{tenant}:{ctx.server_name}:{sub}"


def _args_sensitive(args: dict[str, Any] | None) -> bool:
    if not args:
        return False
    paths = extract_path_argument_values(args)
    if paths and evaluate_path_guard(paths).block:
        return True
    blob = json.dumps(args, ensure_ascii=False)
    return bool(
        re.search(
            r"\b(?:/etc/passwd|\.env|\.ssh/|id_rsa|credentials|serviceaccount/token|/proc/|/var/log)",
            blob,
            re.I,
        )
    )


def _is_data_access(tool_name: str, args: dict[str, Any] | None) -> bool:
    if tool_name not in SENSITIVE_READ_TOOLS or not args:
        return False
    return bool(extract_path_argument_values(args)) or bool(args)


def _is_exfil_tool(tool_name: str, args: dict[str, Any] | None) -> bool:
    lower = tool_name.lower()
    if lower in NON_EXFIL_TOOLS:
        return False
    if lower in EXFIL_TOOL_NAMES or EXFIL_HINT.search(lower):
        return True
    if not args:
        return False
    blob = json.dumps(args, ensure_ascii=False)
    if EXFIL_HINT.search(blob):
        return True
    return bool(EXFIL_BODY_HINT.search(blob) and re.search(r"https?://", blob, re.I))


def record_session_tool_call(ctx: CallContext) -> None:
    key = flow_session_key(ctx)
    event = {
        "toolName": ctx.tool_name,
        "sensitiveRead": ctx.tool_name in SENSITIVE_READ_TOOLS and _args_sensitive(ctx.arguments),
        "dataAccess": _is_data_access(ctx.tool_name, ctx.arguments),
        "at": time.time() * 1000,
    }
    if append_flow_event_sync:
        append_flow_event_sync(key, event)
        return
    hist = _history.setdefault(key, [])
    hist.append(event)
    if len(hist) > 24:
        del hist[: len(hist) - 24]


def reset_session_flow_history() -> None:
    _history.clear()
    try:
        from .session_flow_store import reset_session_flow_store

        reset_session_flow_store()
    except ImportError:
        pass


def evaluate_session_flow_guard(ctx: CallContext) -> Optional[PolicyDecision]:
    if not _is_exfil_tool(ctx.tool_name, ctx.arguments):
        return None
    key = flow_session_key(ctx)
    now = time.time() * 1000
    if get_flow_history_sync:
        hist = get_flow_history_sync(key)
    else:
        hist = [e for e in _history.get(key, []) if now - e["at"] <= FLOW_WINDOW_MS]
    prior = next((e for e in hist if e.get("sensitiveRead") or e.get("dataAccess")), None)
    if not prior:
        return None
    return PolicyDecision(
        "block",
        "session-flow-exfil-chain",
        f"Multi-call exfil chain: data access via '{prior.get('toolName')}' then exfil '{ctx.tool_name}'",
    )
