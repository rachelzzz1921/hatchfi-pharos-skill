<div align="center">

<img src="./assets/brand/logo.png" alt="HatchFi" width="132" height="132" />

# HatchFi · 链孵

### 把合规 RWA 孵化成 Agent Skill。

每孵化一支 RWA，就为*你自己*留下一个私有运营 Skill——归你所有，越用越强。

[![tests](https://img.shields.io/badge/Foundry-24_passed-3dd68c?style=flat-square)](./docs/COMPLETED_VALIDATION.md)
[![live](https://img.shields.io/badge/Pharos_Atlantic-已部署-2dd4bf?style=flat-square)](https://atlantic.pharosscan.xyz/address/0xfef7519bebda6c47af49583dbc9e60801f8aa3de)
[![skill](https://img.shields.io/badge/孵化Skill-私有+复利-c9a227?style=flat-square)](./skills/MPF-asset/SKILL.md)
[![audit](https://img.shields.io/badge/生产就绪审计-Strong_88%2F100-c9a227?style=flat-square)](./docs/SECURITY.md)
[![standard](https://img.shields.io/badge/ERC--3643-风格-0b3d2e?style=flat-square)](./src/CompliantRWAToken.sol)

[English](./README.md)  ·  **🌐 中文**  ·  📊 [在线看板](https://htmlpreview.github.io/?https://github.com/rachelzzz1921/hatchfi-pharos-skill/blob/main/SUBMISSION_DASHBOARD.html)

**Pharos Skill-to-Agent 黑客松 2026** · [立即报名](https://bit.ly/4xkU0Wx) · [Agent Carnival](https://www.pharos.xyz/agent-carnival) · [开发者手册](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide) · [Discord](https://discord.com/invite/pharos) · [Telegram](https://t.me/+U27f5oGnJNlkZTI0)

</div>

---

## 没人愿意碰的难题

把现实世界资产搬上链，**不是**「发个代币」。一支受监管的 RWA，必须在代币内部回答几个硬问题：

> 谁能持有？能转给谁？违规钱包怎么处置？收益怎么分配、怎么审计？

标准 ERC-20 一个都答不了。大多数「RWA」黑客松项目停在一个 mint 按钮，悄悄跳过了合规、生命周期，以及最关键的——**一个 Agent 如何长期运营这支资产**。

## HatchFi 做了什么

HatchFi 是面向 Pharos 合规 RealFi 的 **Agent 原生发行层**。它把受监管的 RWA 发行做成一条 AI Agent 能端到端执行（尽调、合规发行、生命周期、审计）、链上可验证的工作流，然后——这是关键——**为你留下一个针对该资产的私有运营 Skill，并在你与它对话的过程中持续变强**。

```
①  尽调闸门        →   ②  合规发行           →   ③  Skill 孵化（归你）
   只读风险画像          ERC-3643 代币           生成 skills/<SYMBOL>-asset/
   GREEN/YELLOW/RED      已在 Atlantic 部署        默认私有 · 服务你自己
   RED 拒绝发行          身份·合规·冻结三闸        在对话中持续精炼
```

合规、尽调、审计是硬能力底座，不是事后补丁。详见 [合规是特性](#合规是特性不是摩擦) 与 [为 Pharos 而生](#为-pharos-而生--realfi--agentic--composable)。

## 为 Pharos 而生 — RealFi · Agentic · Composable

Pharos 位于 **RealFi**、**协议原生合规**与 **Agent 链上基础设施**的交汇点。HatchFi **扩展官方 [Pharos Skill Engine](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide)**——保留 `assets/networks.json`、写操作预检与 `pharos-base-ops.md`，在其上叠加 RWA 专有 playbook。

| Pharos 叙事 | HatchFi 如何交付 |
|---|---|
| **RealFi / RWA** | ERC-3643 风格 `CompliantRWAToken`——身份、合规上限、派息、生命周期。**已在 Atlantic 部署。** |
| **协议原生合规** | `_update()` 钩子强制 `isVerified` + `canTransfer`；**mint 强制同一套上限**（合规关键修复，审计 D2） |
| **Agentic 基础设施** | `SKILL.md` 能力索引 · 风险分档 🟢🟡🔴 · 人工确认卡片 · `state.json` 审计记忆 · 同意闸 🔑 |
| **可组合生态** | **Skill 产 Skill 飞轮**：每次发行 → `skills/<SYMBOL>-asset/`——opt-in 分享培育 Pharos 上的带权限 RealFi 网络 |

## 端到端流水线——四阶段，每步都有闸门

```
Phase A  尽调闸门          →  Phase B  合规发行           →  Phase C  生命周期运营        →  Phase D  Skill 孵化
         只读 cast               部署 ERC-3643 代币              白名单 / 冻结 / mint              spawn skills/MPF-asset/
         GREEN/YELLOW/RED        身份·合规·冻结三闸              派息 / 恢复 / 审计               PERMISSIONS.md · 私有
         RED 拒绝发行            24 测试 + 8 项审计              cast logs（12 事件）             个性化精炼循环
```

**7 份 Agent playbook**（`references/`）：`onchain-diligence` · `rwa-issuance` · `rwa-dividend` · `spawn-asset-skill` · `pharos-base-ops` · `pharos-deploy-runbook` · `pharos-verification`

**合约能力面**：20 个外部函数 · 12 个 ERC-3643 对齐事件 · 5 个类型化错误 · 24 项 Foundry 测试（含 fuzz 不变量）

## 它会复利——为*你*而复利

这是最该被评委记住的部分。

大多数发行工具只产出**一支**代币就结束了。HatchFi 产出代币的同时，还为该资产产出**一个私有运营 Skill**——合约地址和操作命令都已写死。当你用自然语言管理这支资产时，这个 Skill **会学习你的偏好、越来越贴合你的 RWA 需求**（常用辖区、持有人上限、派息节奏、披露模板）。

```
HatchFi（母 Skill）
  └── 在 Atlantic 发行 MPF  ──spawn──►  skills/MPF-asset/   ◄── 首先服务你
        └── 你持续运营它   ──精炼──►  更贴合你的 Skill     （白名单、mint、派息）
                                                              无需重新部署
```

> **孵化 → 自然语言运营 → Skill 复利式贴合*你*的需求。** 飞轮朝内转：它让*你自己*的合规 RealFi 越来越便宜、越来越锋利，而不是替别人省成本。

### 数据归你，分享由你决定。

这个 Skill 及它积累的一切——投资者身份、尽调证据、派息明细、你的偏好——**都归你所有、默认私有**。它们存在你本地的 `state.json`（gitignore），不上链，不会被打包进可分享的包里。

- 🔑 **沉淀同意**——记录任何个人/敏感信息前，agent 先征求同意。
- 🔑 **开放同意**——对外开放某个 Skill 或数据范围是显式 opt-in，且会输出一份**权限清单**（明确「**暴露什么** vs **保留什么**）。见自动生成的 [`PERMISSIONS.md`](./skills/MPF-asset/PERMISSIONS.md)。

> **分享一个 Skill ≠ 分享你的数据。** spawn 出的 Skill 只带公开操作面（合约地址 + 命令）；你的主权账本除非你同意，否则绝不离开你的机器。

这已经被实证，不是设想：发行 **MPF** 自动产出了 [`skills/MPF-asset/`](./skills/MPF-asset/SKILL.md)——一个带权限清单、私有、即可运营的 Skill，*你*今天就能跑，并且只在你愿意时才对外开放。

**而当你*选择*开放时，它对生态是真有用的。** 一个 spawn 出的 Skill 是经过验证、合规就绪的运营单元——合约写死、尽调/发行/派息 playbook 齐全。Opt-in 的分享，正是 HatchFi 为 Pharos 培育一张「可复用、带权限」的 RealFi Skill 网络的方式：每个愿意开放的发行人就贡献一个即用的资产 Skill，合规 RealFi 的边际成本持续下降——**但一切以每位发行人自己的意愿为准、附带清晰权限清单、绝不默认开放。** 飞轮照样转，只是开关握在发行人手里。

## 公开生态——opt-in、带权限、可组合

HatchFi 的**公开价值真实且已实证**。这不是「隐私 vs 生态」——而是**默认私有，生态靠选择**。

```
Agent A  HatchFi（母 Skill）
  ├─ 尽调闸门 → Atlantic 部署 MPF → smoke mint
  └─ spawn skills/MPF-asset/（私有 · PERMISSIONS.md）

Agent B, C, …（发行人经 🔑 开放同意后）
  └─ import skills/MPF-asset/SKILL.md
       └─ 管理白名单 · mint · 派息 · 尽调
            无需重新部署 · 无法访问发行人的 state.json

每孵化一支新 RWA  →  Pharos 上 +1 个可组合能力单元
  →  合规 RealFi 边际成本趋近于零
  →  开关握在发行人手里 · 权限清单声明暴露 vs 保留
```

| 层级 | 包 | 复用方式 |
|---|---|---|
| **母 Skill** | `SKILL.md` + 7 份 reference | 任意 Pharos Agent 驱动完整 RWA 发行流水线 |
| **子 Skill（已落地）** | [`skills/MPF-asset/`](./skills/MPF-asset/SKILL.md) | Manhattan Property Fund · `TOKEN=0xfef7…Aa3DE` · 3 份绑定 reference · 今日可运营 |
| **下一支 RWA** | `skills/<NEXT>-asset/` | 同一 spawn 流水线——从 `state.asset` 确定性模板填充，零 LLM 幻觉 |

> **孵化越多 RWA → 越多 opt-in Skill → Pharos 上的带权限 RealFi 网络。** 默认私有，生态靠选择。

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

### 发行前尽调闸门（Phase A）

任何 deploy/mint 之前，agent 对目标地址跑**只读、零 gas** 的 `cast` 检查。每条结论都有 evidence——命令、原始返回值、推断、flag——写入 `state.diligence`。**RED 拒绝一切发行。**

| 检查项 | 命令 | RED 触发 |
|---|---|---|
| `denylist` | `state.config.denylist` 比对 | 命中 → **risk → RED** |
| `code_size` | `cast codesize <target>` | 合约已自毁（size==0）→ **RED** |
| `is_contract` | `cast code <target>` | 有字节码 → warn（复核） |
| `balance` / `tx_count` | `cast balance` · `cast nonce` | 零余额或零 nonce → warn |

完整 playbook：[`references/onchain-diligence.md`](./references/onchain-diligence.md)

### 四模块合一（未来可拆分）

函数与事件命名严格对齐 **ERC-3643（T-REX）**，便于未来平滑拆分为标准多合约套件：

- **IdentityRegistry** — `isVerified` / `registerIdentity` / `removeIdentity`
- **ModularCompliance** — `canTransfer` / `maxHolders` / `maxBalancePerInvestor`
- **Lifecycle** — 冻结 / `forcedTransfer` / `recoveryAddress` / pause
- **Dividends** — `depositDividend` / `claimDividend` / `sweepUndistributedDividend`

**权限矩阵**：`onlyOwner`（治理、派息、dust 回收）vs `onlyAgent`（KYC、mint、冻结、监管路径）——完整表格见 [`docs/SECURITY.md`](./docs/SECURITY.md)。

## 像生产基础设施一样被审查，而非黑客松 demo

HatchFi 的强，不只在代码本身，更在**代码扛过的流程**。提交前它走完了一整套合规 + 安全 + 生产就绪的审查闭环，每个问题都**配回归测试修复**或被显式记录。

| 审查关卡 | 结果 |
|---|---|
| **TDD 测试套件** | **24 项 Foundry 测试，0 失败**，含一个**fuzz 不变量**——证明派息绝不超发（`可领 + dust ≤ 存入`） |
| **独立安全审计**（[`docs/SECURITY.md`](./docs/SECURITY.md)） | **暴露 8 项发现，全部修复或记录**——每个修复都钉上一个具名回归测试 |
| **合规性审查** | 抓出一个**合规关键**缺口（`mint` 绕过持有人/额度上限）并堵上——发行现在与转账强制同一套 `canTransfer` 规则 |
| **生产就绪审计** | 评分 **Strong（88/100）**——无提交 blocker |
| **对抗式（红队）评审** | Skeptic 一轮指出文档/打包风险，提交前**全部解决** |
| **链上验证** | Atlantic 上 `preflight → deploy → smoke`，每张 receipt 断言 `status == 1` |

审计中的代表性修复（均有测试覆盖）：

- **D2 · 合规关键** —— `mint` 现强制 `maxHolders` + `maxBalancePerInvestor`，一级发行不能突破合规边界。
- **F1 · burn 下溢** —— `burn` 重新平衡 `_frozenTokens`，避免部分冻结的持有人账户被锁死。
- **D3 / D4 · 派息完整性** —— 整除 dust 可经 `sweepUndistributedDividend` 回收；钱包恢复会迁移未领分红。

再加一张最小权限**权限矩阵**（`onlyOwner` 治理 vs `onlyAgent` 运营）与 12 个事件的审计留痕——完整表格见 [`docs/SECURITY.md`](./docs/SECURITY.md)。

## 为 Agent 运营而设计

HatchFi 是 Pharos **Skill**，不是脚本。Agent 按 [`SKILL.md`](./SKILL.md) 执行真实的操作纪律：

- **尽调前置** — RED 评级或检查不过即拒绝发行，并给出 evidence
- **风险分档** — 🟢 自动 · 🟡 留痕 · 🔴 部署/mint/派息前出人工确认卡片
- **同意闸** — 🔑 沉淀个人数据或对外分享 Skill 前需显式同意（并附权限清单）
- **Receipt 断言** — 每笔写操作验 `status==1` 才继续
- **审计记忆** — `state.json` 记录尽调、准入、派息与操作历史——默认归你私有
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

## 评委 · 60 秒可验证

| 步骤 | 操作 |
|---|---|
| **链上** | [PharosScan · MPF 合约](https://atlantic.pharosscan.xyz/address/0xfef7519bebda6c47af49583dbc9e60801f8aa3de) · [Deploy tx](https://atlantic.pharosscan.xyz/tx/0x71ebe568c6d41390cfc6b6f452c30c85d38d0b4ddead941d19383a7e39417e4d) · [Smoke mint](https://atlantic.pharosscan.xyz/tx/0x7ece3b86646685fbf9312bf91b68fc18ae694c3ccd50e8fdba148d6348bb5541) |
| **Spawn 子 Skill** | [`skills/MPF-asset/SKILL.md`](./skills/MPF-asset/SKILL.md)——合约地址 `TOKEN=0xfef7…` 已写死 |
| **本地（2 分钟）** | `git clone` → `npm run build && npm run test` → **24 passed · 0 failed** |
| **在线看板** | [交互式概览（EN/中文）](https://htmlpreview.github.io/?https://github.com/rachelzzz1921/hatchfi-pharos-skill/blob/main/SUBMISSION_DASHBOARD.html) |

**为什么值得进决赛：** Atlantic 真部署 · ERC-3643 合规 + 尽调闸门 · 24 测试 + 8 项审计全修复 · Skill→Skill 飞轮已实证（MPF-asset）· 扩展官方 Skill Engine · 数据主权 + opt-in 生态 · 生产就绪 **Strong 88/100**。

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

Pharos Skill-to-Agent 黑客松 2026 · [立即报名](https://bit.ly/4xkU0Wx) · [Agent Carnival](https://www.pharos.xyz/agent-carnival) · [开发者手册](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide) · [Discord](https://discord.com/invite/pharos) · [Telegram](https://t.me/+U27f5oGnJNlkZTI0)

</div>
