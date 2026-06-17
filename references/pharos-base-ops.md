# Pharos Base Operations（对齐 Skill Engine）

> 网络：`assets/networks.json` → `atlantic_testnet`（默认）或 `pacific_mainnet`。
> 私钥：每条命令显式 `--private-key $PK`。
> RWA 专有操作见 `rwa-issuance.md` / `rwa-dividend.md` / `onchain-diligence.md`。

---

## Query Balance

### Command Template

```bash
cast balance $DEPLOYER --rpc-url $RPC --ether
```

### Agent Guidelines

1. 只读，无需 Pre-checks 2–4（仍建议确认 RPC）。
2. 输出单位为 ether（PHRS）。

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
| `insufficient funds` | 余额不足 | 查 balance，领测试 PHRS |
| `connection refused` | 缺 `--rpc-url` | 设 `$RPC` 来自 networks.json |

### Agent Guidelines

1. 完成 SKILL.md Write Operation Pre-checks。
2. `cast receipt` 断言成功后再续作。

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

> 完整 Pharos 部署 runbook：→ `pharos-deploy-runbook.md`
