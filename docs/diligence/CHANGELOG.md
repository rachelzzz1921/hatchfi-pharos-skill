# Diligence Enhancement Changelog (2026-06-18)

> Tracks the diligence expansion merged into HatchFi. Full integration notes: [`INTEGRATION.md`](./INTEGRATION.md).

## Summary

- **4 diligence playbooks** (was 1): `offchain-diligence` · `onchain-diligence` (11 checks) · `sanctions-screening` · `compliance-knowledge`
- **Three-stage pipeline**: background + consent → check selection → merged evidence + pure-function rating
- **52 eval cases** (was 50) — `npm run eval:skill`
- **MPF spawn v5** — 4 diligence references per child skill

## Live Atlantic artifacts

| Artifact | Value |
|---|---|
| MPF token | `0xfef7519bebda6c47af49583dbc9e60801f8aa3de` |
| MockOFACRegistry | `0x4FD317Ec868fdbd6e95c56f157DDf86d7b97F400` |
| Oracle deploy tx | `0x7ae012f2ac8d388faa808005145054e9db338157a20be2c6f091eba5fa3fa8fa` |
| OFAC ETH snapshot | `assets/knowledge/denylist_ofac_eth.json` (93 addresses, 2026-06-18) |
| RED demo address | `0x7F367cC41522cE07553e823bf3be79A889DEbe1B` → `isSanctioned == true` |

## npm scripts

```bash
npm run diligence:sync      # refresh OFAC JSON + merge into local state.json
npm run deploy:mock-ofac    # deploy MockOFACRegistry (needs PRIVATE_KEY)
npm run sync:zh-diligence   # regenerate zh locale diligence mirrors
npm run spawn:asset         # regen skills/<SYMBOL>-asset/ with 4 diligence refs
```

## Config (`state.example.json`)

```json
"config": {
  "denylist_source": "assets/knowledge/denylist_ofac_eth.json",
  "ofac_oracle": "0x4FD317Ec868fdbd6e95c56f157DDf86d7b97F400"
}
```

Local `state.json` is gitignored — run `npm run diligence:sync` after clone.
