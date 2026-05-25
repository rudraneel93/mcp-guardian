"""Language-specific deserialization gadget detection — mirrors language-gadget-guard.ts."""

from __future__ import annotations

import re
from typing import Optional

from .arg_walker import walk_string_leaves
from .normalizer import deobfuscate_recursive
from .types import CallContext, PolicyDecision

GADGET_PATTERNS = [
    re.compile(r"\b(?:pickle\.loads?|cPickle\.loads?|dill\.loads?)\b", re.I),
    re.compile(r"\b__reduce__\b|\bPYCC\b", re.I),
    re.compile(r"\bObjectInputStream\b|\breadObject\s*\(\s*\)", re.I),
    re.compile(r"\bjava\.io\.(?:Serializable|ObjectInputStream)\b", re.I),
    re.compile(r"\b(?:org\.apache\.commons\.collections|ysoserial)", re.I),
    re.compile(r"\b(?:node-serialize|node-serializer)\b", re.I),
    re.compile(r"\bunserialize\s*\(\s*['\"]", re.I),
    re.compile(r"\b__wakeup\b|\b__destruct\b.*\beval\b", re.I),
    re.compile(
        r"\bMarshal\.load\b|\byaml\.unsafe_load\b|\byaml\.load\s*\([^)]*Loader\s*=\s*yaml\.UnsafeLoader",
        re.I,
    ),
    re.compile(r"!!python/object", re.I),
    re.compile(r"\bcos(?:\\n|\s*\n)\s*system(?:\\n|\s*\n)", re.I),
    re.compile(r"\bcos\s+system\s*\(", re.I),
    re.compile(r"<!ENTITY\b|<!DOCTYPE[^>]{0,200}\bENTITY\b", re.I),
    re.compile(r"\bSYSTEM\s+['\"]file://", re.I),
    re.compile(r"\bphp://filter\b", re.I),
    re.compile(r"\bRuntime\.getRuntime\s*\(\s*\)\.exec\b", re.I),
    re.compile(r"\bProcessBuilder\s*\(", re.I),
    re.compile(r"\bScriptEngineManager\b.*\bgetEngineByName\b", re.I),
    re.compile(r"\bBinaryFormatter\b.*\bDeserialize\b", re.I),
    re.compile(r"\bViewState\b.*\bMAC\b", re.I),
    re.compile(r"\br00t\.me\b", re.I),
    re.compile(r"application/x-(?:java-serialized-object|python-serialized)", re.I),
]


def evaluate_language_gadget_guard(ctx: CallContext) -> Optional[PolicyDecision]:
    blob = "\n".join(
        deobfuscate_recursive(leaf.value) for leaf in walk_string_leaves(ctx.arguments or {})
    )
    if not blob.strip():
        return None
    if any(p.search(blob) for p in GADGET_PATTERNS):
        return PolicyDecision(
            "block",
            "semantic-language-gadget",
            "Language-specific deserialization or gadget chain pattern in arguments",
        )
    return None
