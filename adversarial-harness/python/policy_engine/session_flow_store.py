"""Session flow store — in-memory history (Redis optional in production TS port)."""

from __future__ import annotations

import time
from typing import Any

_history: dict[str, list[dict[str, Any]]] = {}
FLOW_WINDOW_MS = 5 * 60 * 1000
MAX_HISTORY = 24


def get_flow_history_sync(session_key: str) -> list[dict[str, Any]]:
    now = time.time() * 1000
    return [e for e in _history.get(session_key, []) if now - e.get("at", 0) <= FLOW_WINDOW_MS][-MAX_HISTORY:]


def append_flow_event_sync(session_key: str, event: dict[str, Any]) -> None:
    event.setdefault("at", time.time() * 1000)
    hist = _history.setdefault(session_key, [])
    hist.append(event)
    if len(hist) > MAX_HISTORY:
        del hist[: len(hist) - MAX_HISTORY]


def record_sensitive_response_access(session_key: str, tool_name: str) -> None:
    append_flow_event_sync(
        session_key,
        {"toolName": tool_name, "sensitiveRead": True, "dataAccess": True, "at": time.time() * 1000},
    )


def reset_session_flow_store() -> None:
    _history.clear()

reset_session_flow_history = reset_session_flow_store
