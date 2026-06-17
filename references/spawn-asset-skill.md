# Reference: Asset-specific skill spawn (spawn-asset-skill)

> **Capability**: After an RWA asset is issued, the agent materializes a **complete private operating skill package** — replacing placeholders in the parent skill with this asset's real address and parameters. **Serves the issuer first**: natural-language ops on this asset keep refining the skill to fit their workflow.
> **Private by default**: Generated package is for issuer use only (`sharing=private`), with a **permission manifest `PERMISSIONS.md`**. External sharing is an **explicit, scoped opt-in** (see Sharing below).
> **Data boundary**: Spawn carries only the public operating surface (contract address + commands). The issuer's sovereign ledger (`state.json`: investor PII, diligence evidence, dividend detail, preferences) is **never copied into the package** — referenced locally by path only.
> **Risk tier**: 🟢 Low (local file generation only; no on-chain txs; agent auto-runs).

---

## When to trigger

When `state.asset.address` is set (asset deployed) and `state.spawned_skill.generated != true`, auto-trigger at end of issuance flow; or user explicitly: "generate a dedicated skill for this asset".

---

## Output structure (3-A — full spawn: diligence / issuance / dividend / lifecycle)

Under `skills/<symbol>-asset/`:

```
skills/<SYMBOL>-asset/
├── SKILL.md                      # Asset-specific capability index (address baked in)
├── PERMISSIONS.md                # Manifest: exposed (address+commands) vs withheld private data
└── references/
    ├── <symbol>-diligence.md     # Diligence (inherits gate; target defaults to asset-related parties)
    ├── <symbol>-issuance.md      # Issuance + lifecycle (mint/freeze/forced transfer/recovery; token filled)
    └── <symbol>-dividend.md      # Dividends (depositDividend/claim/query; address filled)
```

> Full package, not commands-only — issuer (or authorized agent) gets diligence, issuance, dividends, lifecycle **out of the box** without returning to parent skill. `PERMISSIONS.md` lists **public surface only**; private ledger stays out of package.

---

## Generation method (3-B — deterministic template fill, not LLM authoring)

**Not** "have the model write a skill" — **parent template + state placeholder replacement**, deterministic, reproducible, zero hallucination:

Parent templates: `references/rwa-issuance.md`, `onchain-diligence.md`, `rwa-dividend.md`.
Replacement map (from `state.asset`):

| Placeholder | Replaced with | Source |
|---|---|---|
| `<token>` | Contract address | `state.asset.address` |
| `<SYMBOL>` / `<symbol>` | Token symbol | `state.asset.symbol` |
| `<name>` | Asset name | `state.asset.name` |
| `<maxHolders>` | Holder cap | `state.asset.max_holders` |
| `<maxBalancePerInvestor>` | Per-investor cap | `state.asset.max_balance_per_investor` |
| `$RPC` | Unchanged (env consistent) | Fixed atlantic |

Implementation: pure string replacement (agent can use sed / script); **validate** output `.md` has no leftover `<token>` etc. before updating state.

After generation, write state (private by default + pending share consent):
```json
"spawned_skill": {
  "generated": true,
  "path": "skills/MPF-asset/",
  "generated_at": "<ISO8601>",
  "sharing": "private",
  "permission_manifest": "skills/MPF-asset/PERMISSIONS.md"
},
"consent": {
  "shares": [
    { "artifact": "skills/MPF-asset/", "granted": false,
      "exposed": ["contract_address", "operation_commands", "public_compliance_constants"],
      "withheld": ["investor_pii", "diligence_evidence", "dividend_detail", "personalization"],
      "at": "<ISO8601>" }
  ]
}
```
`npm run spawn:asset` (`scripts/spawn_asset_skill.py`) automates generation and state writeback.

---

## Evolution (spawn → refine → rollback)

Inspired by dot-skill `version_manager` — spawn is not one-shot:

| Command | Purpose |
|---|---|
| `npm run spawn:asset` | Full deterministic regen from parent templates; archives existing dir to `versions/` |
| `npm run refine:asset` | **Incremental refine**: write `PREFERENCES.md` from `state.personalization`; no redeploy |
| `npm run spawn:versions` | List `skills/<SYMBOL>-asset/versions/` archives |
| `npm run spawn:rollback <id>` | Roll back to archive (current state archived first) |

