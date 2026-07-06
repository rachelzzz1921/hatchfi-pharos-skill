# Judge Manual

## One-command checks (no wallet)

```bash
npm run judge:package   # one shot: gate:test + gate:cli + mcp:probe + judge:readiness
npm run gate:cli        # narrated RED -> GREEN -> attest -> mint gate
npm run gate:test       # deterministic gate + mint-gating asserts
npm run eval:skill      # 64/64 behavioral evals
npm run build && npm run test   # 45 Foundry tests (needs Foundry)
```

## Visual demo

```bash
npm run web:dev
```

Open the app — you are the issuer's **compliance operator**, and mint is locked behind the gate:

1. **Step 1** — pick the **OFAC-sanctioned counterparty**.
2. **Step 2** — press **① Run screening** → a giant **RED · BLOCKED** verdict (`sanctions` ✗). Then **② Attest evidence** and **③ Attempt mint** → **MINT DENIED**. Note ② and ③ stay locked until the previous step ran — exactly like the on-chain contract.
3. Switch to **Clean institutional issuer** → ①②③ again → **GREEN · ADMITTED → MINT ALLOWED**.
4. **Step 3** — every action you took is in the **audit log** (timestamped, expandable JSON). Open **Raw MCP tool access** to see the same tools an agent calls.

## Trust model hardening highlights

- Role separation via `AccessControl` (`COMPLIANCE_ROLE`, `MINTER_ROLE`, `RECOVERY_ROLE`).
- Identity-bound recovery with two-step flow (`proposeRecoveryAddress` -> `executeRecoveryAddress`).
- Mint requires passable diligence attestation (`mint(address,uint256,bytes32)`).

## Optional setup

```bash
npm run setup
```
