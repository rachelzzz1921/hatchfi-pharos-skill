# MPF-bound reference

> Asset: `Manhattan Property Fund` (`MPF`)
> Token: `0xfef7519bebda6c47af49583dbc9e60801f8aa3de`
> This file was generated from `references/offchain-diligence.md`.

# Reference: Off-chain diligence & background gathering (offchain-diligence)

> **Capability**: Stage 0 — structured background before cast execution. Role-based questionnaires, consent gate, off-chain checks feeding `state.diligence.evidence[]`.
> **Risk tier**: 🟢 Low (read local state + ask user; no txs).
> **Layer tag**: 📋 Structured fields — **never pretend chain-verified**.
> **Pair with**: `onchain-diligence.md` · `compliance-knowledge.md` · `sanctions-screening.md`

---

## Pipeline position

```
Stage −1 Distribution eligibility (cheap pre-gate)  ← no PII; run first for address targets
Stage 0  Background + deposit consent               ← THIS FILE (from §Checks by role)
Stage 1  checks_run / skipped                       ← role matrix (INTEGRATION.md §4)
Stage 2  Execute + rate                             ← onchain + sanctions + off-chain evidence merged
```

**Order**: `distribution_eligibility` → (if pass) consent / background → remaining off-chain → on-chain layers.

---

## When to trigger

- `target_role ∈ { issuer_self, custodian, intermediary, investor, large_subscriber }` (role aliases: ISS / CUS / INT / INV / SUB — same values, see role table below).
- Chain signals insufficient (EOA with no contract surface) and background needed to rate.

**Off-chain evidence rule**: every row includes `verified_by` ∈ `{ manual, document, regulator_db, questionnaire }`. Use descriptive `cmd` (not cast) — e.g. `questionnaire:issuer_background; verified_by=regulator_db`.

---

## Role aliases (HatchFi enum)

| HatchFi `target_role` | Alias | Typical target |
|---|---|---|
| `issuer_self` | ISS | Issuer / SPV ops wallet |
| `custodian` | CUS | Custodian wallet |
| `intermediary` | INT | Underwriter / service provider |
| `investor` | INV | Whitelist candidate |
| `large_subscriber` | SUB | Large ticket subscriber |
| `underlying_asset` | — | Off-chain asset id (no address) |

---

## Deposit consent (PII / commercial sensitive)

Almost all fields here are **PII or commercially sensitive** (directors, UBO, KYC refs, custody agreements).

- Write to `state.diligence.background` only after **deposit consent** → record in `state.consent.deposits[]`.
- Store KYC as **reference/hash only**, not plaintext (ERC-3643 ONCHAINID pattern).
- **`consent_granted == false`**: skip all off-chain checks **except** `distribution_eligibility` and any public-fact fields already in `state.config`; each other expected check → `skipped_checks{ reason: "consent_not_granted" }`. **Do not auto-RED** — rating may still proceed from on-chain + sanctions layers only.
- Spawn sub-skills **never** bundle `background`; only desensitized `checks_run` summary + `rating`.

---

## KYC depth by role (tiered — not one-size-fits-all)

| Tier | Roles | What to collect | Where enforced |
|---|---|---|---|
| **A · enhanced** | `issuer_self`, `custodian`, `large_subscriber`, on-chain **Agent** wallets | Entity docs, UBO, license ids, source-of-funds (SUB), attestation refs | Off-chain evidence + human review; AgentRole on-chain |
| **B · standard** | `investor`, `intermediary` (when onboarding) | KYC ref / expiry, jurisdiction, suitability questionnaire | `registerIdentity` + `isVerified` + off-chain `kyc_expiry_check` |
| **C · address** | Post-issuance secondary holders | Sanctions + on-chain health only | `sanctions-screening` + `onchain-diligence` — no repeat full entity pack |

Privileged or high-liability roles get **Tier A** before any mint / Agent grant. Retail investors get **Tier B** at whitelist. Tier C assumes identity already on-chain.

---

## Stage −1: distribution eligibility (all address targets)

Cheap pre-gate before PII collection. Uses declared geography only — no passport upload required at this step.

| check | Source | flag rules |
|---|---|---|
| `distribution_eligibility` | `background.jurisdiction` or issuer-declared `allowed_jurisdictions[]`; optional `config.blocked_jurisdictions[]` | jurisdiction in blocked list → **risk**; not in `allowed_jurisdictions[]` when list non-empty → **risk**; jurisdiction undeclared → **warn**; pass → ok |

