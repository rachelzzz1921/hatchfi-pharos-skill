# Pharos Atlantic Testnet · Deployment Runbook

> **Goal**: Set `PRIVATE_KEY` and `PHAROS_RPC_URL` in your terminal, run the commands below to deploy and verify.
> **Working directory**: `pharos-rwa-skill/` (Foundry project)

## Project identity

| Item | Value |
|---|---|
| Framework | **Foundry** (`foundry.toml` + `script/` + `test/`) |
| Main contract | `CompliantRWAToken` (`src/CompliantRWAToken.sol`) |
| Deploy script | `script/Deploy.s.sol:Deploy` |
| Tests | `test/CompliantRWAToken.t.sol` (16 cases) |
| Frontend | None (wagmi adapter skipped) |

## Network parameters

| Item | Value |
|---|---|
| Network | Pharos Atlantic Testnet |
| Chain ID | **688689** |
| Native token | PHRS |
| Default RPC | `https://atlantic.dplabs-internal.com` |
| Explorer (primary) | https://atlantic.pharosscan.xyz |
| Explorer (backup) | https://pharos-testnet.socialscan.io |

## Security rules (mandatory)

1. Never ask for mnemonic / private key in chat
2. Private key **only** from env `PRIVATE_KEY`
3. Never write keys into source, README, logs, JSON, or git
4. `.env` in `.gitignore`; repo keeps `.env.example` only
5. No bot / sybil scripts
6. On-chain writes limited to low-risk demo: `registerIdentity` + `mint 1 token`

## Environment variables

```bash
# .env.example (copy to .env locally — do not commit)
PRIVATE_KEY=
PHAROS_RPC_URL=https://atlantic.dplabs-internal.com

# Optional deploy overrides
ASSET_NAME=Manhattan Property Fund
ASSET_SYMBOL=MPF
MAX_HOLDERS=100
MAX_BALANCE=1000000000000000000000000
```

## One-shot command flow

```bash
cd pharos-rwa-skill

# 0. Dependencies (first time)
curl -L https://foundry.paradigm.xyz | bash && foundryup
forge install OpenZeppelin/openzeppelin-contracts@v5.1.0 --no-commit
forge install foundry-rs/forge-std --no-commit

# 1. Local validation (no private key)
npm run build          # forge build
npm run test           # forge test -vvv
npm run check          # ./check.sh

# 2. On-chain (needs key + PHRS)
export PRIVATE_KEY=0xYOUR_KEY          # you set this — do not send to agent
export PHAROS_RPC_URL=https://atlantic.dplabs-internal.com

npm run preflight:pharos
npm run deploy:pharos
npm run smoke:pharos
npm run verify:pharos   # record explorer verification
```

## Post-deploy artifacts

| File | Contents |
|---|---|
| `deployments/pharos.json` | Address, tx, explorer links |
| `DEPLOYMENT_RESULT.md` | Human-readable deploy report |
| `state.json` | `state.schema.json` asset section (agent memory) |
| `broadcast/` | Foundry broadcast (may gitignore) |

## Explorer link format

```
https://atlantic.pharosscan.xyz/address/<CONTRACT>
https://atlantic.pharosscan.xyz/tx/<TX_HASH>
https://pharos-testnet.socialscan.io/address/<CONTRACT>
```

## Smoke flow (Phase 6)

1. **Read**: `name()`, `symbol()`, `maxHolders()`, `holderCount()`, `owner()`
2. **Write**: `registerIdentity(deployer, 840)` → receipt OK
3. **Write**: `mint(deployer, 1e18)` → receipt OK
4. **Read**: `isVerified(deployer)`, `balanceOf(deployer)`

## Error recovery

| Symptom | Action |
|---|---|
| RPC failure | Retry once; else change `PHAROS_RPC_URL` (e.g. ZAN) |
| chainId ≠ 688689 | **Stop deploy** |
| balance = 0 | **Stop** → faucet for PHRS |
| Build failure | Minimal fix only; do not change business logic |
| Verify result | Record in `DEPLOYMENT_RESULT.md` |

## Hackathon pipeline relationship

```
Local Phase 1-4 (build/test/security)
    ↓
Phase 5 preflight (you set PRIVATE_KEY)
    ↓
Phase 6 deploy + smoke → state.json
    ↓
Phase 7 verify (optional)
    ↓
spawn-asset-skill → skills/MPF-asset/
    ↓
DEMO.md recording
```

Detailed gates: `references/pharos-verification.md`.
