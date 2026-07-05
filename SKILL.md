# Compliant RWA Issuance Agent

> A Pharos-native skill for compliant RWA (real-world asset) issuance: pre-issuance **diligence gate**, ERC-3643-style **compliant issuance & lifecycle management**, **yield distribution**, and **on-chain audit evidence** — end-to-end asset coverage. Compliance, diligence, and auditability are the hard foundation of this agent.
>
> **Built for the issuer first**: after issuance, the agent materializes a **private operating skill** for that asset and keeps refining it through natural-language interaction — the more you use it, the better it fits that issuer's RWA workflow. The skill and accumulated data **belong to the issuer by default and stay private**; any external sharing or sensitive-data deposition requires **explicit consent** (see "Data sovereignty & consent gates").
>
> Execution stack: Foundry (`cast` / `forge`). Network config: `assets/networks.json` (Atlantic testnet by default).
> Contract source of truth: `assets/rwa/CompliantRWAToken.sol`. Cross-step state: `state.json` (schema in `state.schema.json`, includes ownership / consent / personalization).
> This skill **extends the Pharos Skill Engine spec**: keeps Engine `assets/networks.json` and write-operation preflight; RWA-specific operations are indexed below and in `references/rwa-*.md`.

---

## Capability Index — verify in 60 seconds (intent → command → evidence)

> Judge quickstart. **No wallet or private key required** for any command below (Foundry is needed only for `build`/`test`). The full operational capability index (intent → capability → risk tier → reference) is further down.

