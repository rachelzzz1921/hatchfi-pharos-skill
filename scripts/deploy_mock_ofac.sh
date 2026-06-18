#!/usr/bin/env bash
# Deploy MockOFACRegistry on Pharos Atlantic (optional diligence drill).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
RPC="${PHAROS_RPC_URL:-https://atlantic.dplabs-internal.com}"

if [[ -z "${PRIVATE_KEY:-}" ]]; then
  echo "PRIVATE_KEY not set — skip deploy. Set env and re-run:"
  echo "  export PRIVATE_KEY=0x... && bash scripts/deploy_mock_ofac.sh"
  exit 0
fi

OUT=$(forge create assets/rwa/MockOFACRegistry.sol:MockOFACRegistry \
  --rpc-url "$RPC" --private-key "$PRIVATE_KEY" --broadcast --legacy \
  --gas-limit 500000 --gas-price 3000000000 2>&1)
echo "$OUT"
ADDR=$(echo "$OUT" | sed -n 's/Deployed to: \(0x[a-fA-F0-9]*\)/\1/p' | head -1)
if [[ -n "$ADDR" ]]; then
  echo ""
  echo "Set in state.json:"
  echo "  \"config\": { \"ofac_oracle\": \"$ADDR\" }"
  python3 - <<PY
import json
from pathlib import Path
p = Path("state.json")
s = json.loads(p.read_text()) if p.exists() else {}
s.setdefault("config", {})["ofac_oracle"] = "$ADDR"
p.write_text(json.dumps(s, indent=2) + "\n")
print("Updated state.config.ofac_oracle")
PY
fi
