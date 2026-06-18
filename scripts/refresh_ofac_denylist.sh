#!/usr/bin/env bash
# Refresh local OFAC ETH address snapshot (no paid API).
# Merge output into state.config.denylist[] manually or via your harness.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/assets/knowledge/denylist_ofac_eth.json"
SNAP="$ROOT/assets/knowledge/denylist_ofac_eth.snapshot"
URL="https://raw.githubusercontent.com/0xB10C/ofac-sanctioned-digital-currency-addresses/lists/sanctioned_addresses_ETH.json"

curl -sL "$URL" -o "$OUT"
date -u +%Y-%m-%d > "$SNAP"
echo "Wrote $OUT"
echo "Snapshot date: $(cat "$SNAP")"
echo "Next: merge addresses into state.config.denylist[] and set state.diligence.list_snapshots.ofac_eth"
