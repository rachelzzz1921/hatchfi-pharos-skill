<div align="center">

<img src="./assets/brand/logo.png" alt="HatchFi" width="132" height="132" />

# HatchFi · 链孵

### Where compliant RWAs hatch into Agent Skills.

Every RWA you hatch leaves a reusable Skill behind.

[![tests](https://img.shields.io/badge/Foundry-24_passed-3dd68c?style=flat-square)](./COMPLETED_VALIDATION.md)
[![live](https://img.shields.io/badge/Pharos_Atlantic-LIVE-2dd4bf?style=flat-square)](https://atlantic.pharosscan.xyz/address/0xfef7519bebda6c47af49583dbc9e60801f8aa3de)
[![flywheel](https://img.shields.io/badge/Skill→Skill-flywheel_proven-c9a227?style=flat-square)](./skills/MPF-asset/SKILL.md)
[![standard](https://img.shields.io/badge/ERC--3643-style-0b3d2e?style=flat-square)](./src/CompliantRWAToken.sol)

**🌐 English**  ·  [中文](./README.zh.md)  ·  📊 [Live Dashboard](https://htmlpreview.github.io/?https://github.com/rachelzzz1921/hatchfi-pharos-skill/blob/main/SUBMISSION_DASHBOARD.html)

</div>

---

## The problem nobody wants to touch

Issuing a real-world asset on-chain is **not** "deploy a token." A regulated RWA has to answer hard questions *inside the token itself*:

> Who is allowed to hold it? Who can they transfer to? What happens to a sanctioned wallet? How is yield distributed and audited?

Standard ERC-20 answers none of these. Most "RWA" hackathon projects stop at a mint button — and quietly skip compliance, lifecycle, and the part where an **agent** actually operates the asset over time.

## What HatchFi does

HatchFi is an **agent-native issuance layer** for compliant RealFi on Pharos. It turns regulated RWA launch into a workflow an AI agent can run end-to-end, verify on-chain, and — this is the key part — **leave behind as a reusable Skill**.

```
①  Diligence Gate   →   ②  Compliant Issuance   →   ③  Skill Hatch
   read-only risk          ERC-3643 token, live         spawn skills/<SYMBOL>-asset/
   GREEN/YELLOW/RED         on Pharos Atlantic            reusable by any agent
   RED blocks issuance      dual transfer gate            no redeploy needed
```

## The flywheel — why this compounds

This is the part judges should remember.

Most issuance tools produce **one** deployed token and stop. HatchFi produces a deployed token **plus a reusable agent Skill** for that exact asset — with the contract address and command set already baked in.

```
HatchFi (parent skill)
  └── issues MPF on Atlantic  ──spawn──►  skills/MPF-asset/   ◄── any agent imports this
        └── issues next RWA   ──spawn──►  skills/<NEXT>-asset/     and operates the asset
                                                                    (whitelist, mint, dividends)
                                                                    WITHOUT redeploying
```

> **More RWAs hatched → more reusable Skills → the marginal cost of compliant RealFi on Pharos trends toward zero.**

It is already proven, not theoretical: issuing **MPF** automatically produced [`skills/MPF-asset/`](./skills/MPF-asset/SKILL.md), a standalone Skill another agent can run today.

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

Backed by **24 Foundry tests** (including a fuzz invariant) and a [`SECURITY.md`](./SECURITY.md) audit trail with fixes for burn underflow, dividend dust, and frozen-token edge cases.

## Built to be operated by an agent

HatchFi is a Pharos **Skill**, not a script. The agent follows [`SKILL.md`](./SKILL.md) with real operational discipline:

- **Diligence-first** — RED rating or failed checks block issuance, with evidence
- **Risk tiers** — 🟢 auto · 🟡 audit trail · 🔴 human confirm card before deploy/mint/dividend
- **Receipt assertions** — every write verifies `status==1` before continuing
- **Audit memory** — `state.json` records diligence, onboarding, dividends, and history
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

Detailed walkthroughs: [`QUICKSTART.md`](./QUICKSTART.md) · [`WORKED_EXAMPLE.md`](./WORKED_EXAMPLE.md) · [`VALIDATION_PLAN.md`](./VALIDATION_PLAN.md)

## Documentation

| Doc | What's inside |
|---|---|
| [`SKILL.md`](./SKILL.md) | Agent entry — capability index, pre-checks, risk tiers |
| [Live Dashboard](https://htmlpreview.github.io/?https://github.com/rachelzzz1921/hatchfi-pharos-skill/blob/main/SUBMISSION_DASHBOARD.html) | Visual overview with EN/中文 toggle |
| [`COMPLETED_VALIDATION.md`](./COMPLETED_VALIDATION.md) | Local + on-chain validation evidence |
| [`DEPLOYMENT_RESULT.md`](./DEPLOYMENT_RESULT.md) | Deploy + smoke record |
| [`SECURITY.md`](./SECURITY.md) | Audit findings & fixes |
| [`PHAROS_VISION.md`](./PHAROS_VISION.md) | RealFi / Agentic vision alignment |
| [`BRAND.md`](./BRAND.md) | HatchFi brand kit |

## Repository layout

```
SKILL.md                       Agent entry: intent → capability → risk → reference
src/CompliantRWAToken.sol      ERC-3643-style RWA token (20 external fns / 12 events / 5 errors)
test/CompliantRWAToken.t.sol   24 tests (incl. fuzz invariant)
references/                    7 cast/forge command references
script/ · scripts/             deploy script + preflight/smoke/verify/spawn automation
skills/MPF-asset/              ← spawned asset Skill (the flywheel artifact)
state.schema.json              cross-step agent memory + audit trail schema
```

---

<div align="center">

Built by **Zhiwei Chen (陈知维)** · Researcher at The Chinese University of Hong Kong
Pharos Skill-to-Agent Hackathon · 2026

</div>
