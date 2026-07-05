# Completed Validation Summary

This document records only the validation gates that have been completed and reproduced locally for the Pharos RWA Skill package.

## Scope

Project: **Compliant RWA Issuance Agent**

Network target: **Pharos Atlantic Testnet**

Chain ID: **688689**

Primary contract: `src/CompliantRWAToken.sol`

## Toolchain

Foundry was installed and available locally:

```bash
forge --version
cast --version
```

Observed versions:

- `forge 1.7.1`
- `cast 1.7.1`

## Local Build

Command:

```bash
forge build
```

Result:

```text
Compiler run successful!
```

## Unit Tests

Command:

```bash
forge test
```

Result:

```text
Suite result: ok. 36 passed; 0 failed; 0 skipped
```

The test suite (including a fuzz test) covers the core ERC-3643-style behavior:

- verified-recipient transfer gating
- `canTransfer` compliance checks
- max holder count (on transfer **and** on mint/issuance)
- max balance per investor (on transfer **and** on mint/issuance)
- full and partial freeze behavior
- forced transfer
- wallet recovery (including migration of unclaimed dividends)
- dividend accounting, dust accounting and `sweepUndistributedDividend`
- rejection of dust-only deposits too small for the supply
- fuzz invariant: dividends never over-distribute (`claimable + dust ≤ deposit`)
- pause/unpause behavior
- agent-only permissions

## Pharos Network Preflight

Command:

```bash
npm run preflight:pharos
```

Completed checks:

- `PRIVATE_KEY` was loaded from the local environment only
- private key was not written to project files
- wallet address resolved successfully
- RPC endpoint was reachable
- chain ID matched `688689`
- wallet had non-zero PHRS testnet balance
- current block and gas price were readable from the RPC

Observed network:

```text
Network:  Pharos Atlantic Testnet
Chain ID: 688689
RPC:      https://atlantic.dplabs-internal.com
Status:   OK
```

## On-Chain Deployment (Pharos Atlantic)

Commands:

```bash
npm run deploy:pharos   # preflight + forge script --broadcast
npm run smoke:pharos    # registerIdentity (if needed) + mint(1e18) + read-back
```

Observed result:

| Field | Value |
|---|---|
| Contract | `CompliantRWAToken` |
| Address | `0xfef7519bebda6c47af49583dbc9e60801f8aa3de` |
| Deploy tx | `0x71ebe568c6d41390cfc6b6f452c30c85d38d0b4ddead941d19383a7e39417e4d` |
| Network | Pharos Atlantic Testnet (chainId `688689`) |
| Asset | Manhattan Property Fund / MPF |
| Explorer (address) | https://atlantic.pharosscan.xyz/address/0xfef7519bebda6c47af49583dbc9e60801f8aa3de |
| Explorer (deploy tx) | https://atlantic.pharosscan.xyz/tx/0x71ebe568c6d41390cfc6b6f452c30c85d38d0b4ddead941d19383a7e39417e4d |

Smoke test (post-deploy):

| Check | Result |
|---|---|
| `name()` / `symbol()` | Manhattan Property Fund / MPF |
| `registerIdentity(deployer)` | deployer already verified |
| `mint(deployer, 1e18)` | tx `0x7ece3b86646685fbf9312bf91b68fc18ae694c3ccd50e8fdba148d6348bb5541`, receipt status = 1 |
| `isVerified(deployer)` | `true` |
| `balanceOf(deployer)` | `1e18` |
| `holderCount()` | `1` |

Full machine-readable record: `deployments/pharos.json` and `DEPLOYMENT_RESULT.md`.

## Security Controls

The project keeps local secrets and generated transaction artifacts out of version control:

```text
.env
.env.local
.env.*.local
cache/
out/
broadcast/
state.json
```

The deployment flow reads `PRIVATE_KEY` only from the local shell environment and does not require entering a mnemonic.

## Reproducible Commands

From the project directory:

```bash
cd "/Users/chenzhiwei/Desktop/skill to anything/pharos-rwa-skill"
source ~/.zshenv
export PATH="$HOME/.foundry/bin:$PATH"

npm run build
npm run test
npm run preflight:pharos
```

These commands reproduce the completed validation evidence above.

## Diligence expansion (2026-06-18)

### Skill eval

```bash
npm run eval:skill
# Skill eval: 64/64 passed
```

### OFAC snapshot + local state merge

```bash
npm run diligence:sync
# assets/knowledge/denylist_ofac_eth.json (93 ETH addresses, snapshot 2026-06-18)
```

### MockOFACRegistry (Atlantic live)

```bash
npm run deploy:mock-ofac
```

| Field | Value |
|---|---|
| Contract | `0x4FD317Ec868fdbd6e95c56f157DDf86d7b97F400` |
| Deploy tx | `0x7ae012f2ac8d388faa808005145054e9db338157a20be2c6f091eba5fa3fa8fa` |
| Sample sanctioned | `0x7F367cC41522cE07553e823bf3be79A889DEbe1B` → `isSanctioned == true` |

Verification:

```bash
export RPC=https://atlantic.dplabs-internal.com
export ORACLE=0x4FD317Ec868fdbd6e95c56f157DDf86d7b97F400
cast call $ORACLE "isSanctioned(address)(bool)" 0x7F367cC41522cE07553e823bf3be79A889DEbe1B --rpc-url $RPC
```

### Spawn v5 (4 diligence references)

```bash
npm run spawn:asset
# skills/MPF-asset/ — MPF-diligence-onchain/offchain/sanctions/compliance-knowledge
```

See `docs/diligence/CHANGELOG.md` and `docs/WORKED_EXAMPLE.md` for the full three-stage diligence flow.
