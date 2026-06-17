# Validation Plan

本 skill 把验证流程拆成清晰的 gates：local build、unit tests、Pharos preflight、deployment、smoke test、explorer verification、asset-skill spawning。每个 gate 都有独立命令，方便 agent 或人工逐步复现。

## Validation Gates

| Gate | Command | Purpose |
|---|---|---|
| Build | `npm run build` | 用 Foundry 编译 `CompliantRWAToken` |
| Tests | `npm run test` | 运行 16 个 smoke / invariant 测试 |
| Package check | `npm run check` | 执行 build、tests、placeholder scan、secret scan |
| Pharos preflight | `npm run preflight:pharos` | 检查 env、RPC、chainId、wallet、balance、block、gas |
| Deploy | `npm run deploy:pharos` | 广播 `script/Deploy.s.sol:Deploy` 到 Pharos Atlantic |
| Smoke | `npm run smoke:pharos` | 读取合约元数据，注册 deployer，mint 最小测试数量 |
| Verify | `npm run verify:pharos` | 尝试 Blockscout / Socialscan 合约验证 |
| Spawn | `npm run spawn:asset` | 根据部署后的 asset state 生成 `skills/<SYMBOL>-asset/` |

## Local Validation

```bash
cd pharos-rwa-skill

forge install OpenZeppelin/openzeppelin-contracts@v5.1.0 --no-commit
forge install foundry-rs/forge-std --no-commit

npm run build
npm run test
npm run check
```

## Pharos Atlantic Validation

私钥只在终端环境变量里设置；不要提交 `.env`，也不要把 private key 粘贴到聊天或文档中。

```bash
export PRIVATE_KEY=0x...
export PHAROS_RPC_URL=https://atlantic.dplabs-internal.com

npm run preflight:pharos
npm run deploy:pharos
npm run smoke:pharos
npm run verify:pharos
npm run spawn:asset
```

## Expected Artifacts

| Artifact | Produced By | Description |
|---|---|---|
| `deployments/pharos.json` | `npm run deploy:pharos` | 机器可读的部署记录 |
| `DEPLOYMENT_RESULT.md` | `npm run deploy:pharos` / `npm run smoke:pharos` | 人类可读的部署与 smoke report |
| `state.json` | `npm run deploy:pharos` / `npm run spawn:asset` | 记录 asset state 与 spawned skill 的 agent memory |
| `skills/<SYMBOL>-asset/` | `npm run spawn:asset` | 资产专属可复用 skill |

## Safety Constraints

- `PRIVATE_KEY` 只从环境变量读取。
- `.env` 和本地状态文件都被 `.gitignore` 忽略。
- Pharos smoke write 刻意保持最小：`registerIdentity(deployer)` 与 `mint(deployer, 1e18)`。
- 自动化 smoke 不包含 ownership transfer、forced transfer、recovery、withdrawal 或大额转账等高风险操作。
