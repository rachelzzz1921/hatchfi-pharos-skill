---
name: mpf-asset
description: Asset-specific operations for Manhattan Property Fund (MPF) on Pharos Atlantic Testnet. Use this skill whenever a user asks to manage, inspect, whitelist, mint, transfer-check, or distribute dividends for this exact deployed RWA asset.
---

# Skill: MPF Asset Operations (Manhattan Property Fund)

> Contract: `0xfef7519bebda6c47af49583dbc9e60801f8aa3de` (`CompliantRWAToken`, Pharos Atlantic Testnet)
> Generated deterministically from the parent Compliant RWA Issuance Agent.
> **Private by default — serves its owner first.** Sharing scope is declared in `PERMISSIONS.md`;
> the owner's data (investor PII, diligence evidence, dividends, preferences) is NOT in this package.
> Owner-specific defaults (if refined) live in `PREFERENCES.md` — local, never bundled when sharing.

## Capability Index

| User intent | Operation | Risk | Reference |
|---|---|---|---|
| Check whether an address can hold MPF | `isVerified` | low | `references/MPF-issuance.md` |
| Register a compliant investor | `registerIdentity` | medium | `references/MPF-issuance.md` |
| Mint additional MPF shares | `mint` | high | `references/MPF-issuance.md` |
| Preview transfer compliance | `canTransfer` | low | `references/MPF-issuance.md` |
| Freeze or unfreeze wallet/shares | freeze functions | medium | `references/MPF-issuance.md` |
| Force transfer or recover wallet | lifecycle functions | high | `references/MPF-issuance.md` |
| Deposit asset dividends | `depositDividend` | high | `references/MPF-dividend.md` |
| Check or claim dividends | `dividendOf` / `claimDividend` | low | `references/MPF-dividend.md` |
| Pre-issuance diligence (full pipeline) | Stage 0–2 | low | `references/MPF-diligence-offchain.md` · `references/MPF-diligence-onchain.md` |
| Sanctions screening | denylist + oracle | low | `references/MPF-sanctions.md` |
| Compliance infer citations | knowledge mapping | low | `references/MPF-compliance-knowledge.md` |
| Apply owner defaults before operations | read `PREFERENCES.md` | low | `PREFERENCES.md` |
| Asset compliance module (regime + transferability) | read `COMPLIANCE_MODULE.md` | low | `COMPLIANCE_MODULE.md` |

## Asset Constants

- `TOKEN=0xfef7519bebda6c47af49583dbc9e60801f8aa3de`
- `SYMBOL=MPF`
- `NAME=Manhattan Property Fund`
- `MAX_HOLDERS=100`
- `MAX_BALANCE_PER_INVESTOR=1000000000000000000000000`
