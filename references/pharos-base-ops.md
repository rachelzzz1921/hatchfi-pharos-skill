# Pharos Base Operations (Skill Engine aligned)

> Network: `assets/networks.json` → `atlantic_testnet` (default) or `pacific_mainnet`.
> Private key: explicit `--private-key $PK` on every command.
> RWA-specific ops: `rwa-issuance.md` / `rwa-dividend.md` / `onchain-diligence.md`.

---

## Query Balance

### Command Template

```bash
cast balance $DEPLOYER --rpc-url $RPC --ether
```

### Agent Guidelines

1. Read-only; pre-checks 2–4 optional (still confirm RPC).
2. Output unit is ether (PHRS).

---

## Query ERC20 Balance

### Command Template

```bash
cast call <token> "balanceOf(address)(uint256)" $DEPLOYER --rpc-url $RPC
```

---

## Send Native PHRS

### Command Template

```bash
cast send <recipient> --value <amount>ether --private-key $PK --rpc-url $RPC
```

### Error Handling

| Error | Cause | Action |
|---|---|---|
| `insufficient funds` | Insufficient balance | Check balance; request testnet PHRS |
| `connection refused` | Missing `--rpc-url` | Set `$RPC` from networks.json |

### Agent Guidelines

1. Complete SKILL.md Write Operation Pre-checks.
2. `cast receipt` assert success before continuing.

---

## Deploy Contract (forge script)

### Command Template

```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $RPC --private-key $PK --broadcast
```

### Verify (after deploy)

```bash
sleep 10
forge verify-contract <addr> src/CompliantRWAToken.sol:CompliantRWAToken \
  --chain-id $CHAIN_ID \
  --verifier-url https://api.socialscan.io/pharos-atlantic-testnet/v1/explorer/command_api/contract \
  --verifier blockscout
```

> Full Pharos deploy runbook: → `pharos-deploy-runbook.md`
