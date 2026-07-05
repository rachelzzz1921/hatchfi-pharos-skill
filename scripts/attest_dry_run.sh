#!/usr/bin/env bash
# Dry-run attestation pipeline: compute hashes + print cast calldata (no broadcast).
set -euo pipefail

STATE="${1:-state.example.json}"
RPC="${PHAROS_RPC_URL:-https://atlantic.dplabs-internal.com}"

if [ ! -f "$STATE" ]; then
  echo "FAIL: state file not found: $STATE"
  exit 1
fi

RATING=$(python3 -c "import json; d=json.load(open('$STATE')).get('diligence',{}); print(d.get('rating','UNCHECKED'))")
PASSED=$(python3 -c "import json; d=json.load(open('$STATE')).get('diligence',{}); print('true' if d.get('passed') else 'false')")
TARGET=$(python3 -c "import json; d=json.load(open('$STATE')).get('diligence',{}); print(d.get('target',''))")

if [ "$PASSED" != "true" ]; then
  echo "GATE: REFUSE — diligence.passed != true"
  exit 1
fi

if [ "$RATING" = "RED" ]; then
  echo "GATE: REFUSE — RED rating cannot attest"
  exit 1
fi

case "$RATING" in
  GREEN) RATING_ONCHAIN=2 ;;
  YELLOW) RATING_ONCHAIN=1 ;;
  *)
    echo "GATE: REFUSE — rating must be GREEN or YELLOW (got $RATING)"
    exit 1
    ;;
esac

HASH=$(python3 scripts/evidence_hash.py --state "$STATE")
FP=$(python3 -c "
import json, sys
sys.path.insert(0, 'scripts')
from evidence_hash_lib import asset_fingerprint
s = json.load(open('$STATE'))
bg = s.get('diligence', {}).get('background', {})
aid = bg.get('asset_id') or s.get('asset', {}).get('symbol', 'MPF')
jur = bg.get('jurisdiction', 'US')
wrap = bg.get('wrapper_type', 'permissioned_token')
print(asset_fingerprint(aid, jur, wrap))
")

echo "=== Attestation dry-run (no tx) ==="
echo "state:              $STATE"
echo "target:             $TARGET"
echo "rating:             $RATING → onchain $RATING_ONCHAIN"
echo "evidence_hash:      $HASH"
echo "asset_fingerprint:  $FP"
echo ""

ATTEST=$(python3 -c "import json; d=json.load(open('deployments/attestation_atlantic.json')); print(d.get('contracts',{}).get('DiligenceAttestationRegistry',{}).get('address',''))" 2>/dev/null || true)
ASSETS=$(python3 -c "import json; d=json.load(open('deployments/attestation_atlantic.json')); print(d.get('contracts',{}).get('AssetTokenizationRegistry',{}).get('address',''))" 2>/dev/null || true)

if [ -n "$ATTEST" ]; then
  echo "--- attest (live registry $ATTEST) ---"
  cast calldata "attest(bytes32,address,uint8,bytes32)" "$HASH" "$TARGET" "$RATING_ONCHAIN" "$FP"
  echo ""
  echo "cast send $ATTEST \"attest(bytes32,address,uint8,bytes32)\" $HASH $TARGET $RATING_ONCHAIN $FP --rpc-url $RPC --private-key \$PK"
else
  echo "--- attest (registry not deployed — calldata only) ---"
  cast calldata "attest(bytes32,address,uint8,bytes32)" "$HASH" "$TARGET" "$RATING_ONCHAIN" "$FP"
fi

TOKEN=$(python3 -c "import json; print(json.load(open('$STATE')).get('asset',{}).get('address',''))")
if [ -n "$TOKEN" ] && [ -n "$ASSETS" ]; then
  echo ""
  echo "--- registerAsset (live registry $ASSETS) ---"
  cast calldata "registerAsset(bytes32,address)" "$FP" "$TOKEN"
  echo ""
  echo "cast send $ASSETS \"registerAsset(bytes32,address)\" $FP $TOKEN --rpc-url $RPC --private-key \$PK"
elif [ -n "$TOKEN" ]; then
  echo ""
  echo "--- registerAsset (registry not deployed) ---"
  cast calldata "registerAsset(bytes32,address)" "$FP" "$TOKEN"
fi

echo ""
echo "✅ Dry-run complete. Run npm run deploy:attestation then npm run smoke:attestation to broadcast."
