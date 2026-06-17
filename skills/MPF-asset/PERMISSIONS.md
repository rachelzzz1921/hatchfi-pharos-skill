# Permission Manifest · MPF Asset Skill

> Sharing status: **private** (serves the owner first).
> Opening this skill to anyone else is an explicit, scoped opt-in — record it in
> the parent `state.json` → `consent.shares` before distributing.

## Exposed (public operating surface)

- Contract address: `0xfef7519bebda6c47af49583dbc9e60801f8aa3de`
- Operation commands & references (whitelist check, mint, transfer-check, dividends, diligence)
- Public compliance constants: MAX_HOLDERS=100, MAX_BALANCE_PER_INVESTOR=1000000000000000000000000

## Withheld (owner's sovereign data — never bundled)

- Investor identities / PII (`state.whitelist`)
- Diligence evidence (`state.diligence.evidence`)
- Dividend distribution detail (`state.dividends`)
- Personalization preferences & templates (`state.personalization`)

These remain in the owner's local `state.json` (gitignored) and are only referenced
by path at runtime. **Sharing this skill does not share the data above.**
