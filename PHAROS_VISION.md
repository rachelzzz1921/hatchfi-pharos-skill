# Pharos Vision Alignment · RealFi · Agentic · Composable

> **English pack**: `../submission-build/pharos-rwa-skill-en/PHAROS_VISION.md`

## Why this skill exists on Pharos

Pharos positions itself at the intersection of **RealFi** (real-world asset value flows), **protocol-native compliance**, and **agentic on-chain infrastructure**. Generic token minting does not satisfy regulated RWA issuance — agents need diligence gates, identity-bound transfers, lifecycle controls, and auditable yield distribution.

This skill is built **for that stack**:

| Pharos narrative | How this skill delivers |
|---|---|
| RealFi / RWA | ERC-3643-style `CompliantRWAToken` with identity, compliance caps, dividends |
| Protocol-native compliance | `_update()` hook enforces `isVerified` + `canTransfer` on every transfer; mint enforces caps too |
| Agentic infrastructure | `SKILL.md` capability index, risk tiers, human confirm cards, `state.json` memory |
| Composable ecosystem | **Self-spawning flywheel**: each issuance → `skills/<SYMBOL>-asset/` for other agents |

## The flywheel (already live)

```text
Agent A: Compliant RWA Issuance Agent
  ├─ diligence gate (read-only cast, RED blocks issuance)
  ├─ deploy + smoke on Atlantic (PROVEN: MPF @ 0xfef7…Aa3DE)
  └─ spawn skills/MPF-asset/

Agent B, C, … : import MPF-asset skill
  └─ manage whitelist / mint / dividends without redeploying
```

**Every new RWA issued adds a reusable capability unit to the Pharos agent ecosystem** — not a one-off script, but a packaged skill with fixed contract address and reference commands.

## Evidence judges can verify in 60 seconds

1. Open [`atlantic.pharosscan.xyz/address/0xfef7…`](https://atlantic.pharosscan.xyz/address/0xfef7519bebda6c47af49583dbc9e60801f8aa3de) — live contract
2. Run `forge test` locally — 24 passed
3. Open `skills/MPF-asset/SKILL.md` — spawned child skill with hardcoded `TOKEN=0xfef7…`
4. Read `COMPLETED_VALIDATION.md` — full local + on-chain record

## Design choices aligned with Pharos Skill Engine

- Extends official `assets/networks.json` + write pre-checks (not a standalone hack)
- Foundry / `cast` / `forge` — native EVM toolchain Pharos documents
- Atlantic Testnet chainId `688689` — preflight, deploy runbook, smoke scripts included
- No private keys in repo; `.env` gitignored

This is infrastructure for **repeatable, compliant, agent-driven RWA issuance** on Pharos — with a composability story that scales with every asset issued.
