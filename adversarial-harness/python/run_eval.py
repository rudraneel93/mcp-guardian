#!/usr/bin/env python3
"""Evaluate corpus + custom adversarial fixtures against Python PolicyEngine."""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path

from policy_engine import PolicyEngine
from policy_engine.types import CallContext

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
CORPUS = REPO / "corpus"
CUSTOM = ROOT / "fixtures" / "custom-attacks"
REPORT = ROOT / "reports" / "python-eval.json"


@dataclass
class CorpusEntry:
    tool_name: str
    arguments: dict
    expected: str
    category: str
    rule_hint: str | None = None


def load_fixtures(dir_path: Path, rel_base: Path | None = None) -> list[tuple[str, CorpusEntry]]:
    out: list[tuple[str, CorpusEntry]] = []
    if not dir_path.exists():
        return out
    base = rel_base or dir_path
    for path in sorted(dir_path.rglob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        rel = str(path.relative_to(base))
        out.append(
            (
                rel,
                CorpusEntry(
                    tool_name=data["toolName"],
                    arguments=data.get("arguments") or {},
                    expected=data["expected"],
                    category=data.get("category", "unknown"),
                    rule_hint=data.get("ruleHint"),
                ),
            )
        )
    return out


def run_eval(suites: list[tuple[str, Path]]) -> dict:
    engine = PolicyEngine.from_default_policy()
    failures: list[str] = []
    tp = fp = tn = fn = 0
    by_cat: dict[str, dict] = {}
    suite_stats: dict[str, dict] = {}

    total = 0
    for suite_name, suite_path in suites:
        rel_base = CORPUS if suite_path == CORPUS else ROOT
        s_tp = s_fp = s_tn = s_fn = 0
        for rel, entry in load_fixtures(suite_path, rel_base):
            total += 1
            session = f"harness:{suite_name}:{rel}"
            dec = engine.evaluate(
                CallContext(
                    server_name="harness",
                    tool_name=entry.tool_name,
                    arguments=entry.arguments,
                    session_id=session,
                ),
            )
            blocked = dec.action == "block"
            expected = entry.expected
            cat = entry.category
            m = by_cat.setdefault(
                cat,
                {"category": cat, "total": 0, "tp": 0, "fp": 0, "tn": 0, "fn": 0, "failures": []},
            )
            m["total"] += 1
            if expected == "block":
                if blocked:
                    tp += 1
                    m["tp"] += 1
                    s_tp += 1
                else:
                    fn += 1
                    m["fn"] += 1
                    s_fn += 1
                    msg = f"MISSED [{suite_name}:{rel}] → {dec.action} ({dec.rule})"
                    failures.append(msg)
                    m["failures"].append(msg)
            else:
                if not blocked:
                    tn += 1
                    m["tn"] += 1
                    s_tn += 1
                else:
                    fp += 1
                    m["fp"] += 1
                    s_fp += 1
                    msg = f"FALSE POS [{suite_name}:{rel}] rule={dec.rule} {dec.reason}"
                    failures.append(msg)
                    m["failures"].append(msg)

        suite_total = s_tp + s_fp + s_tn + s_fn
        suite_stats[suite_name] = {
            "total": suite_total,
            "tp": s_tp,
            "fp": s_fp,
            "tn": s_tn,
            "fn": s_fn,
            "passed": s_fn == 0 and s_fp == 0,
        }

    precision = tp / (tp + fp) if (tp + fp) else 0
    recall = tp / (tp + fn) if (tp + fn) else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0

    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "engine": "python",
        "policy": str(REPO / "default-policy.yaml"),
        "totalEntries": total,
        "overall": {"tp": tp, "fp": fp, "tn": tn, "fn": fn, "precision": precision, "recall": recall, "f1": f1},
        "byCategory": sorted(by_cat.values(), key=lambda x: x["category"]),
        "suites": suite_stats,
        "failures": failures,
        "passed": fn == 0 and fp == 0,
        "corpusPassed": suite_stats.get("corpus", {}).get("passed", False),
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def main() -> int:
    suites = [
        ("corpus", CORPUS),
        ("custom-adversarial", CUSTOM),
    ]
    report = run_eval(suites)
    print(json.dumps({"passed": report["passed"], "total": report["totalEntries"], "f1": report["overall"]["f1"]}, indent=2))
    if report["failures"]:
        print("\n".join(report["failures"][:30]))
    # Corpus must be perfect; custom adversarial suite reported but optional for CI gate
    return 0 if report.get("corpusPassed", report["passed"]) else 1


if __name__ == "__main__":
    sys.exit(main())
