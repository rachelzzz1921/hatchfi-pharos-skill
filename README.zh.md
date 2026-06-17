<div align="center">

<img src="./assets/brand/logo.png" alt="HatchFi" width="132" height="132" />

# HatchFi · 链孵

### 把合规 RWA 孵化成可复用 Agent Skill。

每孵化一支 RWA，就留下一个可复用 Skill。

[![tests](https://img.shields.io/badge/Foundry-24_passed-3dd68c?style=flat-square)](./docs/COMPLETED_VALIDATION.md)
[![live](https://img.shields.io/badge/Pharos_Atlantic-已部署-2dd4bf?style=flat-square)](https://atlantic.pharosscan.xyz/address/0xfef7519bebda6c47af49583dbc9e60801f8aa3de)
[![flywheel](https://img.shields.io/badge/Skill产Skill-飞轮已实证-c9a227?style=flat-square)](./skills/MPF-asset/SKILL.md)
[![standard](https://img.shields.io/badge/ERC--3643-风格-0b3d2e?style=flat-square)](./src/CompliantRWAToken.sol)

[English](./README.md)  ·  **🌐 中文**  ·  📊 [在线看板](https://htmlpreview.github.io/?https://github.com/rachelzzz1921/hatchfi-pharos-skill/blob/main/SUBMISSION_DASHBOARD.html)

</div>

---

## 没人愿意碰的难题

把现实世界资产搬上链，**不是**「发个代币」。一支受监管的 RWA，必须在代币内部回答几个硬问题：

> 谁能持有？能转给谁？违规钱包怎么处置？收益怎么分配、怎么审计？

标准 ERC-20 一个都答不了。大多数「RWA」黑客松项目停在一个 mint 按钮，悄悄跳过了合规、生命周期，以及最关键的——**一个 Agent 如何长期运营这支资产**。

## HatchFi 做了什么

HatchFi 是面向 Pharos 合规 RealFi 的 **Agent 原生发行层**。它把受监管的 RWA 发行做成一条 AI Agent 能端到端执行、链上可验证、并且——这是关键——**沉淀成可复用 Skill** 的工作流。

```
①  尽调闸门        →   ②  合规发行           →   ③  Skill 孵化
   只读风险画像          ERC-3643 代币           生成 skills/<SYMBOL>-asset/
   GREEN/YELLOW/RED      已在 Atlantic 部署        任意 Agent 可复用
   RED 拒绝发行          每笔转账双重闸门          无需重新部署
```

## 飞轮——为什么会复利增长

这是最该被评委记住的部分。

大多数发行工具只产出**一支**代币就结束了。HatchFi 产出代币的同时，还产出**一个针对该资产的可复用 Agent Skill**——合约地址和操作命令都已写死。

```
HatchFi（母 Skill）
  └── 在 Atlantic 发行 MPF  ──spawn──►  skills/MPF-asset/   ◄── 任意 Agent 导入
        └── 发行下一支 RWA  ──spawn──►  skills/<NEXT>-asset/     直接运营该资产
                                                                  （白名单、mint、派息）
                                                                  无需重新部署
```

> **孵化越多 RWA → 沉淀越多 Skill → Pharos 上合规 RealFi 的边际成本趋近于零。**

这已经被实证，不是设想：发行 **MPF** 自动产出了 [`skills/MPF-asset/`](./skills/MPF-asset/SKILL.md)——一个其他 Agent 今天就能直接运行的独立 Skill。

## 它是 live 的——60 秒可验证

这不是 PPT。HatchFi **已在 Pharos Atlantic 部署并通过 smoke 测试**。

| | |
|---|---|
| **合约（MPF）** | [`0xfef7519bebda6c47af49583dbc9e60801f8aa3de`](https://atlantic.pharosscan.xyz/address/0xfef7519bebda6c47af49583dbc9e60801f8aa3de) |
| **Deploy tx** | [`0x71ebe5…17e4d`](https://atlantic.pharosscan.xyz/tx/0x71ebe568c6d41390cfc6b6f452c30c85d38d0b4ddead941d19383a7e39417e4d) |
| **Smoke mint tx** | [`0x7ece3b…b5541`](https://atlantic.pharosscan.xyz/tx/0x7ece3b86646685fbf9312bf91b68fc18ae694c3ccd50e8fdba148d6348bb5541) |
| **网络** | Pharos Atlantic Testnet · chainId `688689` |

## 合规是特性，不是摩擦

合约采用 **ERC-3643（T-REX）风格**，每笔转账都经由 `_update()` 钩子的三层闸门：

```
transfer / mint / forcedTransfer
        │
        ▼  _update() 钩子
   ┌──────────────┬──────────────────────┬─────────────────────┐
   │ 身份层        │ 合规层                │ 冻结层              │
   │ isVerified() │ canTransfer()        │ 可用 ≥ amount       │
   │ 收款方 KYC    │ 持有人/额度上限       │ 钱包未冻结          │
   └──────────────┴──────────────────────┴─────────────────────┘
        │ 全部通过 → 转账执行 + 派息自动结算
        │ 任一失败 → revert（NotVerified / ComplianceFailure / WalletFrozen）
```

- **transfer** → 三层全过
- **mint** → 身份 **+** 合规上限（一级发行同样受持有人/额度约束）
- **forcedTransfer** → 监管路径；仅校验收款方已验证，绕过全局规则

背后是 **24 项 Foundry 测试**（含 fuzz 不变量）+ [`SECURITY.md`](./docs/SECURITY.md) 审计记录，已修复 burn 下溢、派息余数、冻结份额等边界问题。

## 为 Agent 运营而设计

HatchFi 是 Pharos **Skill**，不是脚本。Agent 按 [`SKILL.md`](./SKILL.md) 执行真实的操作纪律：

- **尽调前置** — RED 评级或检查不过即拒绝发行，并给出 evidence
- **风险分档** — 🟢 自动 · 🟡 留痕 · 🔴 部署/mint/派息前出人工确认卡片
- **Receipt 断言** — 每笔写操作验 `status==1` 才继续
- **审计记忆** — `state.json` 记录尽调、准入、派息与操作历史
- **私钥安全** — 私钥仅走环境变量，绝不入库

## 自己跑一遍

```bash
curl -L https://foundry.paradigm.xyz | bash && foundryup
forge install OpenZeppelin/openzeppelin-contracts@v5.1.0 && forge install foundry-rs/forge-std

npm run build && npm run test     # 24 passed
npm run check                     # 无硬编码私钥

export PRIVATE_KEY=0x...          # 仅本机，绝不入库
export PHAROS_RPC_URL=https://atlantic.dplabs-internal.com
npm run preflight:pharos
npm run deploy:pharos
npm run smoke:pharos
npm run spawn:asset               # → skills/MPF-asset/（飞轮落点）
```

详细流程：[`QUICKSTART.md`](./docs/QUICKSTART.md) · [`WORKED_EXAMPLE.md`](./docs/WORKED_EXAMPLE.md) · [`VALIDATION_PLAN.md`](./docs/VALIDATION_PLAN.md)

## 文档导航

| 文档 | 内容 |
|---|---|
| [`SKILL.md`](./SKILL.md) | Agent 入口——能力索引、预检纪律、风险分档 |
| [在线看板](https://htmlpreview.github.io/?https://github.com/rachelzzz1921/hatchfi-pharos-skill/blob/main/SUBMISSION_DASHBOARD.html) | 可视化看板，含 EN/中文 切换 |
| [`docs/COMPLETED_VALIDATION.md`](./docs/COMPLETED_VALIDATION.md) | 本地 + 链上验证证据 |
| [`DEPLOYMENT_RESULT.md`](./DEPLOYMENT_RESULT.md) | 部署 + smoke 记录（自动生成）|
| [`docs/SECURITY.md`](./docs/SECURITY.md) | 审计发现与修复 |
| [`docs/PHAROS_VISION.md`](./docs/PHAROS_VISION.md) | RealFi / Agentic 愿景对齐 |
| [`docs/SUBMISSION.md`](./docs/SUBMISSION.md) | 黑客松提交说明 |
| [`docs/BRAND.md`](./docs/BRAND.md) | HatchFi 品牌套件 |

## 仓库结构

```
SKILL.md                       Agent 入口：意图 → 能力 → 风险 → reference
src/CompliantRWAToken.sol      ERC-3643 风格 RWA 代币（20 外部函数 / 12 事件 / 5 错误）
test/CompliantRWAToken.t.sol   24 项测试（含 fuzz 不变量）
script/Deploy.s.sol            Foundry 部署脚本
references/                    7 份 cast/forge 操作指令（Agent 的 playbook）
scripts/                       preflight / post-deploy / smoke / verify / spawn 自动化
skills/MPF-asset/              ← 已 spawn 的资产 Skill（飞轮落点）
assets/                        品牌 logo + 代币/网络注册表 + 合约快照
deployments/pharos.json        链上部署记录（自动生成）
state.schema.json              跨步骤 Agent 记忆 + 审计留痕 schema
docs/                          叙事与提交文档（见上方表格）
SUBMISSION_DASHBOARD.html      可视化看板，含 EN/中文 切换
```

---

<div align="center">

由 **陈知维（Zhiwei Chen）** 构建 · 香港中文大学研究员
Pharos Skill-to-Agent Hackathon · 2026

</div>
