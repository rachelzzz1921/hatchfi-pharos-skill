# Pharos Vision Alignment · RealFi · Agentic · Composable

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
  ├─ diligence pipeline (sanctions + on-chain + off-chain, RED blocks issuance)
  ├─ MockOFACRegistry @ 0x4FD3…F400 (Atlantic)
  ├─ deploy + smoke on Atlantic (PROVEN: MPF @ 0x9757…b5C3)
  └─ spawn skills/MPF-asset/ (4 diligence refs)

Agent B, C, … : import MPF-asset skill
  └─ manage whitelist / mint / dividends without redeploying
```

**Every new RWA issued adds a reusable capability unit to the Pharos agent ecosystem** — not a one-off script, but a packaged skill with fixed contract address and reference commands.

## Evidence judges can verify in 60 seconds

1. Open [`atlantic.pharosscan.xyz/address/0x9757…`](https://atlantic.pharosscan.xyz/address/0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3) — live contract
2. Run `forge test` locally — 45 passed
3. Open `skills/MPF-asset/SKILL.md` — spawned child skill with hardcoded `TOKEN=0x9757…`
4. Read `COMPLETED_VALIDATION.md` — full local + on-chain record

## Design choices aligned with Pharos Skill Engine

- Extends official `assets/networks.json` + write pre-checks (not a standalone hack)
- Foundry / `cast` / `forge` — native EVM toolchain Pharos documents
- Atlantic Testnet chainId `688689` — preflight, deploy runbook, smoke scripts included
- No private keys in repo; `.env` gitignored

This is infrastructure for **repeatable, compliant, agent-driven RWA issuance** on Pharos — with a composability story that scales with every asset issued.
