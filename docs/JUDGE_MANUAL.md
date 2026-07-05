# Judge Manual

## One-command checks (no wallet)

```bash
npm run judge:package   # one shot: gate:test + gate:cli + mcp:probe + judge:readiness
npm run gate:cli        # narrated RED -> GREEN -> attest -> mint gate
npm run gate:test       # deterministic gate + mint-gating asserts
npm run eval:skill      # 64/64 behavioral evals
npm run build && npm run test   # 36 Foundry tests (needs Foundry)
```

## Visual demo

```bash
npm run web:dev
```

Open the app — a guided 3-step flow — and verify:

1. **Step 1** — click the **OFAC-sanctioned counterparty** scenario.
2. **Step 2** — a giant **RED · BLOCKED** verdict appears; the `sanctions` check is ✗. Click **Attest evidence → run mint gate** → **mint DENIED**.
3. Switch to **Clean institutional issuer** → **GREEN · ADMITTED**; the mint gate now returns **mint ALLOWED**.
4. **Step 3** — pick any tool in the MCP playground to see the exact request/response an agent would exchange.

## Trust model hardening highlights

- Role separation via `AccessControl` (`COMPLIANCE_ROLE`, `MINTER_ROLE`, `RECOVERY_ROLE`).
- Identity-bound recovery with two-step flow (`proposeRecoveryAddress` -> `executeRecoveryAddress`).
- Mint requires passable diligence attestation (`mint(address,uint256,bytes32)`).

## Optional setup

```bash
npm run setup
```