| Intent | Command | Evidence you'll see |
|---|---|---|
| ✅ One-shot judge check | `npm run judge:package` | `gate:test` PASS · narrated RED→GREEN CLI · `TOOLS 8` · readiness summary |
| 🚦 Diligence gate blocks a sanctioned issuer, then admits a clean one | `npm run gate:cli` | OFAC hit → **RED, mint denied** → attest → **GREEN, mint allowed** → flip flag → denied again |
| 🔌 Gate + live on-chain reads as agent tools (MCP) | `npm run mcp:probe` | `TOOLS 8` (5 gate + 3 read-only on-chain), `MINT allowed=true attested=true`, live token metadata |
| 🧪 Compliance contract suite | `npm run build && npm run test` | 36 Foundry tests pass (identity · two checks · freeze · two-phase recovery · dividends) |
| 📊 Behavioral evals (deterministic, no LLM) | `npm run eval:skill` | `64/64` |
| 🔒 Security self-scan before publish | `npm run inspect:skill` | 0 critical / 0 high |
| 🌐 Live on Pharos Atlantic | [PharosScan](https://atlantic.pharosscan.xyz/address/0xfef7519bebda6c47af49583dbc9e60801f8aa3de) | deployed `CompliantRWAToken` + Mock OFAC oracle |

---

## Prerequisites

1. Foundry installed: `which cast && which forge`
2. Private key via env only: `export PRIVATE_KEY=0x...` (**never** hardcode or commit)
3. Network variables (from `assets/networks.json`):
   ```bash
   export RPC=https://atlantic.dplabs-internal.com
   export CHAIN_ID=688689
   export PK=$PRIVATE_KEY
   export DEPLOYER=$(cast wallet address --private-key $PK)
   ```
4. Generic Pharos query / transfer / deploy syntax: → `references/pharos-base-ops.md` (aligned with official Skill Engine four-layer references)

> ⚠️ Foundry does **not** auto-read `$PRIVATE_KEY`. Every `cast` / `forge` command must pass `--private-key $PK` explicitly.

---

## New Primitive Surface (judge-facing)

HatchFi now exposes a reusable deterministic gate module under `lib/hatchfi-gate/`:

- `diligence_screen`
- `diligence_rate`
- `diligence_gate_mint`
- `diligence_get_attestation`
- `diligence_attest`

The MCP server also ships **read-only on-chain tools** (no key / no funds — `cast call` equivalents over the live deployed token):

- `rwa_token_metadata` — name / symbol / totalSupply / holderCount / caps
- `rwa_is_verified` — is an address a KYC-registered holder?
- `rwa_can_transfer` — ERC-3643 transfer-compliance pre-check (allowed + reason)

Validation commands:

```bash
npm run gate:test
npm run gate:cli
npm run gate:demo
npm run judge:readiness
npm run web:dev
```

MCP server:

```bash
npm run mcp
```

---

## Write Operation Pre-checks (four steps — do not skip)

| Step | Command | Pass condition |
|---|---|---|
| 1 Key | `cast wallet address --private-key $PK` | Valid address output |
| 2 Network | `cast chain-id --rpc-url $RPC` | Equals `688689` (Atlantic) |
| 3 Balance | `cast balance $DEPLOYER --rpc-url $RPC --ether` | `> 0`, enough for one tx gas (testnet minimum is fine — do not require a large reserve for deploy/ops) |
| 4 Diligence gate | Read `state.json` → `diligence.passed` | Issuance 🔴 ops require `true` and not RED |

> Balance exception: only `depositDividend` additionally requires `balance ≥ dividend amount` (via `--value`). Other writes (deploy / mint / burn / register / freeze) only consume gas — **do not refuse deploy because balance is "too small"**.

After passing, run the write command; then **must** `cast receipt <txhash>` and assert `status==1`.

---

## Pipeline overview

```
┌─────────────┐      ┌──────────────────┐      ┌──────────────────────┐
│ ① Diligence │ pass │ ② Compliant issue │ done │ ③ Private skill spawn  │
│ Read-only   │─────▶│ attest→deploy/mint│─────▶│ Self-serve · refine    │
│ 🟢 block RED│ RED  │ 🔴🟡 tier + confirm│      │ Private · share needs 🔑│
└─────────────┘ deny └──────────────────┘      └──────────────────────┘
       │                      │                          │
       └──── state.json throughout (memory + audit + preferences) ──┘
              optional on-chain evidence_hash (onchain-attestation.md)
```

Three stages are one pipeline and one complete agent: admission (diligence) → execution (compliant issuance) → **private operating asset for the issuer**.
The spawned skill serves the issuer first; external reuse is an **explicit, scoped opt-in**, not the default.

                              Personalization loop ◀──────┘
                       (NL → deposit prefs → next issue fits better)

### Diligence sub-pipeline (Stage 0 → 1 → 2 → attest)

Before any cast in Phase ①, run the three-stage diligence workflow:

```
Stage −1  distribution_eligibility (cheap geo gate)  →  offchain-diligence.md
Stage 0  Background + deposit consent  →  offchain-diligence.md
Stage 1  checks_run / skipped_checks  →  role matrix in docs/diligence/INTEGRATION.md
Stage 2  cast + local compares + rating →  onchain-diligence.md · sanctions-screening.md
Post-2  On-chain attestation (GREEN/YELLOW) →  onchain-attestation.md  (before deploy/mint)
```

- Set `state.diligence.target_role` — see role map in `offchain-diligence.md` (role aliases ISS/CUS/INT/INV/SUB map to HatchFi enum values).
- **ISS / underlying**: capture `legal_wrapper_profile`, `tokenization_rights`, **`duplicate_tokenization` (#19)**, **`liquidity_exit_path` (#20)** before mint.
- **INV / SUB**: run `distribution_eligibility` first — fail fast before PII collection.
- Off-chain PII (e.g. `kyc_expiry`) requires **deposit consent** before writing `state.diligence.background`.
- All on-chain + off-chain evidence merges into one `state.diligence.evidence[]`; rating remains pure function of flags.
- Compliance infer citations → `compliance-knowledge.md` · integration archive → `docs/diligence/INTEGRATION.md`.

---

## Data sovereignty & consent gates (private by default)

Data the issuer accumulates is **theirs**: diligence evidence, investor identity & holdings, dividend history, personalization — sovereign data, **private by default, never bundled, never on-chain, gitignored**. The operating skill serves the issuer first. Two consent gates constrain the agent:

- **🔑 Deposit consent**: before writing **personal/sensitive** data into private sections of `state.json` (whitelist / personalization), show a consent card explaining what will be recorded, why, and where (local only). Write only after `consent`. Routine audit trails (history / risk tier / txhash) are compliance obligations and do not need this gate.
- **🔑 Share consent**: before exposing any skill or data scope externally — including **generating a shareable sub-skill (with contract address)**, exporting a profile, or handing the skill to another person/agent — output a **permission manifest**: list **exposed** (contract address, commands) vs **withheld** (investor PII, diligence evidence, dividend detail, preferences). Execute only after `consent`. Without authorization, sub-skills and data are for the issuer only.

> Hard boundary: **sharing a sub-skill ≠ sharing your data**. Spawn carries only the public operating surface; the private ledger (`state.json`) is never copied into the package — referenced locally by path only.

## Personalization loop (skill improves with use)

Every natural-language interaction is a refinement opportunity: repeatedly confirmed preferences (jurisdictions, default holder caps, dividend cadence, disclosure templates, risk thresholds) are written to `state.personalization` after **deposit consent**. On the next issuance/operation the agent pre-fills from the profile and confirms deltas with the issuer — the skill grows with demand. Preferences are sovereign data, private by default; sharing requires **share consent**.

## Pre-install / upload / publish security gate (Pharos Skill Inspector)

A skill is not plain documentation: it can instruct the agent to read `$PRIVATE_KEY`, call `cast` / `forge`, broadcast txs, and connect to RPC. Before **installing, uploading, publishing, or sharing any skill or function package**, run the static security gate:

```bash
npm run inspect:skill       # terminal report
npm run inspect:skill:md    # docs/SKILL_SECURITY_REPORT.md
npm run inspect:skill:json  # machine-readable report
npm run publish:check       # inspect + full check.sh
```

This repo ships `scripts/skill_inspector.py` (zero runtime deps, static-only, does not execute target code). It detects:

- **Prompt injection**: instruction override, pre-check bypass, role hijack, hidden HTML/Unicode.
- **Data exfiltration**: hardcoded keys, env harvesting, secret logging.
- **Dangerous code**: dynamic execution in Python / JS / TS / shell, unsafe shell, external script execution.
- **Pharos/Web3 risks**: non-Pharos RPC, auto-broadcast, undeclared writes, unlimited ERC20 approval, private keys/seeds.
- **Solidity risks**: `tx.origin`, `selfdestruct`, `delegatecall`, unprotected withdraw, floating pragma.

Gate rule: `critical` / `high` block upload/publish; reports must redact secrets. Current scan: `docs/SKILL_SECURITY_REPORT.md` / `.json`.

## Agent discipline (follow before every operation)

1. **Diligence first**: before issuing to an unscreened address, run diligence; if `state.diligence.passed == false` or rating RED → refuse issuance and cite evidence. **Do not attest on-chain when RED** (`RedRatingNotAttestable`).
2. **Human confirm for high risk**: before 🔴 ops, output a confirmation card (operation / target / impact / pre-checks / next step); execute only after `confirm`.
3. **Consent first**: before 🔑 deposit / share, show consent card (share must include permission manifest); execute only after `consent`; record in `state.consent`. Default private — when unsure, do not deposit or share.
4. **Security gate before publish**: run `npm run publish:check` before install/upload/publish/share; stop on critical/high from Skill Inspector.
5. **Post-tx assertion**: after every `cast send`, `cast receipt` with `status==1` before continuing; on failure stop and report.
6. **Full audit trail**: every write updates `state.json` (whitelist/dividends/history); high-risk records `confirmed_by_human`.
7. **Key hygiene**: private key only via `$PRIVATE_KEY`, explicit `--private-key $PK` per command; never write to files or commit.

---

## Capability index (intent → capability → risk → reference)

### Pharos base ops (Skill Engine aligned)
| Intent | Capability | Tier | Reference |
|---|---|---|---|
| Balance / token query / send PHRS / generic verify | cast balance / cast call / cast send / forge verify | 🟢/🔴 | pharos-base-ops |

### Asset issuance
| Intent | Capability | Tier | Reference |
|---|---|---|---|
| Issue compliant asset | deploy + mint flow | 🔴 | rwa-issuance |
| Deploy to Pharos Atlantic | preflight + deploy + smoke | 🔴 | pharos-deploy-runbook |
| Mint additional shares | mint | 🔴 | rwa-issuance |
| Burn shares | burn | 🔴 | rwa-issuance |

### Compliance & admission
| Intent | Capability | Tier | Reference |
|---|---|---|---|
| Pre-issuance diligence (full pipeline) | Stage 0–2 diligence | 🟢 | offchain-diligence · onchain-diligence |
| On-chain address checks | cast read-only + oracle | 🟢 | onchain-diligence · sanctions-screening |
| Off-chain background / KYC fields | background gather + compare | 🟢 | offchain-diligence |
| Compliance rules & infer citations | static knowledge | 🟢 | compliance-knowledge |
| Monitor post-issuance flow anomalies | read-only `#10b` + rescreen | 🟢 | post-issuance-monitoring |
| Attest diligence hash on-chain | attest + registerAsset | 🟡 | onchain-attestation |
| Dry-run attestation (no key) | `npm run attest:dry-run` · `evidence:summary` | 🟢 | onchain-attestation |
| Verify holding eligibility | isVerified | 🟢 | rwa-issuance |
| Register compliant investor | registerIdentity | 🟡 | rwa-issuance |
| Batch register investors | batchRegisterIdentity | 🟡 | rwa-issuance |
| Remove investor eligibility | removeIdentity | 🟡 | rwa-issuance |
| Query investor jurisdiction | investorCountry | 🟢 | rwa-issuance |
| Pre-check transfer compliance | canTransfer | 🟢 | rwa-issuance |
| Query compliance limits | maxHolders / maxBalancePerInvestor | 🟢 | rwa-issuance · generated/contract-surface |
| Adjust compliance rules | setComplianceRules | 🟡 | rwa-issuance |

### Yield distribution
| Intent | Capability | Tier | Reference |
|---|---|---|---|
| Distribute yield | depositDividend | 🔴 | rwa-dividend |
| Query claimable yield | dividendOf | 🟢 | rwa-dividend |
| Query dividend accounting | dividendPerShareCumulative / undistributedDividend | 🟢 | rwa-dividend · generated/contract-surface |
| Claim yield | claimDividend | 🟢 | rwa-dividend |

### Asset management
| Intent | Capability | Tier | Reference |
|---|---|---|---|
| Freeze wallet | setAddressFrozen | 🟡 | rwa-issuance |
| Check if wallet frozen | isFrozen | 🟢 | rwa-issuance |
| Freeze partial balance | freezePartialTokens | 🟡 | rwa-issuance |
| Unfreeze partial balance | unfreezePartialTokens | 🟡 | rwa-issuance |
| Query frozen balance | frozenTokens | 🟢 | rwa-issuance |
| Query holder count | holderCount | 🟢 | rwa-issuance |
| Query full contract surface | 44 callable entries + 18 events + 14 errors | 🟢 | generated/contract-surface |
| Force transfer | forcedTransfer | 🔴 | rwa-issuance |
| Propose wallet recovery (time-locked) | proposeRecoveryAddress | 🟡 | rwa-issuance |
| Execute wallet recovery (after delay) | executeRecoveryAddress | 🔴 | rwa-issuance |
| Cancel pending recovery | cancelRecoveryAddress | 🟡 | rwa-issuance |
| Grant operator | addAgent | 🟡 | rwa-issuance |
| Revoke operator | removeAgent | 🟡 | rwa-issuance |
| Check operator role | isAgent | 🟢 | rwa-issuance |
| Emergency pause / unpause | pause / unpause | 🟡 | rwa-issuance |

### Audit & evidence (compliance hard skills)
| Intent | Capability | Tier | Reference |
|---|---|---|---|
| Query on-chain events (reconciliation) | cast logs (18 events) | 🟢 | rwa-issuance#event-queries |
| Sweep dividend rounding dust | sweepUndistributedDividend | 🔴 | rwa-dividend |
| Staged verification before submit | staged verification loop | 🟢 | pharos-verification |
| Scan skill before upload/publish | Pharos Skill Inspector | 🟢/block | scripts/skill_inspector.py |

### Spawn & personalization (self-serve)
| Intent | Capability | Tier | Reference |
|---|---|---|---|
| Spawn private operating skill for this asset | spawn asset skill | 🟢 | spawn-asset-skill |
| Deposit preferences into private profile | personalization | 🔑 deposit | spawn-asset-skill#personalization |
| Open skill / data scope externally | export + permission manifest | 🔑 share | spawn-asset-skill#sharing |

---

## Risk tiers + consent gates

🟢 **Low** (all views / diligence / spawn private skill): fully automatic.
🟡 **Medium** (register / freeze / rule changes / authorization): auto + write `state.history`.
🔴 **High** (deploy / mint / burn / dividend / forced transfer / wallet recovery): confirmation card, human `confirm` required.
🔑 **Consent gates** (deposit personal/sensitive data, open skill or data externally): consent card (share includes permission manifest); human `consent` required; private by default.
