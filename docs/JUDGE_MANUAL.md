# Judge Manual

## One-command checks

```bash
npm run gate:test
npm run gate:demo
npm run judge:readiness
```

## Visual demo

```bash
npm run web:dev
```

Open the app and verify:

1. Set `sanctionsHit=true` -> `Run Diligence` returns `RED`.
2. Clear all flags -> `Run Diligence` returns `GREEN`.
3. Click `Attest Current`, then `Gate Mint` -> `allowed: true`.
4. Use MCP playground with all 4 tools.

## Trust model hardening highlights

- Role separation via `AccessControl` (`COMPLIANCE_ROLE`, `MINTER_ROLE`, `RECOVERY_ROLE`).
- Identity-bound recovery with two-step flow (`proposeRecoveryAddress` -> `executeRecoveryAddress`).
- Mint requires passable diligence attestation (`mint(address,uint256,bytes32)`).

## Optional setup

```bash
npm run setup
```