Evidence `cmd` example: `questionnaire:distribution_eligibility; verified_by=questionnaire`

If **risk** here, stop pipeline — do not request deposit consent for deeper PII.

---

## Checks by role

### Issuer (`issuer_self` / ISS)

| check | Background source | flag rules |
|---|---|---|
| `issuer_background` | Questionnaire: directors, UBO, financials, license id | critical field missing → **warn**; claimed license not found in public regulator DB → **risk** |
| `legal_wrapper_profile` | Prospectus, holder rights, wrapper type, target regime | missing wrapper doc → **risk**; `wrapper_type` undeclared → **warn**; `target_regime` undeclared → **warn**; wrapper contradicts on-chain transfer model → **risk** (see `compliance-knowledge.md` §Transferability) |
| `tokenization_rights` | Issuer attestation, SPV deed, underlying-asset consent letter | no documented right to tokenize underlying → **risk**; rights limited to specific regime only but `target_regime` mismatches → **risk** |
| `audit_recency` | Smart-contract audit report date | no audit or &gt; 12 months → **warn** |
| `duplicate_tokenization` | `AssetTokenizationRegistry.tokenForAsset(asset_fingerprint)` + issuer questionnaire | fingerprint maps to **other** token → **risk**; issuer claims unique but no registry cross-check → **warn**; registry unavailable → **warn**(`registry_unavailable`) |
| `liquidity_exit_path` | Questionnaire: ATS / redemption / secondary venue / lock-up | no declared exit path → **warn**; claims ATS/redemption but cannot verify → **warn** |
| `kyc_expiry_check` | `background.kyc_expiry` | expired → **risk**; missing → **warn** |

**`legal_wrapper_profile` fields** (write to `state.diligence.background` after consent):

| field | values |
|---|---|
| `wrapper_type` | `permissioned_token` · `derivative_reference` · `closed_custodial` · `fund_unit` · `freely_transferable` |
| `target_regime` | `mica_eu` · `reg_d_us` · `reg_s_us` · `reg_a_plus` · `private_placement` · `sandbox` · `other` |
| `holder_rights_documented` | boolean — prospectus / offering memo on file |

