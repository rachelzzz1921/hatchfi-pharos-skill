#!/usr/bin/env python3
"""Refresh README badge counts from forge test + skill eval + inspector report."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

BADGE_TESTS = re.compile(
    r"\[!\[tests\]\(https://img\.shields\.io/badge/Foundry-[^)]+\)\]\([^)]+\)"
)
BADGE_EVAL = re.compile(
    r"\[!\[eval\]\(https://img\.shields\.io/badge/skill_eval-[^)]+\)\]\([^)]+\)"
)
BADGE_INSPECTOR = re.compile(
    r"\[!\[inspector\]\(https://img\.shields\.io/badge/Skill_Inspector-[^)]+\)\]\([^)]+\)"
)


def forge_test_count() -> int:
    proc = subprocess.run(
        ["forge", "test", "--match-contract", "CompliantRWATokenTest"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    out = proc.stdout + proc.stderr
    match = re.search(r"(\d+) tests? passed", out)
    if match:
        return int(match.group(1))
    raise SystemExit("Could not parse forge test count. Run `forge test` first.")


def eval_counts() -> tuple[int, int]:
    proc = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "run_skill_eval.py"), "--format", "json"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise SystemExit(f"skill eval failed:\n{proc.stderr}")
    data = json.loads(proc.stdout)
    return int(data["passed"]), int(data["total"])


def inspector_badge() -> str:
    report = ROOT / "docs" / "SKILL_SECURITY_REPORT.json"
    if report.exists():
        data = json.loads(report.read_text(encoding="utf-8"))
        score = data.get("score", 0)
        label = data.get("label", "LOW")
        return f"{score}%2F100_{label}"
    return "LOW"


def update_readme(path: Path, tests: int, eval_passed: int, eval_total: int, inspector: str) -> None:
    text = path.read_text(encoding="utf-8")
    text = BADGE_TESTS.sub(
        f"[![tests](https://img.shields.io/badge/Foundry-{tests}_passed-3dd68c?style=flat-square)](./docs/COMPLETED_VALIDATION.md)",
        text,
        count=1,
    )
    text = BADGE_EVAL.sub(
        f"[![eval](https://img.shields.io/badge/skill_eval-{eval_passed}%2F{eval_total}-3dd68c?style=flat-square)](./eval/skill_behavior_cases.json)",
        text,
        count=1,
    )
    text = BADGE_INSPECTOR.sub(
        f"[![inspector](https://img.shields.io/badge/Skill_Inspector-{inspector}-3dd68c?style=flat-square)](./docs/SKILL_SECURITY_REPORT.md)",
        text,
        count=1,
    )
    path.write_text(text, encoding="utf-8")


def main() -> None:
    tests = forge_test_count()
    eval_passed, eval_total = eval_counts()
    inspector = inspector_badge()
    for name in ("README.md", "README.zh.md"):
        path = ROOT / name
        if path.exists():
            update_readme(path, tests, eval_passed, eval_total, inspector)
            print(f"Updated badges in {name}: tests={tests}, eval={eval_passed}/{eval_total}, inspector={inspector}")


if __name__ == "__main__":
    main()
