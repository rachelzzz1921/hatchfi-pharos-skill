#!/usr/bin/env python3
"""Regenerate lib/hatchfi-gate/src/denylist.ts from the OFAC snapshot."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
addrs = json.loads((ROOT / "assets/knowledge/denylist_ofac_eth.json").read_text())
low = sorted({a.lower() for a in addrs})
lines = ",\n  ".join(f'"{a}"' for a in low)
out = f"""// GENERATED from assets/knowledge/denylist_ofac_eth.json — do not edit by hand.
// Regenerate: python3 scripts/generate_denylist_module.py
// OFAC-derived ETH sanctions snapshot ({len(low)} addresses), lowercased.
export const OFAC_DENYLIST: readonly string[] = [
  {lines},
];

export const OFAC_DENYLIST_SET: ReadonlySet<string> = new Set(OFAC_DENYLIST);
export const OFAC_DENYLIST_SIZE = OFAC_DENYLIST.length;
"""
(ROOT / "lib/hatchfi-gate/src/denylist.ts").write_text(out)
print(f"denylist.ts regenerated: {len(low)} addresses")
