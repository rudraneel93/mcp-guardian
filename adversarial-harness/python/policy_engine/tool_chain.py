"""Cross-tool chain guard — mirrors tool-chain-guard.ts."""

from __future__ import annotations

import re
from typing import Any, Optional

from .arg_walker import walk_string_leaves
from .normalizer import deobfuscate_recursive
from .types import CallContext, PolicyDecision

READ_TOOLS = re.compile(
    r"\b(?:read_file|read|cat|head|tail|less|strings|type|get_file|fetch_file|list_directory|list_dir)\b",
    re.I,
)
SENSITIVE_TARGETS = re.compile(
    r"(?:^|[\s'\"`])(?:/etc/passwd|\.env(?:\.\w+)?|\.ssh/|id_rsa|id_ed25519|\.aws/|credentials|secrets?|serviceaccount/token|terraform\.tfstate|\.kube/config)\b",
    re.I,
)
EXFIL_VERBS = re.compile(
    r"\b(?:curl|wget|fetch|ncat|netcat|post|send|upload|forward|deliver|transmit|ship|emit|exfil(?:trate)?|webhook|callback)\b",
    re.I,
)
CHAIN_CONNECTORS = re.compile(
    r"\b(?:then|after that|afterwards|next|finally|and then|step\s*2)\b",
    re.I,
)

STAGED_CHAIN_RE = re.compile(
    READ_TOOLS.pattern
    + r".{0,120}"
    + SENSITIVE_TARGETS.pattern
    + r".{0,160}"
    + CHAIN_CONNECTORS.pattern
    + r".{0,120}"
    + EXFIL_VERBS.pattern,
    re.I,
)
EXFIL_AFTER_READ_RE = re.compile(
    EXFIL_VERBS.pattern
    + r".{0,80}"
    + SENSITIVE_TARGETS.pattern
    + "|"
    + SENSITIVE_TARGETS.pattern
    + r".{0,120}"
    + EXFIL_VERBS.pattern,
    re.I,
)
STEP_CHAIN_RE = re.compile(
    r"step\s*[12]\s*[:.]?\s*(?:read|cat|get).{0,200}step\s*[23]\s*[:.]?\s*(?:curl|post|send|wget|upload|webhook)",
    re.I,
)
EXECUTE_THEN_CHAIN_RE = re.compile(
    r"\bexecute\b.{0,200}\b(?:then|and then|next|after that|afterwards)\b",
    re.I,
)
BEFORE_INVOKE_CHAIN_RE = re.compile(
    r"\bbefore\s+(?:invoking|calling|using)\s+(?:this\s+)?tool\b",
    re.I,
)
PRIVILEGED_TOOL_INVOKE_RE = re.compile(
    r"\b(?:call|invoke|run)\s+(?:authenticate_admin|elevate_privileges|sudo|admin_access)\b",
    re.I,
)
FIRST_THEN_CHAIN_RE = re.compile(
    r"\bfirst\b.{0,120}\b(?:then|and then|next|afterwards)\b",
    re.I,
)
MUST_INVOKE_RE = re.compile(
    r"\byou\s+must\s+(?:also\s+)?(?:call|invoke|run|execute)\b",
    re.I,
)
THEN_EXECUTE_RE = re.compile(
    r"\b(?:then|and then|next|after that|afterwards)\b.{0,120}\bexecute\b",
    re.I,
)
AFTER_THAT_RUN_RE = re.compile(
    r"\bafter\s+that\s+(?:call|invoke|run|execute)\b",
    re.I,
)
ALWAYS_EXECUTE_RE = re.compile(
    r"\balways\s+(?:call|invoke|run|execute)\b",
    re.I,
)
CALL_READ_EXFIL_RE = re.compile(
    r"\b(?:call|invoke|run)\s+(?:read_file|read)\b.{0,200}\b(?:then|and then|next|after that)\b.{0,160}\b(?:post|send|webhook|curl|wget|upload|exfil)\b",
    re.I,
)
READ_THEN_EXFIL_RE = re.compile(
    READ_TOOLS.pattern
    + r".{0,160}"
    + CHAIN_CONNECTORS.pattern
    + r".{0,160}"
    + EXFIL_VERBS.pattern,
    re.I,
)
PUPPETEER_LOCAL_ADMIN_RE = re.compile(
    r"\bpuppeteer_(?:navigate|screenshot)\b.{0,80}\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0)\b",
    re.I,
)


def evaluate_tool_chain_guard(ctx: CallContext) -> Optional[PolicyDecision]:
    args = ctx.arguments or {}
    blob = "\n".join(
        deobfuscate_recursive(leaf.value) for leaf in walk_string_leaves(args)
    )
    if not blob.strip():
        return None
    if (
        STAGED_CHAIN_RE.search(blob)
        or EXFIL_AFTER_READ_RE.search(blob)
        or STEP_CHAIN_RE.search(blob)
        or EXECUTE_THEN_CHAIN_RE.search(blob)
        or BEFORE_INVOKE_CHAIN_RE.search(blob)
        or PRIVILEGED_TOOL_INVOKE_RE.search(blob)
        or FIRST_THEN_CHAIN_RE.search(blob)
        or MUST_INVOKE_RE.search(blob)
        or THEN_EXECUTE_RE.search(blob)
        or AFTER_THAT_RUN_RE.search(blob)
        or ALWAYS_EXECUTE_RE.search(blob)
        or CALL_READ_EXFIL_RE.search(blob)
        or READ_THEN_EXFIL_RE.search(blob)
        or PUPPETEER_LOCAL_ADMIN_RE.search(blob)
    ):
        return PolicyDecision(
            action="block",
            rule="semantic-tool-chain-guard",
            reason=f"Cross-tool exfiltration chain detected in '{ctx.tool_name}' arguments",
        )
    return None
