<div align="center">

<img src="./assets/brand/logo.png" alt="HatchFi" width="132" height="132" />

# HatchFi · 链孵

### Where compliant RWAs hatch into Agent Skills.

Issue a compliant RWA on Pharos with an AI agent — and keep a private operating Skill for that asset that improves as you use it.

[![tests](https://img.shields.io/badge/Foundry-24_passed-3dd68c?style=flat-square)](./docs/COMPLETED_VALIDATION.md)
[![eval](https://img.shields.io/badge/skill_eval-50%2F50-3dd68c?style=flat-square)](./eval/skill_behavior_cases.json)
[![live](https://img.shields.io/badge/Pharos_Atlantic-deployed-2dd4bf?style=flat-square)](https://atlantic.pharosscan.xyz/address/0xfef7519bebda6c47af49583dbc9e60801f8aa3de)
[![skill](https://img.shields.io/badge/hatched_Skill-private-c9a227?style=flat-square)](./skills/MPF-asset/SKILL.md)
[![inspector](https://img.shields.io/badge/Skill_Inspector-8%2F100_LOW-3dd68c?style=flat-square)](./docs/SKILL_SECURITY_REPORT.md)
[![standard](https://img.shields.io/badge/ERC--3643-style-0b3d2e?style=flat-square)](./src/CompliantRWAToken.sol)

**🌐 English**  ·  [中文](./README.zh.md)  ·  📊 [Live Dashboard](https://htmlpreview.github.io/?https://github.com/rachelzzz1921/hatchfi-pharos-skill/blob/main/SUBMISSION_DASHBOARD.html)

Built for the [Pharos Skill Engine](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide) · works on Pharos Atlantic Testnet

</div>

---

## What is HatchFi

HatchFi is an **agent-native issuance layer** for compliant RealFi on Pharos. It packages the full lifecycle of a regulated real-world asset — pre-issuance diligence, ERC-3643-style compliant issuance, lifecycle ops, yield distribution, on-chain audit — into a Pharos **Skill** that an AI agent can run end-to-end.

When an asset is issued, HatchFi also **spawns a private operating Skill for that exact asset** (contract address and commands baked in). You then operate the asset in natural language, and that Skill keeps a private preference profile that you can refine over time.

```
①  Diligence Gate   →   ②  Compliant Issuance   →   ③  Skill Hatch (yours)
   read-only risk          ERC-3643 token, deployed     spawn skills/<SYMBOL>-asset/
   GREEN/YELLOW/RED         on Pharos Atlantic           private-by-default · serves you
   RED blocks issuance      identity·compliance·freeze   refine via conversation
```

It extends the official [Pharos Skill Engine](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide) — keeping `assets/networks.json`, write pre-checks, and `pharos-base-ops.md`, and adding RWA-specific playbooks, a spawn/refine pipeline, a contract-surface generator, an eval harness, and a static security gate on top.

> This project began as a **Pharos Skill-to-Agent Hackathon 2026** submission, built for the Pharos RealFi chain. Full submission narrative and verification evidence: [Live Dashboard](./SUBMISSION_DASHBOARD.html) · [`docs/SUBMISSION.md`](./docs/SUBMISSION.md).

---

## Quick start

```bash
# 1 · toolchain
curl -L https://foundry.paradigm.xyz | bash && foundryup
forge install OpenZeppelin/openzeppelin-contracts@v5.1.0 && forge install foundry-rs/forge-std

# 2 · build + verify locally (no wallet needed)
npm run build && npm run test       # 24 Foundry tests
npm run eval:skill                  # 50 deterministic skill checks
npm run inspect:skill               # static security scan
npm run check                       # full local gate (build · test · refs · eval · inspector)
```

To deploy and operate on Pharos Atlantic:

```bash
export PRIVATE_KEY=0x...                                   # local only, never committed
export PHAROS_RPC_URL=https://atlantic.dplabs-internal.com
npm run preflight:pharos            # chainId 688689 + balance pre-checks
npm run deploy:pharos               # deploy → deployments/pharos.json
npm run smoke:pharos                # registerIdentity + mint + receipt assert
npm run spawn:asset                 # → skills/<SYMBOL>-asset/  (your private operating Skill)
```

Walkthroughs: [`QUICKSTART.md`](./docs/QUICKSTART.md) · [`WORKED_EXAMPLE.md`](./docs/WORKED_EXAMPLE.md)

---

## How to use it — command reference

HatchFi is operated through `npm` scripts that wrap Foundry, `cast`, and the agent tooling. Grouped by what you're doing:

### Build & verify

| Command | What it does |
|---|---|
| `npm run build` | `forge build` |
| `npm run test` | 24 Foundry tests (incl. a fuzz invariant on dividends) |
| `npm run check` | Full local gate: build · test · key check · refs drift · eval · inspector |

### Deploy & operate on-chain

| Command | What it does |
|---|---|
| `npm run preflight:pharos` | Verify chainId `688689`, deployer balance, env before any write |
| `npm run deploy:pharos` | Deploy `CompliantRWAToken`, record `deployments/pharos.json` |
| `npm run smoke:pharos` | `registerIdentity` + `mint`, asserting `receipt.status == 1` (idempotent) |
| `npm run verify:pharos` | Re-read on-chain state for reconciliation |

### Spawn & evolve the asset Skill

| Command | What it does |
|---|---|
| `npm run spawn:asset` | Generate `skills/<SYMBOL>-asset/` from the deployed asset (deterministic template fill) |
| `npm run refine:asset` | Refine the Skill from `state.personalization` → writes `PREFERENCES.md` (no redeploy) |
| `npm run spawn:versions` | List archived versions under `skills/<SYMBOL>-asset/versions/` |
| `npm run spawn:rollback <id>` | Roll back the Skill to an archived version (current state archived first) |

### Generate references from the contract

| Command | What it does |
|---|---|
| `npm run refs:generate` | Parse `CompliantRWAToken.sol` → `references/generated/contract-surface.{md,json}` |
| `npm run refs:check` | Same, but fails if the manual cheat sheet drifts from the parsed contract |

### Evaluate the Skill

| Command | What it does |
|---|---|
| `npm run eval:skill` | 50 deterministic checks: diligence gate, risk tiers, consent gates, spawn structure |
| `npm run eval:skill:json` | Same suite, machine-readable JSON |

### Security gate (before install / upload / publish / share)

| Command | What it does |
|---|---|
| `npm run inspect:skill` | Static-only scan — prompt injection, secrets, dangerous patterns, Web3/Solidity risks |
| `npm run inspect:skill:md` / `:json` | Write report to `docs/SKILL_SECURITY_REPORT.{md,json}` |
| `npm run publish:check` | Inspector + full `check.sh` — run this before sharing |

---

## The pipeline an agent runs

```
Phase A  Diligence Gate     →  Phase B  Compliant Issuance  →  Phase C  Lifecycle Ops     →  Phase D  Skill Hatch        →  Phase E  Security Gate
         read-only cast            deploy ERC-3643 token            whitelist / freeze / mint     spawn skills/MPF-asset/     static-only inspector
         GREEN/YELLOW/RED          identity·compliance·freeze       dividends / recovery / audit  refine · version · rollback prompt/secret/Web3/Solidity
         RED blocks issuance       24 tests + audit trail           cast logs (12 events)         PERMISSIONS.md · private    block critical/high
```

**7 agent playbooks** in `references/`: `onchain-diligence` · `rwa-issuance` · `rwa-dividend` · `spawn-asset-skill` · `pharos-base-ops` · `pharos-deploy-runbook` · `pharos-verification`

**Auto-generated contract surface** (`npm run refs:generate`): 30 callable entries (external/public functions + public getters) · 12 ERC-3643-aligned events · 5 typed errors · 24 Foundry tests including a fuzz invariant.

---

## Compliance is the base, not an afterthought

The contract is **ERC-3643-style** (T-REX). Every transfer is forced through a triple gate in the `_update()` hook:

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

Before any deploy/mint, the agent runs **read-only, zero-gas** `cast` checks. Each conclusion is evidence-backed — command, raw result, inference, flag — written to `state.diligence`. **A RED rating blocks all issuance.**

| Check | Command | RED trigger |
|---|---|---|
| `denylist` | `state.config.denylist` match | hit → **risk → RED** |
| `code_size` | `cast codesize <target>` | contract self-destructed (size==0) → **RED** |
| `is_contract` | `cast code <target>` | bytecode present → warn (review) |
| `balance` / `tx_count` | `cast balance` · `cast nonce` | zero balance or zero nonce → warn |

Full playbook: [`references/onchain-diligence.md`](./references/onchain-diligence.md)

### Four modules in one contract (future-split ready)

Function and event names follow **ERC-3643 (T-REX)** so the contract can be split into a standard multi-contract suite later:

- **IdentityRegistry** — `isVerified` / `registerIdentity` / `removeIdentity`
- **ModularCompliance** — `canTransfer` / `maxHolders` / `maxBalancePerInvestor`
- **Lifecycle** — freeze / `forcedTransfer` / `recoveryAddress` / pause
- **Dividends** — `depositDividend` / `claimDividend` / `sweepUndistributedDividend`

**Permission matrix**: `onlyOwner` (governance, dividends, dust sweep) vs `onlyAgent` (KYC, mint, freeze, regulatory paths) — full table in [`docs/SECURITY.md`](./docs/SECURITY.md).

---

## The Skill that grows with you

Most issuance tools produce one deployed token and stop. HatchFi produces a deployed token **plus a private operating Skill** for that exact asset — contract address and command set baked in. As you operate the asset in natural language, the Skill keeps a private preference profile (jurisdictions, holder caps, dividend cadence, disclosure templates) that you can refine over time.

```
HatchFi (parent skill)
  └── issues MPF on Atlantic  ──spawn──►  skills/MPF-asset/   ◄── serves you first
        └── you keep operating it ──refine──►  better-fit Skill   (whitelist, mint, dividends)
                                                                   WITHOUT redeploying
```

The spawn pipeline is deterministic and versioned (inspired by version-managed skill tooling):

- **`spawn:asset`** fills templates from `state.asset` — no LLM guessing — and archives any prior version.
- **`refine:asset`** writes a private `PREFERENCES.md` overlay from `state.personalization`, bumping a version counter in `meta.json` with an `evolution[]` audit trail.
- **`spawn:versions` / `spawn:rollback`** list and restore archived snapshots under `versions/`.

Each spawned Skill also carries an auto-generated `<SYMBOL>-contract-surface.md`, kept in sync with the on-chain contract via `refs:generate`.

### You own the data. Sharing is your call.

Everything the Skill accumulates — investor identities, diligence evidence, dividend detail, your preferences — is **yours and private by default**. It lives in your local `state.json` (gitignored), never on-chain, never bundled into a shareable package.

- 🔑 **Deposit consent** — before any personal/sensitive info is recorded, the agent asks.
- 🔑 **Share consent** — opening a Skill or any data scope to others is an explicit opt-in that emits a **permission manifest** (exactly what's *exposed* vs *withheld*). See [`PERMISSIONS.md`](./skills/MPF-asset/PERMISSIONS.md).

> **Sharing a Skill ≠ sharing your data.** A spawned Skill carries only the public operating surface (contract address + commands); your sovereign ledger (`state.json`, including `PREFERENCES.md`) stays on your machine unless you choose otherwise.

Issuing **MPF** automatically produced [`skills/MPF-asset/`](./skills/MPF-asset/SKILL.md) — a private, ready-to-operate Skill with a permission manifest. When an issuer *chooses* to open one, it's a vetted, compliance-ready operating unit — contract baked in, diligence/issuance/dividend playbooks included, zero PII bundled. That's how opt-in sharing could gradually seed a permissioned RealFi network on Pharos, on each owner's terms.

---

## Built to be operated by an agent

HatchFi is a Pharos **Skill**, not a script. The agent follows [`SKILL.md`](./SKILL.md) with operational discipline:

- **Diligence-first** — a RED rating or failed checks block issuance, with evidence
- **Risk tiers** — 🟢 auto · 🟡 audit trail · 🔴 human confirm card before deploy/mint/dividend
- **Consent gates** — 🔑 explicit consent before depositing personal data or sharing a Skill (with a permission manifest)
- **Skill Inspector gate** — static scan before install/upload/publish/share; critical/high findings block release
- **Receipt assertions** — every write verifies `status==1` before continuing
- **Audit memory** — `state.json` records diligence, onboarding, dividends, and history — owner-private by default
- **Key safety** — private key via env only, never committed

---

## Validation

Before release, HatchFi went through a layered review loop. Issues found were fixed *with a named regression test* or explicitly documented.

| Review gate | Outcome |
|---|---|
| **TDD test suite** | 24 Foundry tests, 0 failed, including a fuzz invariant proving dividends can't over-distribute (`claimable + dust ≤ deposit`) |
| **Skill eval suite** | `npm run eval:skill` — 50/50 deterministic checks on gates, risk tiers, consent, and spawn structure |
| **Security review** ([`docs/SECURITY.md`](./docs/SECURITY.md)) | 8 findings surfaced, all fixed or documented — each fix pinned by a named regression test |
| **Compliance review** | Found and closed a compliance-critical gap (`mint` bypassing holder/balance caps) — issuance now enforces the same `canTransfer` rules as transfers |
| **Production-readiness review** | Scored Strong (88/100), with the remaining items documented |
| **Pharos Skill Inspector** | [`8/100 LOW`](./docs/SKILL_SECURITY_REPORT.md) — 0 critical / 0 high / 0 medium blockers |
| **On-chain verification** | `preflight → deploy → smoke` on Atlantic, every receipt asserted `status == 1` |

Selected fixes (all test-covered):

- **D2 · compliance-critical** — `mint` now enforces `maxHolders` + `maxBalancePerInvestor`, so primary issuance can't breach the compliance envelope.
- **F1 · burn underflow** — `burn` rebalances `_frozenTokens` so a partially-frozen holder can't get locked out.
- **D3 / D4 · dividend integrity** — integer-division dust is recoverable via `sweepUndistributedDividend`; wallet recovery migrates unclaimed dividends.

---

## Verify on-chain

HatchFi is deployed and smoke-tested on Pharos Atlantic.

| | |
|---|---|
| **Contract (MPF)** | [`0xfef7519bebda6c47af49583dbc9e60801f8aa3de`](https://atlantic.pharosscan.xyz/address/0xfef7519bebda6c47af49583dbc9e60801f8aa3de) |
| **Deploy tx** | [`0x71ebe5…17e4d`](https://atlantic.pharosscan.xyz/tx/0x71ebe568c6d41390cfc6b6f452c30c85d38d0b4ddead941d19383a7e39417e4d) |
| **Smoke mint tx** | [`0x7ece3b…b5541`](https://atlantic.pharosscan.xyz/tx/0x7ece3b86646685fbf9312bf91b68fc18ae694c3ccd50e8fdba148d6348bb5541) |
| **Network** | Pharos Atlantic Testnet · chainId `688689` |
| **Spawned Skill** | [`skills/MPF-asset/SKILL.md`](./skills/MPF-asset/SKILL.md) — child skill with `TOKEN=0xfef7…` baked in |

A reviewer can confirm everything in ~2 minutes: `git clone` → `npm run build && npm run test` (24 passed) → `npm run eval:skill` (50/50) → open the contract on PharosScan.

---

## What's included

- ERC-3643-style RWA contract deployed on Pharos Atlantic, with a read-only diligence gate that can block issuance
- A full agent Skill (`SKILL.md` + 7 references) that extends the official Pharos Skill Engine
- A deterministic spawn → refine → version pipeline that leaves the issuer a private, evolving operating Skill
- An auto-generated contract-surface reference kept in sync with the Solidity source
- A 50-check eval harness and a static Skill Inspector security gate
- 24 Foundry tests, a security review with all findings addressed, and data sovereignty with opt-in sharing

---

## Documentation

| Doc | What's inside |
|---|---|
| [`SKILL.md`](./SKILL.md) | Agent entry — capability index, pre-checks, risk tiers |
| [Live Dashboard](https://htmlpreview.github.io/?https://github.com/rachelzzz1921/hatchfi-pharos-skill/blob/main/SUBMISSION_DASHBOARD.html) | Submission overview & verification evidence (EN/中文) |
| [`docs/SUBMISSION.md`](./docs/SUBMISSION.md) | Hackathon submission narrative |
| [`references/spawn-asset-skill.md`](./references/spawn-asset-skill.md) | Spawn / refine / version / auto-refs / eval playbook |
| [`eval/skill_behavior_cases.json`](./eval/skill_behavior_cases.json) | Eval case definitions |
| [`docs/COMPLETED_VALIDATION.md`](./docs/COMPLETED_VALIDATION.md) | Local + on-chain validation evidence |
| [`DEPLOYMENT_RESULT.md`](./DEPLOYMENT_RESULT.md) | Deploy + smoke record (generated) |
| [`docs/SECURITY.md`](./docs/SECURITY.md) | Audit findings & fixes |
| [`docs/SKILL_SECURITY_REPORT.md`](./docs/SKILL_SECURITY_REPORT.md) | Pre-publish Pharos Skill Inspector report |
| [`docs/PHAROS_VISION.md`](./docs/PHAROS_VISION.md) | RealFi / Agentic vision alignment |
| [`docs/BRAND.md`](./docs/BRAND.md) | HatchFi brand kit |

## Repository layout

```
SKILL.md                       Agent entry: intent → capability → risk → reference
src/CompliantRWAToken.sol      ERC-3643-style RWA token
test/CompliantRWAToken.t.sol   24 tests (incl. fuzz invariant)
script/Deploy.s.sol            Foundry deploy script
references/                    7 cast/forge command playbooks for the agent
references/generated/          auto-generated contract surface (refs:generate)
eval/skill_behavior_cases.json eval harness case definitions
scripts/                       preflight / smoke / verify / spawn / refine / refs / eval / inspector
scripts/skill_inspector.py     static security gate before install / upload / publish / share
skills/MPF-asset/              spawned asset Skill (SKILL.md · PERMISSIONS.md · PREFERENCES.md · meta.json · versions/)
assets/                        brand logo + token/network registries + contract snapshot
deployments/pharos.json        on-chain deployment record (generated)
state.schema.json              cross-step agent memory + audit trail schema
docs/                          narrative & reference docs (see table above)
SUBMISSION_DASHBOARD.html      visual dashboard with EN/中文 toggle
```

---

<div align="center">

Built by **Zhiwei Chen (陈知维)** · Researcher at The Chinese University of Hong Kong

HatchFi began as a project for the Pharos Skill-to-Agent Hackathon 2026, and is built to serve the Pharos RealFi chain.

[Pharos Skill Engine Guide](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide) · [Pharos Docs](https://docs.pharos.xyz)

</div>
