#!/usr/bin/env bash
# Extract DeployAttestation broadcast → deployments/attestation_atlantic.json
set -euo pipefail

CHAIN_ID=688689
BROADCAST_DIR="broadcast/DeployAttestation.s.sol/${CHAIN_ID}"

if [ -z "${PRIVATE_KEY:-}" ]; then
  echo "FAIL: PRIVATE_KEY not set"
  exit 1
fi

LATEST=$(ls -t "$BROADCAST_DIR"/run-*.json 2>/dev/null | head -1)
if [ -z "$LATEST" ]; then
  echo "FAIL: no broadcast record — run npm run deploy:attestation first"
  exit 1
fi

DEPLOYER=$(cast wallet address --private-key "$PRIVATE_KEY")

python3 << PY
import json, datetime, os

latest = "$LATEST"
with open(latest) as f:
    run = json.load(f)

contracts = {}
for tx, receipt in zip(run.get("transactions", []), run.get("receipts", [])):
    name = tx.get("contractName")
    addr = tx.get("contractAddress") or receipt.get("contractAddress")
    txhash = receipt.get("transactionHash") or tx.get("hash")
    if name and addr:
        contracts[name] = {
            "address": addr,
            "deployTx": txhash,
            "explorer": f"https://atlantic.pharosscan.xyz/address/{addr}",
        }

now = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
data = {
    "network": "pharos_atlantic",
    "chainId": CHAIN_ID,
    "contracts": contracts,
    "deployer": "$DEPLOYER",
    "deployedAt": now,
    "note": "DiligenceAttestationRegistry + AssetTokenizationRegistry for onchain-attestation.md",
}

os.makedirs("deployments", exist_ok=True)
with open("deployments/attestation_atlantic.json", "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")

for name, c in contracts.items():
    print(f"{name}: {c['address']}")
    print(f"  {c['explorer']}")
PY
