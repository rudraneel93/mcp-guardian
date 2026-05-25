"""Walk string leaves in nested arguments (mirrors arg-leaf-walker.ts)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterator


@dataclass
class StringLeaf:
    path: str
    value: str


def walk_string_leaves(obj: Any, path: str = "") -> Iterator[StringLeaf]:
    if isinstance(obj, str):
        yield StringLeaf(path or "$", obj)
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            p = f"{path}[{i}]" if path else f"[{i}]"
            yield from walk_string_leaves(item, p)
    elif isinstance(obj, dict):
        for key, val in obj.items():
            p = f"{path}.{key}" if path else str(key)
            yield from walk_string_leaves(val, p)