Additional artifacts:
- `PREFERENCES.md` — issuer private preference overlay (withheld on share — see `PERMISSIONS.md`)
- `meta.json` — `version` + `evolution[]` audit trail

`state.spawned_skill.version` syncs with `meta.json`; repeat `spawn:asset` upserts `consent.shares` instead of duplicating.

---

## Auto references (contract → reference sync)

Parse `src/CompliantRWAToken.sol` for external/public functions + public state variables:

- `references/generated/contract-surface.md` / `.json`
- On spawn, copied to `skills/<SYMBOL>-asset/references/<SYMBOL>-contract-surface.md`

```bash
npm run refs:generate    # generate
npm run refs:check       # generate + drift check vs rwa-issuance cheat sheet
```

---

## Skill eval (gates / risk tiers / consent)

Deterministic eval suite (no LLM), inspired by skill-creator:

```bash
npm run eval:skill       # behavioral + logic gate + risk alignment
npm run eval:skill:json  # JSON report
```

Cases: `eval/skill_behavior_cases.json` (currently 50 checks).

---

## Generated sub-SKILL.md template (address baked in — example)

```markdown
# Skill: MPF Asset Operations (Manhattan Property Fund)
> Contract: 0xABC... (CompliantRWAToken, Pharos Atlantic)
> Spawned by issuance agent — diligence/issuance/dividend/lifecycle ready for this asset.

## Capability index
| User intent | Operation | Risk | reference |
|---|---|---|---|
| Check if address can hold | isVerified | 🟢 | references/MPF-issuance.md |
| Whitelist investor | registerIdentity | 🟡 | references/MPF-issuance.md |
| Mint shares | mint | 🔴 | references/MPF-issuance.md |
| Freeze / unfreeze | setAddressFrozen | 🟡 | references/MPF-issuance.md |
| Distribute dividend | depositDividend | 🔴 | references/MPF-dividend.md |
| Query / claim dividend | dividendOf/claim | 🟢 | references/MPF-dividend.md |
| Pre-issuance diligence | onchain diligence | 🟢 | references/MPF-diligence.md |
(Contract 0xABC... baked in — no token param needed)
```

---

## Personalization (refine for self-serve)

Built **for the issuer**: every NL interaction can refine how this asset is operated. Repeatedly confirmed preferences — jurisdictions, holder caps, dividend cadence, disclosure templates, custom risk thresholds — go to `state.personalization` after **🔑 deposit consent**:

```json
"personalization": {
  "preferences": {
    "jurisdictions": [840, 344],
    "default_max_holders": 100,
    "default_max_balance_per_investor": "1000000000000000000000000",
    "dividend_cadence": "quarterly",
    "disclosure_template": "reg-d-506c"
  },
  "refined_at": "<ISO8601>",
  "refine_log": [
    { "change": "set dividend_cadence=quarterly", "from_interaction": "issuer confirmed quarterly on 3rd dividend", "consented": true, "at": "<ISO8601>" }
  ]
}
```

On next issuance/op, agent **pre-fills from profile and confirms deltas** — skill grows with use. Preferences are sovereign, private by default; deposit consent card explains what, why, local-only.

## Sharing (opt-in with permission manifest — private by default)

Sub-skill defaults to `sharing=private`, issuer-only. Before handing skill or any data scope to others/agents, **🔑 share consent**:

1. Read `PERMISSIONS.md`, show issuer the **manifest** — **exposed vs withheld**:
   - **Exposed**: contract address, operation commands, public compliance constants (MAX_HOLDERS etc.).
   - **Withheld**: investor PII, diligence evidence, dividend detail, personalization (local `state.json` only).
2. Consent card (action=external share / artifact=skill / exposed / withheld / recipient); execute only after `consent`.
3. Update `state.consent.shares`: set `granted=true`, record recipient and time; set `state.spawned_skill.sharing` to `shared`.

> **Rule: sharing skill ≠ sharing data.** Even when shared, only the public surface in `PERMISSIONS.md` leaves the machine; `state.json` never ships with the package. Without consent, always treat as private.
