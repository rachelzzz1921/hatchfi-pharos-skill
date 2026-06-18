# Reference: Off-chain diligence & background gathering (offchain-diligence)

> **Capability**: Stage 0 — structured background before cast execution. Role-based questionnaires, consent gate, off-chain checks feeding `state.diligence.evidence[]`.
> **Risk tier**: 🟢 Low (read local state + ask user; no txs).
> **Layer tag**: 📋 Structured fields — **never pretend chain-verified**.
> **Pair with**: `onchain-diligence.md` · `compliance-knowledge.md` · `sanctions-screening.md`

---

## Pipeline position

```
Stage 0  Background + consent     ← THIS FILE
Stage 1  checks_run / skipped     ← role matrix (INTEGRATION.md §6)
Stage 2  Execute + rate           ← onchain + sanctions + off-chain evidence merged
```

---

## When to trigger

- `target_role ∈ { issuer_self, custodian, intermediary, investor, large_subscriber }` (Claude codes: ISS / CUS / INT / INV / SUB — same values, see role table below).
- Chain signals insufficient (EOA with no contract surface) and background needed to rate.

**Off-chain evidence rule**: every row includes `verified_by` ∈ `{ manual, document, regulator_db, questionnaire }`. Use descriptive `cmd` (not cast) — e.g. `questionnaire:issuer_background; verified_by=regulator_db`.

---

## Role codes (HatchFi = Claude)

| HatchFi `target_role` | Claude | Typical target |
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
- **`consent_granted == false`**: skip all off-chain checks; each expected check → `skipped_checks{ reason: "consent_not_granted" }`. **Do not auto-RED** — rating may still proceed from on-chain + sanctions layers only.
- Spawn sub-skills **never** bundle `background`; only desensitized `checks_run` summary + `rating`.

---

## Checks by role

### Issuer (`issuer_self` / ISS)

| check | Background source | flag rules |
|---|---|---|
| `issuer_background` | Questionnaire: directors, UBO, financials, license id | critical field missing → **warn**; claimed license not found in public regulator DB → **risk** |
| `legal_wrapper` | Prospectus, holder rights, redemption terms | no legal wrapper → **risk** |
| `audit_recency` | Smart-contract audit report date | no audit or &gt; 12 months → **warn** |
| `kyc_expiry_check` | `background.kyc_expiry` | expired → **risk**; missing → **warn** |

### Custodian (`custodian` / CUS)

| check | Background source | flag rules |
|---|---|---|
| `custodian_attestation` | Custody agreement, insurance, PoR source | no independent PoR or insurance → **warn**; self-reported reserves only → **warn** |
| `audit_recency` | Same as ISS | same |

### Intermediary (`intermediary` / INT)

- Run ISS checks #12-equivalent (`issuer_background`) + #14 (`legal_wrapper`) when INT acts as issuer.
- License verification: **independent regulator DB lookup** — never trust self-reported website alone.

### Investor / large subscriber (INV / SUB)

| check | flag rules |
|---|---|
| `kyc_expiry_check` | expired → **risk**; missing → **warn** |
| `jurisdiction_match` | not in `state.personalization.allowed_jurisdictions[]` → **risk**; list empty → **warn** |
| `large_fiat_source` (SUB only) | not declared → **warn** |

### Underlying asset

| check | flag rules |
|---|---|
| `asset_lien_status` | `encumbered` → **risk**; `unknown` → **warn**; `clear` → ok |

Red-flag knowledge base: `compliance-knowledge.md` §3 · `assets/knowledge/rwa_red_flags.json`.

---

## Off-chain vs on-chain risk parity

**Off-chain `risk` equals on-chain `risk`** in the same pure rating function. A fake license and a self-destructed contract both force 🔴 RED.

---

## Evidence examples

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
