#!/usr/bin/env python3
"""Merge assets/knowledge/denylist_ofac_eth.json into state.json config."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / "state.json"
DENYLIST = ROOT / "assets" / "knowledge" / "denylist_ofac_eth.json"
SNAPSHOT = ROOT / "assets" / "knowledge" / "denylist_ofac_eth.snapshot"


def main() -> None:
    if not DENYLIST.exists():
        raise SystemExit(f"Missing {DENYLIST}. Run: bash scripts/refresh_ofac_denylist.sh")

    addresses = json.loads(DENYLIST.read_text(encoding="utf-8"))
    if not isinstance(addresses, list):
        raise SystemExit("denylist_ofac_eth.json must be a JSON array of addresses")

    snapshot = SNAPSHOT.read_text(encoding="utf-8").strip() if SNAPSHOT.exists() else ""

    state: dict = {}
    if STATE.exists():
        state = json.loads(STATE.read_text(encoding="utf-8"))

    cfg = state.setdefault("config", {})
    custom = [a for a in cfg.get("denylist", []) if a.lower() not in {x.lower() for x in addresses}]
    cfg["denylist"] = sorted({a.lower() for a in addresses} | {a.lower() for a in custom})
    cfg["denylist_source"] = "assets/knowledge/denylist_ofac_eth.json"

    diligence = state.setdefault("diligence", {})
    snapshots = diligence.setdefault("list_snapshots", {})
    if snapshot:
        snapshots["ofac_eth"] = snapshot

    STATE.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")
    print(f"Merged {len(addresses)} OFAC ETH addresses into state.config.denylist")
    if snapshot:
        print(f"Set state.diligence.list_snapshots.ofac_eth = {snapshot}")


if __name__ == "__main__":
    main()
