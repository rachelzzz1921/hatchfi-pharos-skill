# MPF Asset Skill (Judge Entry)

This folder is the issuer-specific skill package for **Manhattan Property Fund (MPF)** on Pharos Atlantic.

- Contract: `0xfef7519bebda6c47af49583dbc9e60801f8aa3de`
- Network: Pharos Atlantic Testnet (`688689`)
- Explorer: [PharosScan](https://atlantic.pharosscan.xyz/address/0xfef7519bebda6c47af49583dbc9e60801f8aa3de)

## Judge quick test

From repository root:

```bash
npm run gate:test
npm run gate:cli
npm run mcp:probe
npm run judge:readiness
```

For strict mode (requires hardened token deployment recorded in `deployments/pharos.json`):

```bash
npm run judge:readiness:strict
```

## Cast-first on-chain checks (read-only)

```bash
export RPC=${PHAROS_RPC_URL:-https://atlantic.dplabs-internal.com}
export TOKEN=0xfef7519bebda6c47af49583dbc9e60801f8aa3de
export HOLDER=0xA54A3C2766a80d3AFe7C4Bf00D5bcfF9e1892bc4

cast call $TOKEN "name()(string)" --rpc-url $RPC
cast call $TOKEN "symbol()(string)" --rpc-url $RPC
cast call $TOKEN "isVerified(address)(bool)" $HOLDER --rpc-url $RPC
cast call $TOKEN "holderCount()(uint256)" --rpc-url $RPC
```

## MCP tool surface (diligence primitive)

- `diligence_screen`
- `diligence_rate`
- `diligence_attest`
- `diligence_gate_mint`
- `diligence_get_attestation`

See `SKILL.md` for full risk-tiered operation matrix and consent gates.
