# Compliance Module · MPF

> Modular per-asset compliance profile — generated at spawn. **No PII.**
> Agent must read this before mint, whitelist, or dividend operations.

## Profile

| Field | Value |
|---|---|
| `wrapper_type` | `permissioned_token` |
| `target_regime` | `private_placement` |
| `transferability` | `permissioned_onchain` |
| `kyc_placement` | `onchain_identity_registry` |
| Last diligence rating | `UNCHECKED` |

## Regime bindings (on-chain)

```
identity_gate          → isVerified
transfer_gate          → canTransfer
max_holders            → 100
max_balance_per_investor → 1000000000000000000000000
freeze_policy          → per-wallet frozenTokens
target_regime          → private_placement
```

## Diligence checks recorded at spawn

`(none recorded — run diligence before spawn)`

## Withheld (never in this file)

Issuer background, KYC refs, tokenization source documents, investor PII — remain in owner `state.json` only.

See parent `references/compliance-knowledge.md` for transferability models and regime tables.
