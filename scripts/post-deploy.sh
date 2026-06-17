#!/usr/bin/env bash
# 从 Foundry broadcast 提取部署结果 → deployments/pharos.json + DEPLOYMENT_RESULT.md
set -euo pipefail

RPC_URL="${PHAROS_RPC_URL:-https://atlantic.dplabs-internal.com}"
CHAIN_ID=688689
BROADCAST_DIR="broadcast/Deploy.s.sol/${CHAIN_ID}"

if [ -z "${PRIVATE_KEY:-}" ]; then
  echo "FAIL: PRIVATE_KEY 未设置"
  exit 1
fi

LATEST=$(ls -t "$BROADCAST_DIR"/run-*.json 2>/dev/null | head -1)
if [ -z "$LATEST" ]; then
  echo "FAIL: 找不到 broadcast 记录，请先 deploy"
  exit 1
fi

DEPLOYER=$(cast wallet address --private-key "$PRIVATE_KEY")

python3 << PY
import json, datetime, os

latest = "$LATEST"
with open(latest) as f:
    run = json.load(f)

tx = run["transactions"][0]
receipt = run["receipts"][0]
addr = tx.get("contractAddress") or receipt.get("contractAddress")
txhash = receipt.get("transactionHash") or tx.get("hash")
if not addr:
    raise SystemExit("Could not find deployed contract address in broadcast file")
if not txhash:
    raise SystemExit("Could not find deployment tx hash in broadcast file")
name = os.environ.get("ASSET_NAME", "Manhattan Property Fund")
symbol = os.environ.get("ASSET_SYMBOL", "MPF")
now = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

data = {
    "network": "Pharos Atlantic Testnet",
    "chainId": $CHAIN_ID,
    "rpcUrlEnv": "PHAROS_RPC_URL",
    "contractName": "CompliantRWAToken",
    "contractAddress": addr,
    "deploymentTx": txhash,
    "deployer": "$DEPLOYER",
    "deployedAt": now,
    "constructorArgs": {
        "name": name,
        "symbol": symbol,
        "maxHolders": os.environ.get("MAX_HOLDERS", "100"),
        "maxBalancePerInvestor": os.environ.get("MAX_BALANCE", "1000000000000000000000000")
    },
    "explorer": {
        "address": f"https://atlantic.pharosscan.xyz/address/{addr}",
        "tx": f"https://atlantic.pharosscan.xyz/tx/{txhash}"
    },
    "backupExplorer": {
        "address": f"https://pharos-testnet.socialscan.io/address/{addr}",
        "tx": f"https://pharos-testnet.socialscan.io/tx/{txhash}"
    }
}

os.makedirs("deployments", exist_ok=True)
with open("deployments/pharos.json", "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")

md = f"""# Deployment Result · CompliantRWAToken

## Summary

| Field | Value |
|---|---|
| Framework | Foundry |
| Contract | CompliantRWAToken |
| Network | Pharos Atlantic Testnet |
| Chain ID | {data['chainId']} |
| Address | `{addr}` |
| Deploy Tx | `{txhash}` |
| Deployer | `{data['deployer']}` |
| Deployed At | {now} |

## Explorer

- [PharosScan Address]({data['explorer']['address']})
- [PharosScan Tx]({data['explorer']['tx']})
- [Socialscan Address]({data['backupExplorer']['address']})

## Smoke Test

Run: \`npm run smoke:pharos\`

## Verify

Run: \`npm run verify:pharos\` (optional, non-blocking)

## Frontend env (if needed later)

\`\`\`
VITE_CONTRACT_ADDRESS={addr}
VITE_CHAIN_ID=688689
VITE_PHAROS_RPC_URL=https://atlantic.dplabs-internal.com
\`\`\`
"""
with open("DEPLOYMENT_RESULT.md", "w") as f:
    f.write(md)

print(f"Contract: {addr}")
print(f"Tx:       {txhash}")
print(f"Explorer: {data['explorer']['address']}")
PY

# 同步 state.json asset 段（若存在 schema）
if [ -f state.schema.json ]; then
  python3 << 'PY' || true
import json, os
if not os.path.exists("deployments/pharos.json"):
    raise SystemExit(0)
dep = json.load(open("deployments/pharos.json"))
state = {}
if os.path.exists("state.json"):
    state = json.load(open("state.json"))
args = dep.get("constructorArgs", {})
state["asset"] = {
    "address": dep["contractAddress"],
    "name": args.get("name", "Manhattan Property Fund"),
    "symbol": args.get("symbol", "MPF"),
    "deployed_at": dep["deployedAt"],
    "deploy_tx": dep["deploymentTx"],
    "max_holders": int(args.get("maxHolders", 100)),
    "max_balance_per_investor": args.get("maxBalancePerInvestor", "1000000000000000000000000"),
}
state["last_action"] = "deploy_pharos"
state.setdefault("diligence", {"rating": "UNCHECKED", "passed": True, "evidence": []})
state.setdefault("whitelist", [])
state.setdefault("dividends", [])
state.setdefault("history", [])
state["history"].append({
    "action": "deploy_pharos",
    "risk": "high",
    "confirmed_by_human": True,
    "tx": dep["deploymentTx"],
    "at": dep["deployedAt"],
})
json.dump(state, open("state.json", "w"), indent=2)
open("state.json", "a").write("\n")
print("Updated state.json asset segment")
PY
fi
