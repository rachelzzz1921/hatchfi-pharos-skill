# Diligence Enhancement Changelog

> Tracks the diligence expansion merged into HatchFi. Full integration notes: [`INTEGRATION.md`](./INTEGRATION.md).

## Round 10 — Golden parity + dry-run (2026-06-18)

- **Foundry golden tests** — `test_EvidenceHashGoldenFixture` · `test_AssetFingerprintGoldenMpf` (Python ↔ Solidity)
- **`npm run attest:dry-run`** — gate check + calldata without `PRIVATE_KEY`
- **`npm run evidence:summary`** — agent-friendly gate + hash from `state.json`
- **`state.example.json`** — `background` · `asset_fingerprint` · `attestation` block
- **62 eval cases** — `npm run eval:skill`

## Round 9 — Verifiability + post-issuance (2026-06-18)

- **Canonical evidence hash CLI** — `npm run evidence:hash` · golden vectors in eval (60/60)
- **`post-issuance-monitoring.md`** — paper Monitoring Agent without AI (#10b)
- **`smoke:attestation`** — attest + registerAsset after `deploy:attestation`
- **Logic gate** — any `evidence[].flag=risk` (incl. #19) refuses issuance

## Round 8 — Paper-driven (2026-06-18)

- **arXiv:2507.00096 alignment** — [`docs/PAPER_ALIGNMENT.md`](../PAPER_ALIGNMENT.md) · `compliance-knowledge.md` § Paper alignment
- **Checks #19** `duplicate_tokenization` · **#20** `liquidity_exit_path`
- **`onchain-attestation.md`** — evidence hash on `DiligenceAttestationRegistry`
- **Contracts** — `DiligenceAttestationRegistry` · `AssetTokenizationRegistry` (+7 Foundry tests → 31 total)
- **55 eval cases** — `npm run eval:skill`
- **Deploy** — `npm run deploy:attestation` → `deployments/attestation_atlantic.json`

## Round 7 — Diligence expansion (2026-06-18)

## Summary

- **4 diligence playbooks** (was 1): `offchain-diligence` · `onchain-diligence` (11 checks) · `sanctions-screening` · `compliance-knowledge`
- **Three-stage pipeline**: background + consent → check selection → merged evidence + pure-function rating
- **52 eval cases** (was 50) — `npm run eval:skill`
- **MPF spawn v5** — 4 diligence references per child skill

## Live Atlantic artifacts

| Artifact | Value |
|---|---|
| MPF token | `0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3` |
| MockOFACRegistry | `0x4FD317Ec868fdbd6e95c56f157DDf86d7b97F400` |
| Oracle deploy tx | `0x7ae012f2ac8d388faa808005145054e9db338157a20be2c6f091eba5fa3fa8fa` |
| OFAC ETH snapshot | `assets/knowledge/denylist_ofac_eth.json` (93 addresses, 2026-06-18) |
| RED demo address | `0x7F367cC41522cE07553e823bf3be79A889DEbe1B` → `isSanctioned == true` |

## npm scripts

```bash
npm run diligence:sync      # refresh OFAC JSON + merge into local state.json
npm run deploy:mock-ofac    # deploy MockOFACRegistry (needs PRIVATE_KEY)
npm run deploy:attestation  # deploy attestation + asset registries (needs PRIVATE_KEY)
npm run sync:zh-diligence   # regenerate zh locale diligence mirrors
npm run spawn:asset         # regen skills/<SYMBOL>-asset/ with 5 diligence refs + attestation
```

## Config (`state.example.json`)

```json
"config": {
  "denylist_source": "assets/knowledge/denylist_ofac_eth.json",
  "ofac_oracle": "0x4FD317Ec868fdbd6e95c56f157DDf86d7b97F400"
}
```

Local `state.json` is gitignored — run `npm run diligence:sync` after clone.
