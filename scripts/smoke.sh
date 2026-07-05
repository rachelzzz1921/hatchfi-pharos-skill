#!/usr/bin/env bash
# 链上冒烟：read + registerIdentity(deployer) + mint 1 token
set -euo pipefail

RPC_URL="${PHAROS_RPC_URL:-https://atlantic.dplabs-internal.com}"
DEPLOY_FILE="deployments/pharos.json"
COUNTRY=840
MINT_AMOUNT=1000000000000000000  # 1e18
EVIDENCE_HASH="${EVIDENCE_HASH:-$(cast keccak "smoke-evidence-v1")}"

if [ -z "${PRIVATE_KEY:-}" ]; then
  echo "FAIL: PRIVATE_KEY 未设置"
  exit 1
fi

if [ ! -f "$DEPLOY_FILE" ]; then
  echo "FAIL: 找不到 $DEPLOY_FILE，请先 npm run deploy:pharos"
  exit 1
fi

TOKEN=$(python3 -c "import json; print(json.load(open('$DEPLOY_FILE'))['contractAddress'])")
DEPLOYER=$(cast wallet address --private-key "$PRIVATE_KEY")
IDENTITY_ID=$(cast keccak "identity:$DEPLOYER")

echo "== Smoke Test: $TOKEN =="
echo "Deployer: $DEPLOYER"
echo ""

assert_receipt() {
  local tx=$1 label=$2
  local status
  status=$(cast receipt "$tx" --rpc-url "$RPC_URL" --json | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
  if [ "$status" != "0x1" ] && [ "$status" != "1" ]; then
    echo "FAIL: $label tx status != 1 ($tx)"
    exit 1
  fi
  echo "  receipt OK: $tx"
}

echo "-- Read calls --"
NAME=$(cast call "$TOKEN" "name()(string)" --rpc-url "$RPC_URL")
SYMBOL=$(cast call "$TOKEN" "symbol()(string)" --rpc-url "$RPC_URL")
MAX_H=$(cast call "$TOKEN" "maxHolders()(uint256)" --rpc-url "$RPC_URL")
HOLDERS=$(cast call "$TOKEN" "holderCount()(uint256)" --rpc-url "$RPC_URL")
OWNER=$(cast call "$TOKEN" "owner()(address)" --rpc-url "$RPC_URL")
echo "  name():        $NAME"
echo "  symbol():      $SYMBOL"
echo "  maxHolders():  $MAX_H"
echo "  holderCount(): $HOLDERS"
echo "  owner():       $OWNER"
echo ""

REGISTER_BEFORE=$(cast call "$TOKEN" "isVerified(address)(bool)" "$DEPLOYER" --rpc-url "$RPC_URL")
if [ "$REGISTER_BEFORE" = "true" ]; then
  echo "-- Write: registerIdentity skipped (deployer already verified) --"
  TX1="skipped"
else
  echo "-- Write: registerIdentity(deployer, $COUNTRY, identityId) --"
  TX1=$(cast send "$TOKEN" "registerIdentity(address,uint16,bytes32)" "$DEPLOYER" "$COUNTRY" "$IDENTITY_ID" \
    --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --json | python3 -c "import sys,json; print(json.load(sys.stdin)['transactionHash'])")
  assert_receipt "$TX1" "registerIdentity"
fi

echo "-- Read: diligenceAttestationRegistry() --"
ATTESTATION_REGISTRY=$(cast call "$TOKEN" "diligenceAttestationRegistry()(address)" --rpc-url "$RPC_URL")
if [ "$ATTESTATION_REGISTRY" = "0x0000000000000000000000000000000000000000" ]; then
  echo "FAIL: diligenceAttestationRegistry not configured on token"
  echo "Hint: call setDiligenceAttestationRegistry first, then attest evidence hash."
  exit 1
fi

PASSABLE=$(cast call "$ATTESTATION_REGISTRY" "isPassable(bytes32)(bool)" "$EVIDENCE_HASH" --rpc-url "$RPC_URL")
if [ "$PASSABLE" != "true" ]; then
  echo "FAIL: evidence hash is not passable on attestation registry"
  echo "Registry: $ATTESTATION_REGISTRY"
  echo "Evidence: $EVIDENCE_HASH"
  exit 1
fi

echo "-- Write: mint(deployer, 1e18, evidenceHash) --"
TX2=$(cast send "$TOKEN" "mint(address,uint256,bytes32)" "$DEPLOYER" "$MINT_AMOUNT" "$EVIDENCE_HASH" \
  --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --json | python3 -c "import sys,json; print(json.load(sys.stdin)['transactionHash'])")
assert_receipt "$TX2" "mint"

echo ""
echo "-- Post-write read --"
VERIFIED=$(cast call "$TOKEN" "isVerified(address)(bool)" "$DEPLOYER" --rpc-url "$RPC_URL")
BAL=$(cast call "$TOKEN" "balanceOf(address)(uint256)" "$DEPLOYER" --rpc-url "$RPC_URL")
HOLDERS2=$(cast call "$TOKEN" "holderCount()(uint256)" --rpc-url "$RPC_URL")
echo "  isVerified(deployer): $VERIFIED"
echo "  balanceOf(deployer):  $BAL"
echo "  holderCount():        $HOLDERS2"
echo ""

# 更新部署文件
python3 << PY
import json, datetime
p = "$DEPLOY_FILE"
with open(p) as f:
    d = json.load(f)
d["smokeTest"] = {
    "passedAt": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    "registerTx": "$TX1",
    "mintTx": "$TX2",
    "identityId": "$IDENTITY_ID",
    "evidenceHash": "$EVIDENCE_HASH",
    "attestationRegistry": "$ATTESTATION_REGISTRY",
    "isVerified": "$VERIFIED",
    "balance": "$BAL",
    "holderCount": "$HOLDERS2"
}
with open(p, "w") as f:
    json.dump(d, f, indent=2)
    f.write("\n")
print("Updated", p)
PY

python3 << PY
from pathlib import Path

report = Path("DEPLOYMENT_RESULT.md")
if report.exists():
    text = report.read_text()
    smoke = """## Smoke Test

| Check | Result |
|---|---|
| registerIdentity | $TX1 |
| mint | $TX2 |
| isVerified(deployer) | $VERIFIED |
| balanceOf(deployer) | $BAL |
| holderCount | $HOLDERS2 |

"""
    start = text.find("## Smoke Test")
    end = text.find("## Verify", start)
    if start != -1 and end != -1:
        text = text[:start] + smoke + text[end:]
    else:
        text += "\n" + smoke
    report.write_text(text)
    print("Updated", report)
PY

echo "Status: OK"
