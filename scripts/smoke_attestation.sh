#!/usr/bin/env bash
# Smoke: attest diligence hash + register MPF asset fingerprint on Atlantic (when registries deployed).
set -euo pipefail

RPC="${PHAROS_RPC_URL:-https://atlantic.dplabs-internal.com}"
DEPLOY_FILE="deployments/attestation_atlantic.json"

if [ -z "${PRIVATE_KEY:-}" ]; then
  echo "SKIP: PRIVATE_KEY not set"
  exit 0
fi

if [ ! -f "$DEPLOY_FILE" ]; then
  echo "FAIL: missing $DEPLOY_FILE — run npm run deploy:attestation"
  exit 1
fi

read -r ATTEST ASSETS << PY
import json
d = json.load(open("$DEPLOY_FILE"))
c = d.get("contracts", {})
print(c.get("DiligenceAttestationRegistry", {}).get("address", ""))
print(c.get("AssetTokenizationRegistry", {}).get("address", ""))
PY

if [ -z "$ATTEST" ] || [ -z "$ASSETS" ]; then
  echo "FAIL: attestation registries not deployed — addresses empty in $DEPLOY_FILE"
  echo "Run: npm run deploy:attestation"
  exit 1
fi

PK=$PRIVATE_KEY
DEPLOYER=$(cast wallet address --private-key "$PK")
TOKEN="${MPF_TOKEN:-0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3}"

HASH=$(python3 scripts/evidence_hash.py --evidence eval/evidence_hash_fixture.json)
FP=$(python3 scripts/evidence_hash.py --asset-id MPF --jurisdiction US --wrapper-type permissioned_token)
RATING=2

echo "Attest evidence hash $HASH for $DEPLOYER ..."
TX1=$(cast send "$ATTEST" \
  "attest(bytes32,address,uint8,bytes32)" \
  "$HASH" "$DEPLOYER" "$RATING" "$FP" \
  --rpc-url "$RPC" --private-key "$PK" --json | python3 -c "import sys,json; print(json.load(sys.stdin)['transactionHash'])")

cast receipt "$TX1" --rpc-url "$RPC" | grep -q '"status":"0x1"' || { echo "FAIL attest receipt"; exit 1; }
echo "✅ attest tx $TX1"

PASSABLE=$(cast call "$ATTEST" "isPassable(bytes32)(bool)" "$HASH" --rpc-url "$RPC")
echo "isPassable($HASH) = $PASSABLE"

echo "Register asset fingerprint → $TOKEN ..."
TX2=$(cast send "$ASSETS" "registerAsset(bytes32,address)" "$FP" "$TOKEN" \
  --rpc-url "$RPC" --private-key "$PK" --json | python3 -c "import sys,json; print(json.load(sys.stdin)['transactionHash'])")

cast receipt "$TX2" --rpc-url "$RPC" | grep -q '"status":"0x1"' || { echo "FAIL register receipt"; exit 1; }
echo "✅ registerAsset tx $TX2"

MAPPED=$(cast call "$ASSETS" "tokenForAsset(bytes32)(address)" "$FP" --rpc-url "$RPC")
echo "tokenForAsset = $MAPPED"
echo "Smoke attestation complete."
