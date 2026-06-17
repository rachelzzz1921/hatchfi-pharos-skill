# HatchFi

**Where compliant RWAs hatch into Agent Skills.**

Pharos Skill-to-Agent package · live on Atlantic · Skill→Skill flywheel proven with `skills/MPF-asset/`

> Technical name: Compliant RWA Issuance Agent · Brand kit: `BRAND.md`

一个面向 **Pharos** 的合规 RWA（现实世界资产）发行 Skill。它把"发行一支受监管的链上资产"这件事，做成一条 AI agent 可以端到端驱动的流水线：

```
① 尽调闸门  →  ② 合规发行（ERC-3643）  →  ③ 自我繁殖
  只读风险画像     发行/转账/冻结/派息全生命周期    产出该资产专属可复用 skill
```

## 解决什么真实问题

RWA 上链的核心障碍不是"发个代币"，而是**合规**：只有通过 KYC 的合格投资者才能持有、转账要受监管规则约束、要能冻结/强制划转/追溯。标准 ERC-20 做不到这些。本 skill 基于 **ERC-3643（T-REX）** 标准实现"默认禁止转账、每笔转移强制通过身份验证 + 合规规则两道检查"，并配套发行前尽调与收益派息——正是 Pharos「RealFi / 协议层原生合规」愿景所需的底层能力。

## 三个特点

- **合规优先**：ERC-3643 标准的身份注册、受限转账、冻结、强制转移、钱包恢复，函数与事件命名严格对齐标准。
- **可信尽调闸门**：发行前对相关方做只读链上尽调，红黄绿评级**每条结论可追溯到具体 cast 命令与返回值**；评级为 RED 时拒绝发行。
- **自我繁殖飞轮（已实证）**：MPF 已在 Atlantic 部署（[`0xfef7…Aa3DE`](https://atlantic.pharosscan.xyz/address/0xfef7519bebda6c47af49583dbc9e60801f8aa3de)），并 spawn 出 `skills/MPF-asset/`——其他 agent 可直接复用，无需重新部署。

## 怎么跑

完整验证流程见 `VALIDATION_PLAN.md`。最小命令如下：

```bash
# 1. 装 Foundry
curl -L https://foundry.paradigm.xyz | bash && foundryup

# 2. 装依赖
forge install OpenZeppelin/openzeppelin-contracts@v5.1.0
forge install foundry-rs/forge-std

# 3. 自检（编译 + 测试 + checklist）
npm run build
npm run test
npm run check

# 4. 部署到 Pharos atlantic 测试网（私钥走环境变量，绝不入库）
export PRIVATE_KEY=0x...
export PHAROS_RPC_URL=https://atlantic.dplabs-internal.com
npm run preflight:pharos
npm run deploy:pharos
npm run smoke:pharos
npm run spawn:asset   # → skills/MPF-asset/（飞轮落点）
```

**Atlantic 链上证据**：MPF @ `0xfef7519bebda6c47af49583dbc9e60801f8aa3de` · 24 Foundry tests passed · 详见 `COMPLETED_VALIDATION.md` · `DEPLOYMENT_RESULT.md`

网络：Pharos atlantic 测试网（RPC `https://atlantic.dplabs-internal.com`，chainId `688689`）。

## 结构

```
SKILL.md                 # 能力索引内核（agent 入口）：意图 → 能力 → 风险档 → reference
state.schema.json        # agent 跨步骤状态记忆 schema（尽调→发行→派息全流程 + 审计留痕）
src/CompliantRWAToken.sol # ERC-3643 合规 RWA 代币（20 外部函数 / 12 事件 / 5 错误）
references/
  onchain-diligence.md   # 尽调闸门（可验证 evidence + 写死评级规则）
  rwa-issuance.md        # 发行主干（风险三档 + 确认卡片 + 操作后断言）
  rwa-dividend.md        # 收益派息（按比例，gas 安全）
  spawn-asset-skill.md   # 自我繁殖（确定性模板填充）
  pharos-deploy-runbook.md # Pharos 部署/冒烟 runbook
  pharos-verification.md # 分阶段验证循环
script/Deploy.s.sol      # 部署脚本
scripts/                 # preflight / post-deploy / smoke / verify
test/CompliantRWAToken.t.sol # 22 个测试（含 fuzz，forge test 验证）
check.sh / DEMO.md       # 自检脚本 / 演示大纲
SUBMISSION.md            # 比赛提交摘要：亮点、文件、demo narrative
VALIDATION_PLAN.md       # 本地验证、Pharos 部署、冒烟测试与自我繁殖计划
```

## 操作风险三档

| 档 | 操作 | agent 行为 |
|---|---|---|
| 🟢 低 | 所有 view / 尽调 / 繁殖 | 全自动 |
| 🟡 中 | 注册 / 冻结 / 规则调整 / 授权 | 自动 + 审计留痕 |
| 🔴 高 | deploy / mint / burn / 派息 / 强制划转 / 钱包恢复 | 出确认卡片，人 confirm 才执行 |

> Phase 2 展望：本 skill 本身即一个完整 agent 的内核；其自我繁殖产出的资产专属 skill，可作为 Agent Arena 中其他 agent 的可复用能力单元。
