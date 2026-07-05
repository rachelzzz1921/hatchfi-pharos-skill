#!/usr/bin/env python3
"""Print diligence gate + canonical evidence hash from state.json (agent-friendly)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from evidence_hash_lib import asset_fingerprint, evidence_hash  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Diligence gate summary + evidence hash")
    parser.add_argument("--state", default="state.json", help="Path to state JSON")
    parser.add_argument("--json", action="store_true", help="Machine-readable output")
    args = parser.parse_args()

    path = Path(args.state)
    if not path.is_file():
        print(f"FAIL: {path} not found", file=sys.stderr)
        sys.exit(1)

    state = json.loads(path.read_text(encoding="utf-8"))
    diligence = state.get("diligence", {})
    rating = diligence.get("rating", "UNCHECKED")
    passed = bool(diligence.get("passed"))
    evidence = diligence.get("evidence") or []
    risk_flags = [e.get("check") for e in evidence if e.get("flag") == "risk"]

    refuse = not passed or rating == "RED" or bool(risk_flags)
    h = evidence_hash(evidence) if evidence else ""

    bg = diligence.get("background") or {}
    asset = state.get("asset") or {}
    aid = bg.get("asset_id") or asset.get("symbol", "")
    jur = bg.get("jurisdiction", "")
    wrap = bg.get("wrapper_type", "")
    fp = asset_fingerprint(aid, jur, wrap) if aid and jur and wrap else ""

    payload = {
        "passed": passed,
        "rating": rating,
        "refuse_issuance": refuse,
        "risk_flags": risk_flags,
        "evidence_hash": h,
        "asset_fingerprint": fp,
        "target": diligence.get("target", ""),
    }

    if args.json:
        print(json.dumps(payload, indent=2, ensure_ascii=False))
    else:
        gate = "REFUSE" if refuse else "PASS"
        print(f"gate:              {gate}")
        print(f"rating:            {rating}")
        print(f"passed:            {str(passed).lower()}")
        if risk_flags:
            print(f"risk_flags:        {', '.join(risk_flags)}")
        print(f"evidence_hash:     {h}")
        if fp:
            print(f"asset_fingerprint: {fp}")
        print(f"target:            {diligence.get('target', '')}")

    sys.exit(1 if refuse else 0)


if __name__ == "__main__":
    main()
