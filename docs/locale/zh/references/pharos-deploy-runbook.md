# Pharos Atlantic Testnet · 部署 Runbook

> **目标**：你只需在终端设置 `PRIVATE_KEY` 和 `PHAROS_RPC_URL`，运行下面命令即可完成部署与验证。
> **工作目录**：`pharos-rwa-skill/`（Foundry 项目）

## 项目识别

| 项 | 值 |
|---|---|
| 框架 | **Foundry**（`foundry.toml` + `script/` + `test/`） |
| 主合约 | `CompliantRWAToken`（`src/CompliantRWAToken.sol`） |
| 部署脚本 | `script/Deploy.s.sol:Deploy` |
| 测试 | `test/CompliantRWAToken.t.sol`（16 用例） |
| 前端 | 无（跳过 wagmi 适配） |

## 网络参数

| 项 | 值 |
|---|---|
| Network | Pharos Atlantic Testnet |
| Chain ID | **688689** |
| Native Token | PHRS |
| RPC 默认 | `https://atlantic.dplabs-internal.com` |
| Explorer 主 | https://atlantic.pharosscan.xyz |
| Explorer 备 | https://pharos-testnet.socialscan.io |

## 安全规则（必须遵守）

1. 不索要助记词 / 私钥
2. 私钥**只**从环境变量 `PRIVATE_KEY` 读取
3. 不把私钥写入源码、README、日志、JSON、git
4. `.env` 在 `.gitignore` 中；仓库只保留 `.env.example`
5. 不用 bot / 刷号脚本
6. 链上 write 仅低风险：`registerIdentity` + `mint 1 token`

## 环境变量

```bash
# .env.example（复制为 .env 本地使用，勿提交）
PRIVATE_KEY=
PHAROS_RPC_URL=https://atlantic.dplabs-internal.com

# 可选：覆盖部署参数
ASSET_NAME=Manhattan Property Fund
ASSET_SYMBOL=MPF
MAX_HOLDERS=100
MAX_BALANCE=1000000000000000000000000
```

## 一键命令流

```bash
cd pharos-rwa-skill

# 0. 依赖（首次）
curl -L https://foundry.paradigm.xyz | bash && foundryup
forge install OpenZeppelin/openzeppelin-contracts@v5.1.0 --no-commit
forge install foundry-rs/forge-std --no-commit

# 1. 本地验证（无需私钥）
npm run build          # forge build
npm run test           # forge test -vvv
npm run check          # ./check.sh

# 2. 链上（需私钥 + PHRS）
export PRIVATE_KEY=0x你的私钥          # 你自己设置，不要发给 agent
export PHAROS_RPC_URL=https://atlantic.dplabs-internal.com

npm run preflight:pharos
npm run deploy:pharos
npm run smoke:pharos
npm run verify:pharos   # 记录浏览器验证结果
```

## 部署后产物

| 文件 | 内容 |
|---|---|
| `deployments/pharos.json` | 地址、tx、explorer 链接 |
| `DEPLOYMENT_RESULT.md` | 部署后生成的人类可读部署报告 |
| `state.json` | `state.schema.json` 的 asset 段（agent 记忆） |
| `broadcast/` | Foundry 广播记录（可 gitignore） |

## Explorer 链接格式

```
https://atlantic.pharosscan.xyz/address/<CONTRACT>
https://atlantic.pharosscan.xyz/tx/<TX_HASH>
https://pharos-testnet.socialscan.io/address/<CONTRACT>
```

## 冒烟流程（Phase 6）

1. **Read**：`name()`、`symbol()`、`maxHolders()`、`holderCount()`、`owner()`
2. **Write**：`registerIdentity(deployer, 840)` → receipt OK
3. **Write**：`mint(deployer, 1e18)` → receipt OK
4. **Read**：`isVerified(deployer)`、`balanceOf(deployer)`

## 错误兜底

| 现象 | 动作 |
|---|---|
| RPC 失败 | 重试一次；仍失败 → 换 `PHAROS_RPC_URL`（如 ZAN 自建） |
| chainId ≠ 688689 | **停止部署** |
| 余额 = 0 | **停止** → 去 faucet 领 PHRS |
| 编译失败 | 最小修复，不改业务逻辑 |
| verify 结果 | 记入 `DEPLOYMENT_RESULT.md` |

## 与黑客松流水线的关系

```
本地 Phase 1-4 (build/test/security)
    ↓
Phase 5 preflight（你设 PRIVATE_KEY）
    ↓
Phase 6 deploy + smoke → state.json
    ↓
Phase 7 verify（可选）
    ↓
spawn-asset-skill → skills/MPF-asset/
    ↓
DEMO.md 录屏
```

详细门禁见 `references/pharos-verification.md`。
