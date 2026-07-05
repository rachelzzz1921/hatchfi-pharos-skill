#!/usr/bin/env python3
"""Run deterministic skill quality evals (borrowed from skill-creator eval patterns)."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path

from evidence_hash_lib import asset_fingerprint, canonicalize_evidence, evidence_hash

from contract_surface import external_function_names, parse_contract

ROOT = Path(__file__).resolve().parents[1]
CASES = ROOT / "eval" / "skill_behavior_cases.json"
GOLDEN_HASH = ROOT / "eval" / "evidence_hash_golden.json"


@dataclass
class EvalResult:
    id: str
    passed: bool
    detail: str
    category: str = ""


def should_refuse_issuance(state: dict) -> bool:
    diligence = state.get("diligence") or {}
    if not diligence.get("passed"):
        return True
    if diligence.get("rating") == "RED":
        return True
    for row in diligence.get("evidence") or []:
        if row.get("flag") == "risk":
            return True
    return False


def run_text_case(case: dict) -> EvalResult:
    path = ROOT / case["file"]
    if not path.exists():
        return EvalResult(case["id"], False, f"missing file {case['file']}", case.get("category", ""))

    text = path.read_text(encoding="utf-8").lower()
    missing = [term for term in case.get("must_contain", []) if term.lower() not in text]
    if missing:
        return EvalResult(
            case["id"],
            False,
            f"missing phrases: {', '.join(missing)}",
            case.get("category", ""),
        )
    return EvalResult(case["id"], True, "ok", case.get("category", ""))


def run_logic_cases(cases: list[dict]) -> list[EvalResult]:
    results: list[EvalResult] = []
    for case in cases:
        state = case["state"]
        refused = should_refuse_issuance(state)
        expected = case["expect_refuse_issuance"]
        ok = refused == expected
        detail = f"refuse={refused} expected={expected}"
        results.append(EvalResult(case["id"], ok, detail, "logic_gate"))
    return results


def run_risk_alignment(spec: dict) -> list[EvalResult]:
    surface = parse_contract()
    by_name = {f["name"]: f["risk"] for f in surface["functions"]}
    results: list[EvalResult] = []

    for tier, names in spec.items():
        for name in names:
            actual = by_name.get(name)
            if actual is None:
                results.append(EvalResult(f"risk_{name}", False, "not in contract surface", "risk_align"))
            elif actual != tier:
                results.append(
                    EvalResult(
                        f"risk_{name}",
                        False,
                        f"contract_surface={actual} expected={tier}",
                        "risk_align",
                    )
                )
            else:
                results.append(EvalResult(f"risk_{name}", True, "aligned", "risk_align"))

    skill_md = (ROOT / "SKILL.md").read_text(encoding="utf-8")
    for tier, names in spec.items():
        emoji = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(tier, "")
        for name in names:
            pattern = re.compile(
                rf"{re.escape(name)}.*{emoji}|{emoji}.*{re.escape(name)}",
                re.IGNORECASE,
            )
            if not pattern.search(skill_md):
                results.append(
                    EvalResult(
                        f"skill_index_{name}",
                        False,
                        f"{name} not paired with {emoji} in SKILL.md index",
                        "risk_align",
                    )
                )
            else:
                results.append(EvalResult(f"skill_index_{name}", True, "indexed", "risk_align"))

    return results


def run_spawn_structure() -> list[EvalResult]:
    results: list[EvalResult] = []
    skills_root = ROOT / "skills"
    if not skills_root.exists():
        return [EvalResult("spawn_structure", True, "no spawned skills yet", "spawn")]

    for skill_dir in skills_root.glob("*-asset"):
        required = ["SKILL.md", "PERMISSIONS.md", "meta.json"]
        for name in required:
            path = skill_dir / name
            ok = path.exists()
            results.append(
                EvalResult(
                    f"spawn_{skill_dir.name}_{name}",
                    ok,
                    "present" if ok else "missing",
                    "spawn",
                )
            )
        gen_surface = skill_dir / "references" / f"{skill_dir.name.replace('-asset', '')}-contract-surface.md"
        alt = list(skill_dir.glob("references/*-contract-surface.md"))
        has_surface = gen_surface.exists() or bool(alt)
        results.append(
            EvalResult(
                f"spawn_{skill_dir.name}_contract_surface",
                has_surface,
                "present" if has_surface else "missing contract-surface ref",
                "spawn",
            )
        )
    return results


def run_evidence_hash_golden() -> list[EvalResult]:
    if not GOLDEN_HASH.exists():
        return [EvalResult("evidence_hash_golden", False, "missing golden file", "hash")]
    spec = json.loads(GOLDEN_HASH.read_text(encoding="utf-8"))
    fixture_path = ROOT / spec["fixture_file"]
    if not fixture_path.exists():
        return [EvalResult("evidence_hash_golden", False, "missing fixture", "hash")]

    evidence = json.loads(fixture_path.read_text(encoding="utf-8"))
    results: list[EvalResult] = []

    try:
        digest = evidence_hash(evidence)
        ok = digest.lower() == spec["expected_hash"].lower()
        results.append(
            EvalResult(
                "evidence_hash_golden",
                ok,
                digest if ok else f"got {digest} want {spec['expected_hash']}",
                "hash",
            )
        )
        canon = canonicalize_evidence(evidence)
        results.append(
            EvalResult(
                "evidence_canonical_stable",
                "balance" in canon and canon.index("balance") < canon.index("denylist"),
                "sorted by check asc",
                "hash",
            )
        )
        fp_spec = spec.get("asset_fingerprint") or {}
        if fp_spec.get("expected"):
            fp = asset_fingerprint(
                fp_spec["asset_id"],
                fp_spec["jurisdiction"],
                fp_spec["wrapper_type"],
            )
            ok_fp = fp.lower() == fp_spec["expected"].lower()
            results.append(
                EvalResult(
                    "asset_fingerprint_golden",
                    ok_fp,
                    fp if ok_fp else f"got {fp}",
                    "hash",
                )
            )
    except Exception as exc:  # noqa: BLE001
        results.append(EvalResult("evidence_hash_golden", False, str(exc), "hash"))
    return results


def run_generated_refs() -> EvalResult:
    gen_md = ROOT / "references" / "generated" / "contract-surface.md"
    gen_json = ROOT / "references" / "generated" / "contract-surface.json"
    if not gen_md.exists() or not gen_json.exists():
        return EvalResult("generated_refs", False, "run npm run refs:generate first", "auto_refs")

    surface = parse_contract()
    parsed_count = len(external_function_names(surface))
    data = json.loads(gen_json.read_text(encoding="utf-8"))
    json_count = data["counts"]["functions"]
    if parsed_count != json_count:
        return EvalResult(
            "generated_refs",
            False,
            f"stale json count {json_count} vs parse {parsed_count}",
            "auto_refs",
        )
    return EvalResult("generated_refs", True, f"{parsed_count} functions synced", "auto_refs")


def main() -> None:
    parser = argparse.ArgumentParser(description="Deterministic HatchFi skill eval runner")
    parser.add_argument("--format", choices=["text", "json"], default="text")
    args = parser.parse_args()

    spec = json.loads(CASES.read_text(encoding="utf-8"))
    results: list[EvalResult] = []

    for case in spec.get("cases", []):
        results.append(run_text_case(case))

    results.extend(run_logic_cases(spec.get("logic_cases", [])))
    results.extend(run_evidence_hash_golden())
    results.extend(run_risk_alignment(spec.get("risk_alignment", {})))
    results.extend(run_spawn_structure())
    results.append(run_generated_refs())

    passed = sum(1 for r in results if r.passed)
    total = len(results)
    failed = [r for r in results if not r.passed]

    if args.format == "json":
        payload = {
            "passed": passed,
            "total": total,
            "success_rate": round(passed / total, 4) if total else 0,
            "results": [r.__dict__ for r in results],
        }
        print(json.dumps(payload, indent=2))
    else:
        print(f"Skill eval: {passed}/{total} passed")
        for r in results:
            mark = "PASS" if r.passed else "FAIL"
            print(f"  [{mark}] {r.id}: {r.detail}")
        if failed:
            print("\nFailed:")
            for r in failed:
                print(f"  - {r.id}: {r.detail}")

    sys.exit(0 if not failed else 1)


if __name__ == "__main__":
    main()
