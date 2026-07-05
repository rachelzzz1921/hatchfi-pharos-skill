#!/usr/bin/env python3
"""CLI: canonical evidence hash + optional asset fingerprint (for onchain-attestation.md)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from evidence_hash_lib import asset_fingerprint, canonicalize_evidence, evidence_hash

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser(description="HatchFi canonical diligence evidence hash")
    parser.add_argument("--state", type=Path, help="Read evidence[] from state.json")
    parser.add_argument("--evidence", type=Path, help="JSON file with evidence array")
    parser.add_argument("--print-canonical", action="store_true", help="Print canonical JSON before hash")
    parser.add_argument("--asset-id", help="With --jurisdiction and --wrapper-type, compute asset_fingerprint")
    parser.add_argument("--jurisdiction", help="ISO alpha-2 for fingerprint")
    parser.add_argument("--wrapper-type", help="wrapper_type enum for fingerprint")
    args = parser.parse_args()

    if args.asset_id and args.jurisdiction and args.wrapper_type:
        print(asset_fingerprint(args.asset_id, args.jurisdiction, args.wrapper_type))
        return

    evidence = None
    if args.state:
        state = json.loads(args.state.read_text(encoding="utf-8"))
        evidence = (state.get("diligence") or {}).get("evidence") or []
    elif args.evidence:
        evidence = json.loads(args.evidence.read_text(encoding="utf-8"))
    else:
        default = ROOT / "eval" / "evidence_hash_fixture.json"
        if default.exists():
            evidence = json.loads(default.read_text(encoding="utf-8"))
        else:
            parser.error("provide --state, --evidence, or use eval fixture")

    if args.print_canonical:
        print(canonicalize_evidence(evidence))
    print(evidence_hash(evidence))


if __name__ == "__main__":
    main()
