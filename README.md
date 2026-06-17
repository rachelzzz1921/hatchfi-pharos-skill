<div align="center">

<img src="./assets/brand/logo.png" alt="HatchFi" width="132" height="132" />

# HatchFi · 链孵

### Where compliant RWAs hatch into Agent Skills.

Every RWA you hatch leaves *you* a private operating Skill — yours, and it compounds.

[![tests](https://img.shields.io/badge/Foundry-24_passed-3dd68c?style=flat-square)](./docs/COMPLETED_VALIDATION.md)
[![live](https://img.shields.io/badge/Pharos_Atlantic-LIVE-2dd4bf?style=flat-square)](https://atlantic.pharosscan.xyz/address/0xfef7519bebda6c47af49583dbc9e60801f8aa3de)
[![skill](https://img.shields.io/badge/hatched_Skill-private_+_compounds-c9a227?style=flat-square)](./skills/MPF-asset/SKILL.md)
[![audit](https://img.shields.io/badge/Production_Audit-Strong_88%2F100-c9a227?style=flat-square)](./docs/SECURITY.md)
[![standard](https://img.shields.io/badge/ERC--3643-style-0b3d2e?style=flat-square)](./src/CompliantRWAToken.sol)

**🌐 English**  ·  [中文](./README.zh.md)  ·  📊 [Live Dashboard](https://htmlpreview.github.io/?https://github.com/rachelzzz1921/hatchfi-pharos-skill/blob/main/SUBMISSION_DASHBOARD.html)

**Pharos Skill-to-Agent Hackathon 2026** · [Register](https://bit.ly/4xkU0Wx) · [Agent Carnival](https://www.pharos.xyz/agent-carnival) · [Skill Engine Guide](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide) · [Discord](https://discord.com/invite/pharos) · [Telegram](https://t.me/+U27f5oGnJNlkZTI0)

</div>

---

## The problem nobody wants to touch

Issuing a real-world asset on-chain is **not** "deploy a token." A regulated RWA has to answer hard questions *inside the token itself*:

> Who is allowed to hold it? Who can they transfer to? What happens to a sanctioned wallet? How is yield distributed and audited?

Standard ERC-20 answers none of these. Most "RWA" hackathon projects stop at a mint button — and quietly skip compliance, lifecycle, and the part where an **agent** actually operates the asset over time.

## What HatchFi does

HatchFi is an **agent-native issuance layer** for compliant RealFi on Pharos. It turns regulated RWA launch into a workflow an AI agent runs end-to-end — diligence, compliant issuance, lifecycle, audit — verifies on-chain, and then **leaves you a private operating Skill for that asset that keeps improving as you talk to it.**

```
①  Diligence Gate   →   ②  Compliant Issuance   →   ③  Skill Hatch (yours)
   read-only risk          ERC-3643 token, live         spawn skills/<SYMBOL>-asset/
   GREEN/YELLOW/RED         on Pharos Atlantic            private-by-default · serves you
   RED blocks issuance      identity·compliance·freeze    refines via conversation
```

Compliance, diligence and audit are the hard base — not an afterthought. See [Compliance is the feature](#compliance-is-the-feature-not-friction) and [Built for Pharos](#built-for-pharos--realfi--agentic--composable) below.

## Built for Pharos — RealFi · Agentic · Composable

Pharos sits at the intersection of **RealFi**, **protocol-native compliance**, and **agentic on-chain infrastructure**. HatchFi **extends the official [Pharos Skill Engine](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide)** — it keeps `assets/networks.json`, write pre-checks, and `pharos-base-ops.md`, and adds RWA-specific playbooks on top.

| Pharos narrative | How HatchFi delivers |
|---|---|
| **RealFi / RWA** | ERC-3643-style `CompliantRWAToken` — identity, compliance caps, dividends, lifecycle. **Live on Atlantic.** |
| **Protocol-native compliance** | `_update()` hook enforces `isVerified` + `canTransfer` on every transfer; **mint enforces the same caps** (compliance-critical fix, audit D2) |
| **Agentic infrastructure** | `SKILL.md` capability index · risk tiers 🟢🟡🔴 · human confirm cards · `state.json` audit memory · consent gates 🔑 |
| **Composable ecosystem** | **Skill→Skill flywheel**: each issuance → `skills/<SYMBOL>-asset/` — opt-in sharing seeds a permissioned RealFi network on Pharos |

## End-to-end pipeline — four phases, gates at every step

```
Phase A  Diligence Gate     →  Phase B  Compliant Issuance  →  Phase C  Lifecycle Ops       →  Phase D  Skill Hatch
         read-only cast            deploy ERC-3643 token             whitelist / freeze / mint        spawn skills/MPF-asset/
         GREEN/YELLOW/RED          identity·compliance·freeze       dividends / recovery / audit     PERMISSIONS.md · private
         RED blocks issuance       24 tests + 8-finding audit     cast logs (12 events)            personalization loop
```

**7 agent playbooks** in `references/`: `onchain-diligence` · `rwa-issuance` · `rwa-dividend` · `spawn-asset-skill` · `pharos-base-ops` · `pharos-deploy-runbook` · `pharos-verification`

**Contract surface**: 20 external functions · 12 ERC-3643-aligned events · 5 typed errors · 24 Foundry tests (incl. fuzz invariant)

## It compounds — for *you*

This is the part judges should remember.

Most issuance tools produce **one** deployed token and stop. HatchFi produces a deployed token **plus a private operating Skill** for that exact asset — contract address and command set baked in. As you manage the asset in natural language, that Skill **learns your preferences and gets more aligned with your RWA needs** (jurisdictions, holder caps, dividend cadence, disclosure templates).

```
HatchFi (parent skill)
  └── issues MPF on Atlantic  ──spawn──►  skills/MPF-asset/   ◄── serves YOU first
        └── you keep operating it ──refine──►  better-fit Skill   (whitelist, mint, dividends)
                                                                    WITHOUT redeploying
```

> **Hatch → operate in natural language → the Skill compounds to fit *your* needs.** The flywheel points inward: it makes *your* compliant RealFi cheaper and sharper over time, not someone else's.

### You own the data. Sharing is your call.

The Skill and everything it accumulates — investor identities, diligence evidence, dividend detail, your preferences — are **yours and private by default**. They live in your local `state.json` (gitignored), never on-chain, never bundled into a shareable package.

- 🔑 **Deposit consent** — before any personal/sensitive info is recorded, the agent asks.
- 🔑 **Share consent** — opening a Skill or any data scope to others is an explicit opt-in that emits a **permission manifest** (exactly what's *exposed* vs *withheld*). See the generated [`PERMISSIONS.md`](./skills/MPF-asset/PERMISSIONS.md).

> **Sharing a Skill ≠ sharing your data.** A spawned Skill carries only the public operating surface (contract address + commands); your sovereign ledger never leaves your machine unless you say so.

It is already proven, not theoretical: issuing **MPF** automatically produced [`skills/MPF-asset/`](./skills/MPF-asset/SKILL.md) — a private, ready-to-operate Skill, with a permission manifest, that *you* can run today and open to others only by choice.

**And when you *do* choose to share, it's genuinely useful to the ecosystem.** A spawned Skill is a vetted, compliance-ready operating unit — contract baked in, diligence/issuance/dividend playbooks included. Opt-in sharing is how HatchFi can seed a network of reusable, *permissioned* RealFi Skills on Pharos: every issuer who opts in contributes one more ready-to-operate asset Skill, so the marginal cost of compliant RealFi keeps falling — **on each owner's terms, with a clear manifest, never by default.** The flywheel still turns; the owner just holds the switch.

## Public ecosystem — opt-in, permissioned, composable

HatchFi's **public value is real and already demonstrated**. This is not "privacy vs ecosystem" — it's **privacy by default, ecosystem by choice**.

```
Agent A  HatchFi (parent skill)
  ├─ diligence gate → deploy MPF @ Atlantic → smoke mint
  └─ spawn skills/MPF-asset/  (private · PERMISSIONS.md)

Agent B, C, …  (when owner opts in via 🔑 share consent)
  └─ import skills/MPF-asset/SKILL.md
       └─ manage whitelist · mint · dividends · diligence
            WITHOUT redeploying · WITHOUT accessing owner's state.json

Every new RWA hatched  →  +1 composable capability unit on Pharos
  →  marginal cost of compliant RealFi trends toward zero
  →  owner holds the switch · manifest declares exposed vs withheld
```

| Layer | Package | Reuse |
|---|---|---|
| **Mother Skill** | `SKILL.md` + 7 references | Any Pharos agent drives the full RWA issuance pipeline |
| **Child Skill (live)** | [`skills/MPF-asset/`](./skills/MPF-asset/SKILL.md) | Manhattan Property Fund · `TOKEN=0xfef7…Aa3DE` · 3 bound references · operable today |
| **Next RWA** | `skills/<NEXT>-asset/` | Same deterministic spawn — template fill from `state.asset`, zero LLM hallucination |

> **More RWAs hatched → more opt-in Skills → a permissioned RealFi network on Pharos.** Privacy by default; ecosystem by choice.

## It's live — verify in 60 seconds

This is not a slide deck. HatchFi is **deployed and smoke-tested on Pharos Atlantic**.

| | |
|---|---|
| **Contract (MPF)** | [`0xfef7519bebda6c47af49583dbc9e60801f8aa3de`](https://atlantic.pharosscan.xyz/address/0xfef7519bebda6c47af49583dbc9e60801f8aa3de) |
| **Deploy tx** | [`0x71ebe5…17e4d`](https://atlantic.pharosscan.xyz/tx/0x71ebe568c6d41390cfc6b6f452c30c85d38d0b4ddead941d19383a7e39417e4d) |
| **Smoke mint tx** | [`0x7ece3b…b5541`](https://atlantic.pharosscan.xyz/tx/0x7ece3b86646685fbf9312bf91b68fc18ae694c3ccd50e8fdba148d6348bb5541) |
| **Network** | Pharos Atlantic Testnet · chainId `688689` |

## Compliance is the feature, not friction

The contract is **ERC-3643-style** (T-REX), with every transfer forced through a triple gate in the `_update()` hook:

```
transfer / mint / forcedTransfer
        │
        ▼  _update() hook
   ┌──────────────┬──────────────────────┬─────────────────────┐
   │ Identity     │ Compliance           │ Freeze              │
   │ isVerified() │ canTransfer()        │ unfrozen ≥ amount   │
   │ KYC holder   │ holder/balance caps  │ wallet not frozen   │
   └──────────────┴──────────────────────┴─────────────────────┘
        │ all pass → transfer + auto dividend settle
        │ any fail → revert (NotVerified / ComplianceFailure / WalletFrozen)
```

- **transfer** → all three gates
- **mint** → identity **and** compliance caps (primary issuance respects holder/balance limits)
- **forcedTransfer** → regulatory path; verified recipient only, bypasses global rules

### Pre-issuance diligence gate (Phase A)

Before any deploy/mint, the agent runs **read-only, zero-gas** `cast` checks. Every conclusion is evidence-backed — command, raw result, inference, flag — written to `state.diligence`. **RED blocks all issuance.**

| Check | Command | RED trigger |
|---|---|---|
| `denylist` | `state.config.denylist` match | hit → **risk → RED** |
| `code_size` | `cast codesize <target>` | contract self-destructed (size==0) → **RED** |
| `is_contract` | `cast code <target>` | bytecode present → warn (review) |
| `balance` / `tx_count` | `cast balance` · `cast nonce` | zero balance or zero nonce → warn |

Full playbook: [`references/onchain-diligence.md`](./references/onchain-diligence.md)

### Four modules in one contract (future-split ready)

Function & event naming strictly follows **ERC-3643 (T-REX)** so the contract can smoothly split into a standard multi-contract suite later:

- **IdentityRegistry** — `isVerified` / `registerIdentity` / `removeIdentity`
- **ModularCompliance** — `canTransfer` / `maxHolders` / `maxBalancePerInvestor`
- **Lifecycle** — freeze / `forcedTransfer` / `recoveryAddress` / pause
- **Dividends** — `depositDividend` / `claimDividend` / `sweepUndistributedDividend`

**Permission matrix**: `onlyOwner` (governance, dividends, dust sweep) vs `onlyAgent` (KYC, mint, freeze, regulatory paths) — full table in [`docs/SECURITY.md`](./docs/SECURITY.md).

## Reviewed like production infrastructure, not a hackathon demo

The strength of HatchFi isn't just the code — it's the **process the code survived**. Before submission it went through a full compliance + security + production-readiness review loop, and every issue was fixed *with a regression test* or explicitly documented.

| Review gate | Outcome |
|---|---|
| **TDD test suite** | **24 Foundry tests, 0 failed**, including a **fuzz invariant** proving dividends can never over-distribute (`claimable + dust ≤ deposit`) |
| **Independent security audit** ([`docs/SECURITY.md`](./docs/SECURITY.md)) | **8 findings surfaced, all fixed or documented** — each fix pinned by a named regression test |
| **Compliance review** | Caught a **compliance-critical** gap (`mint` bypassing holder/balance caps) and closed it — issuance now enforces the same `canTransfer` rules as transfers |
| **Production-readiness audit** | Scored **Strong (88/100)** — no submission blockers |
| **Adversarial (red-team) review** | A skeptic pass flagged doc/packaging risks; **all resolved** before submission |
| **On-chain verification** | `preflight → deploy → smoke` on Atlantic, every receipt asserted `status == 1` |

Highlighted fixes from the audit (all test-covered):

- **D2 · compliance-critical** — `mint` now enforces `maxHolders` + `maxBalancePerInvestor`, so primary issuance can't breach the compliance envelope.
- **F1 · burn underflow** — `burn` rebalances `_frozenTokens` so a partially-frozen holder can't get their account locked.
- **D3 / D4 · dividend integrity** — integer-division dust is recoverable via `sweepUndistributedDividend`; wallet recovery migrates unclaimed dividends.

A least-privilege **permission matrix** (`onlyOwner` governance vs `onlyAgent` operations) and a 12-event audit trail back it up — full table in [`docs/SECURITY.md`](./docs/SECURITY.md).

## Built to be operated by an agent

HatchFi is a Pharos **Skill**, not a script. The agent follows [`SKILL.md`](./SKILL.md) with real operational discipline:

- **Diligence-first** — RED rating or failed checks block issuance, with evidence
- **Risk tiers** — 🟢 auto · 🟡 audit trail · 🔴 human confirm card before deploy/mint/dividend
- **Consent gates** — 🔑 explicit consent before depositing personal data or sharing a Skill (with a permission manifest)
- **Receipt assertions** — every write verifies `status==1` before continuing
- **Audit memory** — `state.json` records diligence, onboarding, dividends, and history — owner-private by default
- **Key safety** — private key via env only, never committed

## Run it yourself

```bash
curl -L https://foundry.paradigm.xyz | bash && foundryup
forge install OpenZeppelin/openzeppelin-contracts@v5.1.0 && forge install foundry-rs/forge-std

npm run build && npm run test     # 24 passed
npm run check                     # no hardcoded keys

export PRIVATE_KEY=0x...          # local only, never committed
export PHAROS_RPC_URL=https://atlantic.dplabs-internal.com
npm run preflight:pharos
npm run deploy:pharos
npm run smoke:pharos
npm run spawn:asset               # → skills/MPF-asset/  (the flywheel)
```

Detailed walkthroughs: [`QUICKSTART.md`](./docs/QUICKSTART.md) · [`WORKED_EXAMPLE.md`](./docs/WORKED_EXAMPLE.md) · [`VALIDATION_PLAN.md`](./docs/VALIDATION_PLAN.md)

## For judges — verify in 60 seconds

| Step | Action |
|---|---|
| **On-chain** | [PharosScan · MPF contract](https://atlantic.pharosscan.xyz/address/0xfef7519bebda6c47af49583dbc9e60801f8aa3de) · [Deploy tx](https://atlantic.pharosscan.xyz/tx/0x71ebe568c6d41390cfc6b6f452c30c85d38d0b4ddead941d19383a7e39417e4d) · [Smoke mint](https://atlantic.pharosscan.xyz/tx/0x7ece3b86646685fbf9312bf91b68fc18ae694c3ccd50e8fdba148d6348bb5541) |
| **Spawned skill** | [`skills/MPF-asset/SKILL.md`](./skills/MPF-asset/SKILL.md) — child skill with hardcoded `TOKEN=0xfef7…` |
| **Local (2 min)** | `git clone` → `npm run build && npm run test` → **24 passed · 0 failed** |
| **Dashboard** | [Interactive overview (EN/中文)](https://htmlpreview.github.io/?https://github.com/rachelzzz1921/hatchfi-pharos-skill/blob/main/SUBMISSION_DASHBOARD.html) |

**Why HatchFi for finals:** live Atlantic deploy · ERC-3643 compliance + diligence gate · 24 tests + 8-finding audit all fixed · Skill→Skill flywheel proven (MPF-asset) · extends official Skill Engine · data sovereignty with opt-in ecosystem · production-readiness **Strong 88/100**.

## Documentation

| Doc | What's inside |
|---|---|
| [`SKILL.md`](./SKILL.md) | Agent entry — capability index, pre-checks, risk tiers |
| [Live Dashboard](https://htmlpreview.github.io/?https://github.com/rachelzzz1921/hatchfi-pharos-skill/blob/main/SUBMISSION_DASHBOARD.html) | Visual overview with EN/中文 toggle |
| [`docs/COMPLETED_VALIDATION.md`](./docs/COMPLETED_VALIDATION.md) | Local + on-chain validation evidence |
| [`DEPLOYMENT_RESULT.md`](./DEPLOYMENT_RESULT.md) | Deploy + smoke record (generated) |
| [`docs/SECURITY.md`](./docs/SECURITY.md) | Audit findings & fixes |
| [`docs/PHAROS_VISION.md`](./docs/PHAROS_VISION.md) | RealFi / Agentic vision alignment |
| [`docs/SUBMISSION.md`](./docs/SUBMISSION.md) | Hackathon submission write-up |
| [`docs/BRAND.md`](./docs/BRAND.md) | HatchFi brand kit |

## Repository layout

```
SKILL.md                       Agent entry: intent → capability → risk → reference
src/CompliantRWAToken.sol      ERC-3643-style RWA token (20 external fns / 12 events / 5 errors)
test/CompliantRWAToken.t.sol   24 tests (incl. fuzz invariant)
script/Deploy.s.sol            Foundry deploy script
references/                    7 cast/forge command references (the agent's playbooks)
scripts/                       preflight / post-deploy / smoke / verify / spawn automation
skills/MPF-asset/              ← spawned asset Skill (the flywheel artifact)
assets/                        brand logo + token/network registries + contract snapshot
deployments/pharos.json        on-chain deployment record (generated)
state.schema.json              cross-step agent memory + audit trail schema
docs/                          narrative & submission docs (see table above)
SUBMISSION_DASHBOARD.html      visual dashboard with EN/中文 toggle
```

---

<div align="center">

Built by **Zhiwei Chen (陈知维)** · Researcher at The Chinese University of Hong Kong

Pharos Skill-to-Agent Hackathon 2026 · [Register](https://bit.ly/4xkU0Wx) · [Agent Carnival](https://www.pharos.xyz/agent-carnival) · [Skill Engine](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide) · [Discord](https://discord.com/invite/pharos) · [Telegram](https://t.me/+U27f5oGnJNlkZTI0)

</div>