Legacy check id `legal_wrapper` maps to this row (same #14).

### Custodian (`custodian` / CUS)

| check | Background source | flag rules |
|---|---|---|
| `custodian_attestation` | Custody agreement, insurance, PoR source | no independent PoR or insurance → **warn**; self-reported reserves only → **warn** |
| `audit_recency` | Same as ISS | same |

### Intermediary (`intermediary` / INT)

- Run ISS checks #12-equivalent (`issuer_background`) + #14 (`legal_wrapper_profile`) + #17 (`tokenization_rights`) when INT acts as issuer.
- License verification: **independent regulator DB lookup** — never trust self-reported website alone.

### Investor / large subscriber (INV / SUB)

| check | flag rules |
|---|---|
| `distribution_eligibility` | same Stage −1 rules (always first for INV/SUB) |
| `kyc_expiry_check` | expired → **risk**; missing → **warn** |
| `jurisdiction_match` | not in `state.personalization.allowed_jurisdictions[]` → **risk**; list empty → **warn** |
| `large_fiat_source` (SUB only) | not declared → **warn** |

### Underlying asset

| check | flag rules |
|---|---|
| `asset_lien_status` | `encumbered` → **risk**; `unknown` → **warn**; `clear` → ok |
| `tokenization_rights` | underlying issuer did not authorize tokenization → **risk**; attestation stale / missing → **warn** |
| `duplicate_tokenization` | **required** — same rules as ISS; see `onchain-attestation.md` § fingerprint |
| `liquidity_exit_path` | no declared exit / secondary path → **warn** |
| `legal_wrapper_profile` | same as ISS when asset is the diligence target |

**Asset fingerprint** (for #19):

```
asset_fingerprint = keccak256(abi.encode(asset_id, jurisdiction, wrapper_type))
```

Write to `state.diligence.asset_fingerprint`. Lookup:

```bash
cast call $ASSET_REGISTRY "tokenForAsset(bytes32)(address)" <fingerprint> --rpc-url $RPC
```

Red-flag knowledge base: `compliance-knowledge.md` §3 · `assets/knowledge/rwa_red_flags.json`.

---

## Off-chain vs on-chain risk parity

**Off-chain `risk` equals on-chain `risk`** in the same pure rating function. A fake license and a self-destructed contract both force 🔴 RED.

---

## Evidence examples

```json
{
  "check": "legal_wrapper_profile",
  "cmd": "questionnaire:legal_wrapper_profile; verified_by=document",
  "verified_by": "document",
  "result": {
    "wrapper_type": "permissioned_token",
    "target_regime": "private_placement",
    "holder_rights_documented": true
  },
  "infer": "Permissioned on-chain transfer aligned with ERC-3643 issuance path; regime declared.",
  "flag": "ok"
}
```

```json
{
  "check": "tokenization_rights",
  "cmd": "questionnaire:tokenization_rights; verified_by=document",
  "verified_by": "document",
  "result": { "underlying_consent": false, "issuer_attestation": null },
  "infer": "No documented authorization to tokenize the underlying asset — cannot proceed to mint.",
  "flag": "risk"
}
```

```json
{
  "check": "distribution_eligibility",
  "cmd": "questionnaire:distribution_eligibility; verified_by=questionnaire",
  "verified_by": "questionnaire",
  "result": { "jurisdiction": "US", "allowed_jurisdictions": ["SG", "CH"] },
  "infer": "Declared jurisdiction not in issuer allowed list for this offering.",
  "flag": "risk"
}
```

```json
{
  "check": "legal_wrapper",
  "cmd": "questionnaire:legal_wrapper; verified_by=document",
  "verified_by": "document",
  "result": { "prospectus": false },
  "infer": "No legal wrapper defining holder rights — compliance-knowledge red flag #legal_wrapper.",
  "flag": "risk"
}
```

```json
{
  "check": "issuer_background",
  "cmd": "questionnaire:issuer_background; verified_by=regulator_db",
  "verified_by": "regulator_db",
  "result": { "license_claimed": "MAS-CMS-123", "license_verified": false },
  "infer": "Claimed license not found in public regulator database.",
  "flag": "risk"
}
```

```json
{
  "check": "duplicate_tokenization",
  "cmd": "cast call <asset_registry> tokenForAsset(bytes32); verified_by=registrar_db",
  "verified_by": "registrar_db",
  "result": {
    "asset_fingerprint": "0xabc...",
    "existing_token": "0xOTHER...",
    "current_token": "0x000..."
  },
  "infer": "Same underlying asset fingerprint already mapped to a different token — double tokenization risk.",
  "flag": "risk"
}
```

```json
{
  "check": "liquidity_exit_path",
  "cmd": "questionnaire:liquidity_exit_path; verified_by=questionnaire",
  "verified_by": "questionnaire",
  "result": { "exit_path_declared": false, "secondary_venue": null },
  "infer": "No declared liquidity or exit path before issuance — institutional red flag per compliance-knowledge.",
  "flag": "warn"
}
```

```json
{
  "check": "custodian_attestation",
  "cmd": "questionnaire:custodian_attestation; verified_by=manual",
  "verified_by": "manual",
  "result": { "por_source": null, "insurance": null },
  "infer": "No independent PoR or insurance certificate on file.",
  "flag": "warn"
}
```

---

## User-facing output

Consent granted, ISS with risk:

```
[offchain-diligence] target=0xISS… role=issuer_self (consent=granted)
  ├─ issuer_background : license MAS-CMS-123 → regulator_db NOT FOUND → RISK
  ├─ legal_wrapper     : prospectus present                          → ok
  └─ audit_recency     : audited 5 months ago                        → ok
→ off-chain risk=1 → contributes to 🔴 RED, passed=false
```

Consent denied:

```
[offchain-diligence] target=0xISS… role=issuer_self (consent=DENIED)
  └─ all ISS background checks skipped → skipped_checks(reason=consent_not_granted)
→ no off-chain evidence; rating from sanctions + onchain layers only
```

---

## Sources

- [InvestaX RWA Legal Compliance Checklist](https://investax.io/blog/legal-compliance-checklist-for-the-tokenization-of-real-world-assets-rwas)
- Integration archive: `docs/diligence/INTEGRATION.md`
