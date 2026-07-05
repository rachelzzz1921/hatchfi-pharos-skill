# Pharos RWA Skill · Verification Loop

> Staged quality gates for this project. Agent runs the matching Phase after each major stage; **any Phase FAIL → stop, report, no further on-chain ops**.

## When to trigger

- After changing contracts / tests / deploy scripts
- Before `forge build` / `forge test` (local gate)
- Before deploy (Phase 5 preflight)
- After deploy (Phase 6 smoke)
- Before hackathon submit (Phase 7 full `./check.sh`)

---

## Phase 1 · Dependencies & toolchain

```bash
command -v forge && forge --version
command -v cast && cast --version
[ -d lib/openzeppelin-contracts ] && [ -d lib/forge-std ]
```

**On FAIL**: `curl -L https://foundry.paradigm.xyz | bash && foundryup`, then `forge install`.

---

## Phase 2 · Compile (zero errors, zero warnings)

```bash
forge build
```

**On FAIL**: minimal fixes only (imports, OZ v5 interfaces, pragma). **Do not change ERC-3643 business semantics**. Record changes in `SECURITY.md` or commit message.

---

## Phase 3 · Unit tests (16 cases all green)

```bash
forge test -vvv
```

**On FAIL**:
- Assertion/revert selector mismatch → fix tests first
- Invariant violated → **stop, report author**; do not change contract logic unilaterally

Report format: `Total: X | Passed: X | Failed: 0`

---

## Phase 4 · Security scan

```bash
# Private key / mnemonic leak
! grep -rnE "(PRIVATE_KEY|MNEMONIC)=0x[0-9a-fA-F]{40,}" . \
  --include="*.md" --include="*.sh" --include="*.sol" --include="*.json" 2>/dev/null

# .env must be in .gitignore
grep -q "^\.env$" .gitignore

# Placeholders (should not remain outside spawn artifacts)
grep -rn "<token>\|0xABC\.\.\." references/ SKILL.md 2>/dev/null | grep -v spawn-asset-skill || true
```

**On FAIL**: remove or replace leaked content; never commit `.env`.

---

## Phase 5 · Pre-deploy preflight (needs PRIVATE_KEY)

```bash
npm run preflight:pharos
# or: ./scripts/preflight.sh
```

Checks:
1. `PRIVATE_KEY` present, format `0x` + 64 hex
2. RPC reachable (`PHAROS_RPC_URL` default `https://atlantic.dplabs-internal.com`)
3. `chainId == 688689`
4. Wallet address derivable
5. PHRS balance > 0
6. `blockNumber`, `gasPrice` readable

**Balance 0 → STOP**, suggest faucet (never ask for private key):
- https://testnet.pharosnetwork.xyz/
- https://www.gas.zip/faucet/pharos
- https://zan.top/faucet/pharos

---

## Phase 6 · Deploy + smoke

```bash
npm run deploy:pharos    # forge script --broadcast
npm run smoke:pharos     # read + registerIdentity + mint 1 wei
```

After every `cast send`, `cast receipt` with `status == 1`.

**Write boundary (confirmed)**:
- ✅ `registerIdentity(deployer)`, `mint(deployer, 1e18)`
- ❌ `transferOwnership`, `forcedTransfer`, `depositDividend` (large), `executeRecoveryAddress`

Results → `deployments/pharos.json` + `DEPLOYMENT_RESULT.md` + `state.json` (asset section).

---

## Phase 7 · Contract verify (record explorer result)

```bash
npm run verify:pharos
```

Record in `DEPLOYMENT_RESULT.md`, then Phase 8.

---

## Phase 8 · Self-spawn + submit health check

```bash
# Per references/spawn-asset-skill.md → skills/<symbol>-asset/
./check.sh
git status   # confirm no .env / private keys
```

---

## Output template (VERIFICATION REPORT)

```
VERIFICATION REPORT · Compliant RWA Issuance Agent
==================================================
Phase 1 Toolchain:   [PASS/FAIL]
Phase 2 Build:       [PASS/FAIL]
Phase 3 Tests:       [PASS/FAIL] (X/16)
Phase 4 Security:    [PASS/FAIL]
Phase 5 Preflight:   [PASS/FAIL/SKIP]
Phase 6 Deploy+Smoke:[PASS/FAIL/SKIP]
Phase 7 Verify:      [PASS/FAIL/SKIP]
Phase 8 Submit:      [PASS/FAIL/SKIP]

Overall: [READY FOR SUBMIT / NOT READY]

Issues:
1. ...
```

## Mapping to SKILL.md discipline

| SKILL rule | Phase |
|---|---|
| Diligence first | Read `state.diligence` before Phase 5 |
| High-risk human confirm | Confirmation card before Phase 6 deploy/mint |
| Post-tx assertion | Receipt check in Phase 6 |
| Full audit trail | Phase 6→8 write state.json |
| Key hygiene | Phase 4 + 5 env read only |
