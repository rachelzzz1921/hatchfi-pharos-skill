<div align="center">

<img src="./assets/brand/logo.png" alt="HatchFi" width="132" height="132" />

# HatchFi · 链孵

### 把合规 RWA 孵化成可复用的 Agent Skill。

在 Pharos 上用 Agent 发行合规 RWA，并为该资产保留一个可随使用而精炼的私有运营 Skill。

[![tests](https://img.shields.io/badge/Foundry-24_passed-3dd68c?style=flat-square)](./docs/COMPLETED_VALIDATION.md)
[![eval](https://img.shields.io/badge/skill_eval-50%2F50-3dd68c?style=flat-square)](./eval/skill_behavior_cases.json)
[![live](https://img.shields.io/badge/Pharos_Atlantic_Testnet-deployed-2dd4bf?style=flat-square)](https://atlantic.pharosscan.xyz/address/0xfef7519bebda6c47af49583dbc9e60801f8aa3de)
[![skill](https://img.shields.io/badge/hatched_Skill-private-c9a227?style=flat-square)](./skills/MPF-asset/SKILL.md)
[![inspector](https://img.shields.io/badge/Skill_Inspector-8%2F100_LOW-3dd68c?style=flat-square)](./docs/SKILL_SECURITY_REPORT.md)
[![standard](https://img.shields.io/badge/ERC--3643-style-0b3d2e?style=flat-square)](./src/CompliantRWAToken.sol)

**[English](./README.md)**  ·  **中文**  ·  [Live Dashboard](https://htmlpreview.github.io/?https://github.com/rachelzzz1921/hatchfi-pharos-skill/blob/main/SUBMISSION_DASHBOARD.html)

基于 [Pharos Skill Engine](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide) 构建 · 运行于 Pharos Atlantic 测试网

</div>

---

## HatchFi 是什么

HatchFi 是面向 Pharos 合规 RealFi 的 **Agent 原生发行层**。它将一支受监管现实世界资产的全生命周期——发行前尽调、ERC-3643 风格合规发行、生命周期运营、收益分配、链上审计——打包成一个 AI Agent 可端到端执行的 Pharos **Skill**。

资产发行完成后，HatchFi 还会**为该资产沉淀一个私有运营 Skill**（合约地址与命令集已写死）。你随后用自然语言运营这支资产，该 Skill 会保留可精炼的私有偏好档案。

```
①  尽调闸门   →   ②  合规发行   →   ③  Skill 孵化（归你）
   只读风险画像       ERC-3643 代币，已部署     spawn skills/<SYMBOL>-asset/
   绿/黄/红           运行于 Atlantic            默认私有 · 先服务你
   红档拒绝发行       身份·合规·冻结             对话中持续精炼
```

它扩展官方 [Pharos Skill Engine](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide)——保留 `assets/networks.json`、写操作预检与 `pharos-base-ops.md`，并在此基础上增加 RWA 专有 playbook、spawn/refine 流水线、合约能力面生成器、eval 套件与静态安全门。

> 扩展官方 [Pharos Skill Engine](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide)。提交概览与验证证据：[Live Dashboard](./SUBMISSION_DASHBOARD.html) · [`docs/SUBMISSION.md`](./docs/SUBMISSION.md)。

---

## 快速开始

```bash
# 1 · 工具链
curl -L https://foundry.paradigm.xyz | bash && foundryup
forge install OpenZeppelin/openzeppelin-contracts@v5.1.0 && forge install foundry-rs/forge-std

# 2 · 本地构建与验证（无需钱包）
npm run build && npm run test       # 24 项 Foundry 测试
npm run eval:skill                  # 50 项确定性 skill 检查
npm run inspect:skill               # 静态安全扫描
npm run check                       # 完整本地门禁（build · test · refs · eval · inspector）
```

在 Pharos Atlantic 上部署与运营：

```bash
export PRIVATE_KEY=0x...                                   # 仅本地，勿提交
export PHAROS_RPC_URL=https://atlantic.dplabs-internal.com
npm run preflight:pharos            # chainId 688689 + 余额预检
npm run deploy:pharos               # 部署 → deployments/pharos.json
npm run smoke:pharos                # mint + receipt 断言（按需 registerIdentity）
npm run spawn:asset                 # → skills/<SYMBOL>-asset/（你的私有运营 Skill）
```

分步说明：[`QUICKSTART.md`](./docs/QUICKSTART.md) · [`WORKED_EXAMPLE.md`](./docs/WORKED_EXAMPLE.md)

---

## 怎么用 —— 命令参考

HatchFi 通过 `npm` 脚本封装 Foundry、`cast` 与 Agent 工具链，按用途分组如下。

### 构建与验证

| 命令 | 作用 |
|---|---|
| `npm run build` | `forge build` |
| `npm run test` | 24 项 Foundry 测试（含派息 fuzz 不变量） |
| `npm run check` | 完整本地门禁：build · test · 私钥检查 · refs 漂移 · eval · inspector |

### 链上部署与运营

| 命令 | 作用 |
|---|---|
| `npm run preflight:pharos` | 写操作前校验 chainId `688689`、部署者余额与环境变量 |
| `npm run deploy:pharos` | 部署 `CompliantRWAToken`，写入 `deployments/pharos.json` |
| `npm run smoke:pharos` | `mint` + receipt 断言（deployer 已验证则跳过 `registerIdentity`；幂等） |
| `npm run verify:pharos` | 回读链上状态以对账 |

### Spawn 与 Skill 进化

| 命令 | 作用 |
|---|---|
| `npm run spawn:asset` | 从已部署资产生成 `skills/<SYMBOL>-asset/`（确定性模板填充） |
| `npm run refine:asset` | 从 `state.personalization` 精炼 → 写入 `PREFERENCES.md`（无需重新部署） |
| `npm run spawn:versions` | 列出 `skills/<SYMBOL>-asset/versions/` 归档 |
| `npm run spawn:rollback <id>` | 回滚到指定归档（回滚前会先归档当前态） |

### 从合约生成 reference

| 命令 | 作用 |
|---|---|
| `npm run refs:generate` | 解析 `CompliantRWAToken.sol` → `references/generated/contract-surface.{md,json}` |
| `npm run refs:check` | 同上，且对手工 cheat sheet 做漂移检测 |

### Skill 质量评测

| 命令 | 作用 |
|---|---|
| `npm run eval:skill` | 50 项确定性检查：尽调闸门、风险档、同意闸、spawn 结构 |
| `npm run eval:skill:json` | 同上，JSON 报告 |

### 安全门（安装 / 上传 / 发布 / 分享前）

| 命令 | 作用 |
|---|---|
| `npm run inspect:skill` | 静态扫描：prompt 注入、密钥泄露、危险模式、Web3/Solidity 风险 |
| `npm run inspect:skill:md` / `:json` | 写入 `docs/SKILL_SECURITY_REPORT.{md,json}` |
| `npm run publish:check` | inspector + 完整 `check.sh` —— 分享前建议执行 |

---

## Agent 执行的流水线

```
Phase A  尽调闸门     →  Phase B  合规发行      →  Phase C  生命周期运营    →  Phase D  Skill 孵化       →  Phase E  安全门
         只读 cast            部署 ERC-3643 代币         白名单 / 冻结 / mint        spawn skills/MPF-asset/      静态 inspector
         绿/黄/红             身份·合规·冻结             派息 / 恢复 / 审计          refine · version · rollback prompt/secret/Web3
         红档拒绝发行         24 测试 + 审计留痕         cast logs（12 events）      PERMISSIONS.md · 私有       critical/high 阻断
```

**7 份 Agent playbook**（`references/`）：`onchain-diligence` · `rwa-issuance` · `rwa-dividend` · `spawn-asset-skill` · `pharos-base-ops` · `pharos-deploy-runbook` · `pharos-verification`

**自动生成的合约能力面**（`npm run refs:generate`）：30 个可调用项（external/public 函数 + public getter）· 12 个 ERC-3643 对齐事件 · 5 个类型化错误 · 24 项 Foundry 测试（含 fuzz 不变量）。

---

## 合规是底座，不是附加项

合约采用 **ERC-3643（T-REX）** 风格。每笔转账在 `_update()` 钩子中强制经过三层闸门：

```
transfer / mint / forcedTransfer
        │
        ▼  _update() hook
   ┌──────────────┬──────────────────────┬─────────────────────┐
   │ 身份         │ 合规                 │ 冻结                │
   │ isVerified() │ canTransfer()        │ unfrozen ≥ amount   │
   │ KYC 持有人   │ 持有人/额度上限      │ 钱包未冻结          │
   └──────────────┴──────────────────────┴─────────────────────┘
        │ 全部通过 → 转账 + 自动派息结算
        │ 任一失败 → revert
```

- **transfer** → 三层全过
- **mint** → 身份 + 合规上限（一级发行同样受持有人/额度约束）
- **forcedTransfer** → 监管路径；仅需收款方已验证，绕过全局规则

### 发行前尽调闸门（Phase A）

任何 deploy/mint 之前，Agent 执行**只读、零 gas** 的 `cast` 检查。每条结论均有 evidence（命令、原始返回值、推断、flag），写入 `state.diligence`。**RED 评级将拒绝一切发行操作。**

| 检查项 | 命令 | RED 触发 |
|---|---|---|
| `denylist` | `state.config.denylist` 命中 | 命中 → **risk → RED** |
| `code_size` | `cast codesize <target>` | 合约已自毁（size==0）→ **RED** |
| `is_contract` | `cast code <target>` | 有字节码 → warn（复核） |
| `balance` / `tx_count` | `cast balance` · `cast nonce` | 零余额或零 nonce → warn |

完整 playbook：[`references/onchain-diligence.md`](./references/onchain-diligence.md)

### 四模块合一（未来可拆分）

函数与事件命名对齐 **ERC-3643（T-REX）**，便于日后拆分为标准多合约套件：

- **IdentityRegistry** — `isVerified` / `registerIdentity` / `removeIdentity`
- **ModularCompliance** — `canTransfer` / `maxHolders` / `maxBalancePerInvestor`
- **Lifecycle** — 冻结 / `forcedTransfer` / `recoveryAddress` / pause
- **Dividends** — `depositDividend` / `claimDividend` / `sweepUndistributedDividend`

**权限矩阵**：`onlyOwner`（治理、派息、dust 回收）vs `onlyAgent`（KYC、mint、冻结、监管路径）——详见 [`docs/SECURITY.md`](./docs/SECURITY.md)。

---

## 随使用而精炼的 Skill

多数发行工具只产出一支已部署代币。HatchFi 在代币之外，还为该资产产出一个**私有运营 Skill**——合约地址与命令集已写死。你用自然语言运营时，Skill 会保留可精炼的私有偏好（司法辖区、持有人上限、派息节奏、披露模板等）。

```
HatchFi（母 skill）
  └── 在 Atlantic 发行 MPF  ──spawn──►  skills/MPF-asset/   ◄── 先服务你
        └── 持续运营 ──refine──►  更贴合的 Skill（白名单 · mint · 派息）
                                      无需重新部署合约
```

spawn 流水线是确定性的，并带版本管理：

- **`spawn:asset`** 从 `state.asset` 填充模板——不靠 LLM 现编——重生前自动归档旧版本。
- **`refine:asset`** 从 `state.personalization` 写入私有 `PREFERENCES.md`，`meta.json` 版本号递增并记录 `evolution[]`。
- **`spawn:versions` / `spawn:rollback`** 列出并恢复 `versions/` 下的归档快照。

每个子 Skill 还附带自动生成的 `<SYMBOL>-contract-surface.md`，通过 `refs:generate` 与链上合约保持同步。

### 数据归你，分享由你决定

Skill 积累的一切——投资者身份、尽调证据、派息明细、你的偏好——**默认归你、默认私有**，存放在本地 `state.json`（gitignore），不上链、不打包进可分享包。

- **沉淀同意** —— 记录个人/敏感信息前，Agent 先征求同意。
- **开放同意** —— 对外开放 Skill 或数据范围前，输出**权限清单**（暴露 vs 保留）。见 [`PERMISSIONS.md`](./skills/MPF-asset/PERMISSIONS.md)。

> **分享 Skill ≠ 分享你的数据。** spawn 出的 Skill 只带公开操作面；主权账本（`state.json` 与 `PREFERENCES.md`）留在你的机器上。

发行 **MPF** 已产出 [`skills/MPF-asset/`](./skills/MPF-asset/SKILL.md)——带权限清单的私有运营 Skill。若发行人选择对外开放，包内仅含公开操作面（合约地址、命令、references），不含 owner 数据。

---

## 为 Agent 运营而设计

HatchFi 是 Pharos **Skill**，不是脚本。Agent 遵循 [`SKILL.md`](./SKILL.md) 的运营纪律：

- **尽调前置** —— RED 或检查未过则拒绝发行，并给出 evidence
- **风险分档** —— 低：自动 · 中：留痕 · 高：deploy/mint/派息前人工确认
- **同意闸** —— 沉淀个人数据或分享 Skill 前需显式同意（含权限清单）
- **Skill Inspector 门** —— 安装/上传/发布/分享前静态扫描；critical/high 阻断
- **Receipt 断言** —— 每笔写操作验证 `status==1` 才继续
- **审计记忆** —— `state.json` 记录尽调、准入、派息与历史——默认私有
- **私钥安全** —— 仅环境变量，绝不入库

---

## 验证记录

发布前，HatchFi 经过分层审查。发现的问题均以**具名回归测试**修复，或显式记录在案。

| 审查环节 | 结果 |
|---|---|
| **TDD 测试** | 24 项 Foundry 测试，0 失败；含派息不超发 fuzz 不变量（`claimable + dust ≤ deposit`） |
| **Skill eval** | `npm run eval:skill` —— 50/50 确定性检查（闸门 · 风险档 · 同意闸 · spawn 结构） |
| **安全审查**（[`docs/SECURITY.md`](./docs/SECURITY.md)） | 发现项已文档化；修复对应回归测试 |
| **合规审查** | 修复 mint 绕过持有人/额度上限的合规关键问题 |
| **生产就绪审查** | 见项目审查记录（validation 文档） |
| **Pharos Skill Inspector** | [`8/100 LOW`](./docs/SKILL_SECURITY_REPORT.md) —— 0 critical / 0 high / 0 medium blocker |
| **链上验证** | Atlantic **测试网**上 `preflight → deploy → smoke`，已执行的 receipt 均断言 `status == 1` |

代表性修复（均有测试覆盖）：

- **D2 · 合规关键** —— `mint` 现强制 `maxHolders` + `maxBalancePerInvestor`
- **F1 · burn 下溢** —— `burn` 重平衡 `_frozenTokens`，避免部分冻结账户锁死
- **D3 / D4 · 派息完整性** —— dust 可回收；钱包恢复迁移未领分红

---

## 链上验证

HatchFi **已部署在 Pharos Atlantic 测试网并通过 smoke 测试**，下方记录均可在 PharosScan 公开核验。

| | |
|---|---|
| **合约（MPF）** | [`0xfef7519bebda6c47af49583dbc9e60801f8aa3de`](https://atlantic.pharosscan.xyz/address/0xfef7519bebda6c47af49583dbc9e60801f8aa3de) |
| **Deploy tx** | [`0x71ebe5…17e4d`](https://atlantic.pharosscan.xyz/tx/0x71ebe568c6d41390cfc6b6f452c30c85d38d0b4ddead941d19383a7e39417e4d) |
| **Smoke mint tx** | [`0x7ece3b…b5541`](https://atlantic.pharosscan.xyz/tx/0x7ece3b86646685fbf9312bf91b68fc18ae694c3ccd50e8fdba148d6348bb5541) |
| **网络** | Pharos Atlantic 测试网 · chainId `688689` |
| **Spawned Skill** | [`skills/MPF-asset/SKILL.md`](./skills/MPF-asset/SKILL.md) —— 子 Skill，`TOKEN=0xfef7…` 已写死 |

Smoke 路径：若 deployer 已通过验证则跳过 `registerIdentity`；下方记录的是 **mint + receipt 断言** 的执行路径。

约 2 分钟可独立复现：`git clone` → `npm run build && npm run test`（24 passed）→ `npm run eval:skill`（50/50）→ 在 PharosScan（Atlantic 测试网）打开合约地址。

---

## 包含内容

- Atlantic 测试网上已部署的 ERC-3643 风格 RWA 合约，带可阻断发行的只读尽调闸门
- 扩展官方 Pharos Skill Engine 的完整 Agent Skill（`SKILL.md` + 7 份 references）
- 确定性 spawn → refine → version 流水线，为发行人留下可进化的私有运营 Skill
- 与 Solidity 源保持同步的自动生成合约能力面 reference
- 50 项 eval 套件与静态 Skill Inspector 安全门
- 24 项 Foundry 测试、已处理完毕的安全审查，以及默认私有 + opt-in 分享的数据主权设计

---

## 文档

| 文档 | 内容 |
|---|---|
| [`SKILL.md`](./SKILL.md) | Agent 入口：能力索引、预检、风险档 |
| [可视化看板](./SUBMISSION_DASHBOARD.html) | 比赛展示与验证证据（EN/中文切换） |
| [`docs/SUBMISSION.md`](./docs/SUBMISSION.md) | 提交概览与叙事 |
| [`references/spawn-asset-skill.md`](./references/spawn-asset-skill.md) | spawn / refine / version / auto-refs / eval playbook |
| [`eval/skill_behavior_cases.json`](./eval/skill_behavior_cases.json) | eval 用例定义 |
| [`docs/COMPLETED_VALIDATION.md`](./docs/COMPLETED_VALIDATION.md) | 本地 + 链上验证证据 |
| [`DEPLOYMENT_RESULT.md`](./DEPLOYMENT_RESULT.md) | 部署 + smoke 记录（自动生成） |
| [`docs/SECURITY.md`](./docs/SECURITY.md) | 审计发现与修复 |
| [`docs/SKILL_SECURITY_REPORT.md`](./docs/SKILL_SECURITY_REPORT.md) | Skill Inspector 报告 |
| [`docs/PHAROS_VISION.md`](./docs/PHAROS_VISION.md) | RealFi / Agentic 愿景对齐 |
| [`docs/BRAND.md`](./docs/BRAND.md) | HatchFi 品牌规范 |

## 仓库结构

```
SKILL.md                       Agent 入口：意图 → 能力 → 风险 → reference
src/CompliantRWAToken.sol      ERC-3643 风格 RWA 代币
test/CompliantRWAToken.t.sol   24 项测试（含 fuzz 不变量）
script/Deploy.s.sol            Foundry 部署脚本
references/                    7 份 cast/forge playbook
references/generated/          自动生成的合约能力面（refs:generate）
eval/skill_behavior_cases.json eval 用例定义
scripts/                       preflight / smoke / spawn / refine / refs / eval / inspector
scripts/skill_inspector.py     静态安全门
skills/MPF-asset/              已孵化的资产 Skill（SKILL · PERMISSIONS · PREFERENCES · meta · versions）
assets/                        品牌与网络配置
deployments/pharos.json        链上部署记录（生成）
state.schema.json              跨步骤状态记忆 schema
docs/                          叙事与参考文档（见上表）
SUBMISSION_DASHBOARD.html      可视化看板（比赛展示 + 验证证据）
```

---

<div align="center">

由 **陈知维（Zhiwei Chen）** 构建

Built for the Pharos Skill-to-Agent Hackathon 2026 on the Pharos RealFi chain.

[Pharos Skill Engine 手册](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide) · [Pharos 文档](https://docs.pharos.xyz)

</div>
