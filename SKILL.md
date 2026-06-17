# Compliant RWA Issuance Agent

> 一个面向 Pharos 的合规 RWA（现实世界资产）发行 skill：从发行前**尽调闸门**、到 ERC-3643 标准的**合规发行与生命周期管理**、到**收益派息**与**链上审计取证**，覆盖资产全流程。合规、尽调、审计是这个 agent 的硬能力底座。
>
> **落点是服务发行人自己**：发行完成后，agent 为该资产沉淀一个**私有运营 skill**，并在后续自然语言交互中持续精炼——越用越贴合该发行人的 RWA 需求。这个 skill 与其积累的数据**默认归发行人所有、默认私有**；是否对外开放、是否沉淀敏感信息，都由发行人**显式同意**决定（见「数据主权与同意闸」）。
>
> 执行底座：Foundry（`cast` / `forge`）。网络配置：`assets/networks.json`（默认 Atlantic 测试网）。
> 合约源真值：`assets/rwa/CompliantRWAToken.sol`。跨步骤状态：`state.json`（schema 见 `state.schema.json`，含 ownership / consent / personalization 段）。
> 本 skill **扩展 Pharos Skill Engine 规范**：保留 Engine 的 `assets/networks.json` 与写操作预检；RWA 专有操作见下方能力索引与 `references/rwa-*.md`。

---

## Prerequisites（执行前）

1. Foundry 已安装：`which cast && which forge`
2. 私钥仅环境变量：`export PRIVATE_KEY=0x...`（**禁止**硬编码或入库）
3. 网络变量（从 `assets/networks.json` 读取）：
   ```bash
   export RPC=https://atlantic.dplabs-internal.com
   export CHAIN_ID=688689
   export PK=$PRIVATE_KEY
   export DEPLOYER=$(cast wallet address --private-key $PK)
   ```
4. 通用 Pharos 查询/转账/部署语法：→ `references/pharos-base-ops.md`（对齐官方 Skill Engine 四层 reference）

> ⚠️ Foundry **不会**自动读取 `$PRIVATE_KEY`。每条 `cast` / `forge` 命令必须显式 `--private-key $PK`。

---

## Write Operation Pre-checks（写操作四步，不可跳过）

| Step | 命令 | 通过条件 |
|---|---|---|
| 1 私钥 | `cast wallet address --private-key $PK` | 输出合法地址 |
| 2 网络 | `cast chain-id --rpc-url $RPC` | 等于 `688689`（Atlantic） |
| 3 余额 | `cast balance $DEPLOYER --rpc-url $RPC --ether` | `> 0`，够付单笔 gas 即可（测试网最小余额即可部署/操作，不强制预留操作金额） |
| 4 尽调闸门 | 读 `state.json` → `diligence.passed` | 发行类 🔴 操作须 `true` 且非 RED |

> 余额例外：仅 `depositDividend` 需额外满足 `余额 ≥ 派息金额`（通过 `--value` 传入）。其余写操作（deploy / mint / burn / 注册 / 冻结等）只消耗 gas，测试网最小余额即可执行——**不要因为余额「不够大」而拒绝部署**。

通过后执行写命令；完成后 **必须** `cast receipt <txhash>` 断言 `status==1`。

---

## 流水线总览

```
┌─────────────┐      ┌──────────────────┐      ┌──────────────────────┐
│ ① 尽调闸门   │ pass │ ② 合规发行（主干）  │ done │ ③ 沉淀私有运营 skill   │
│ 只读风险画像 │─────▶│ deploy/mint/派息   │─────▶│ 服务自己 · 持续精炼     │
│ 🟢 不过则拦截 │ RED  │ 🔴🟡 分档+人确认    │      │ 默认私有 · 分享需 🔑同意 │
└─────────────┘ 拒绝 └──────────────────┘      └──────────────────────┘
       │                      │                          │
       └──── 全程读写 state.json（记忆 + 审计留痕 + 个性化偏好）──┘
                                                          │
                              个性化精炼循环 ◀─────────────┘
                       （NL 交互 → 偏好/模板沉淀 → 下次发行更贴合）
```

三段是一条流水线，也是一个完整 agent：准入（尽调）→ 执行（合规发行）→ **为发行人沉淀私有运营资产**。
产出的 skill 首先服务发行人自己；对外复用是发行人**显式、限定范围**的 opt-in，而非默认行为。

---

## 数据主权与同意闸（默认私有，分享/沉淀需显式同意）

发行人积累的数据是**发行人的**：尽调证据、投资者身份与持仓、派息历史、个性化偏好——这些是主权数据，**默认私有、默认不打包、不上链、gitignore**。产出的运营 skill 首先服务发行人自己。两道同意闸约束 agent：

- **🔑 沉淀同意（deposit）**：把**个人/敏感信息**写入 `state.json` 的 whitelist / personalization 等私有段前，先出同意卡片说明「将记录什么、用途、存放位置（仅本地）」，收到 `consent` 才写入。常规审计留痕（history / 风险档 / txhash）属合规义务，不需此闸。
- **🔑 开放同意（share）**：对外暴露任何 skill 或数据范围前——包括**生成可分享的子 skill（其中写入了资产合约地址）**、导出 profile、把 skill 交给他人/其他 agent——必须先输出**权限清单**：明确列出「**暴露什么**（如合约地址、操作命令）vs **保留什么**（投资者 PII、尽调证据、派息明细、偏好）」，收到 `consent` 才执行。未授权时，子 skill 与数据仅供发行人自己使用。

> 边界铁律：**分享一个子 skill ≠ 分享你的数据**。spawn 只带公开操作面，私有账本（`state.json`）永不复制进包，仅按路径在本地引用。

## 个性化精炼循环（让 skill 越用越贴合自己）

每次自然语言交互都是一次精炼机会：把发行人反复确认的偏好（常用司法辖区、默认持有人上限/持仓上限、派息节奏、披露模板、风险阈值）经**沉淀同意**后写入 `state.personalization`。下次发行/操作时 agent 先从 profile 预填、再与发行人确认差异——skill 随需求持续成长。偏好属主权数据，默认私有，分享需**开放同意**。

## Agent 工作纪律（每次操作前遵守）

1. **尽调前置**：对未尽调地址发行前，先跑尽调；`state.diligence.passed == false` 或评级 RED → 拒绝发行并说明依据。
2. **高风险人确认**：🔴 操作执行前必须输出「确认卡片」（操作/对象/影响/前置检查/下一步预告），收到 `confirm` 才执行。
3. **同意优先**：触发 🔑 沉淀 / 开放前，先出同意卡片（开放须附权限清单），收到 `consent` 才执行；记入 `state.consent`。默认私有——不确定时不沉淀、不分享。
4. **操作后断言**：每笔 `cast send` 后 `cast receipt` 验 `status==1` 才续作；失败即停、报告，不蒙头往下。
5. **全程留痕**：每个写操作回写 `state.json`（whitelist/dividends/history），高风险记 `confirmed_by_human`。
6. **私钥安全**：私钥仅走环境变量 `$PRIVATE_KEY`，每条命令显式 `--private-key $PK`；绝不写入文件或提交仓库。

---

## 能力索引（意图 → 能力 → 风险档 → reference）

### Pharos 基础操作（Skill Engine 对齐）
| 意图 | 能力 | 档 | reference |
|---|---|---|---|
| 查余额 / 查 token / 发 PHRS / 通用部署验证 | cast balance / cast call / cast send / forge verify | 🟢/🔴 | pharos-base-ops |

### 发行资产
| 意图 | 能力 | 档 | reference |
|---|---|---|---|
| 发行合规资产 | deploy + mint 流程 | 🔴 | rwa-issuance |
| 部署到 Pharos Atlantic | preflight + deploy + smoke | 🔴 | pharos-deploy-runbook |
| 增发份额 | mint | 🔴 | rwa-issuance |
| 销毁份额 | burn | 🔴 | rwa-issuance |

### 合规与准入
| 意图 | 能力 | 档 | reference |
|---|---|---|---|
| 发行前尽调 | onchain diligence | 🟢 | onchain-diligence |
| 核验持有资格 | isVerified | 🟢 | rwa-issuance |
| 注册合规投资者 | registerIdentity | 🟡 | rwa-issuance |
| 批量注册投资者 | batchRegisterIdentity | 🟡 | rwa-issuance |
| 移除投资者资格 | removeIdentity | 🟡 | rwa-issuance |
| 查投资者地区 | investorCountry | 🟢 | rwa-issuance |
| 预检转账合规 | canTransfer | 🟢 | rwa-issuance |
| 调整合规规则 | setComplianceRules | 🟡 | rwa-issuance |

### 收益分配
| 意图 | 能力 | 档 | reference |
|---|---|---|---|
| 派发收益 | depositDividend | 🔴 | rwa-dividend |
| 查询可领收益 | dividendOf | 🟢 | rwa-dividend |
| 领取收益 | claimDividend | 🟢 | rwa-dividend |

### 资产管理
| 意图 | 能力 | 档 | reference |
|---|---|---|---|
| 冻结钱包 | setAddressFrozen | 🟡 | rwa-issuance |
| 查钱包是否冻结 | isFrozen | 🟢 | rwa-issuance |
| 冻结部分份额 | freezePartialTokens | 🟡 | rwa-issuance |
| 解冻部分份额 | unfreezePartialTokens | 🟡 | rwa-issuance |
| 查冻结份额 | frozenTokens | 🟢 | rwa-issuance |
| 查当前持有人数 | holderCount | 🟢 | rwa-issuance |
| 强制划转 | forcedTransfer | 🔴 | rwa-issuance |
| 恢复丢失钱包 | recoveryAddress | 🔴 | rwa-issuance |
| 授予操作员权限 | addAgent | 🟡 | rwa-issuance |
| 撤销操作员权限 | removeAgent | 🟡 | rwa-issuance |
| 查操作员权限 | isAgent | 🟢 | rwa-issuance |
| 应急暂停/恢复 | pause / unpause | 🟡 | rwa-issuance |

### 审计与取证（合规硬能力）
| 意图 | 能力 | 档 | reference |
|---|---|---|---|
| 查询链上事件（对账/取证） | cast logs（12 事件） | 🟢 | rwa-issuance#事件查询 |
| 回收派息整除余数 dust | sweepUndistributedDividend | 🔴 | rwa-dividend |
| 提交前分阶段验证 | staged verification loop | 🟢 | pharos-verification |

### 沉淀与个性化（服务自己）
| 意图 | 能力 | 档 | reference |
|---|---|---|---|
| 为本资产沉淀私有运营 skill | spawn asset skill（默认私有 + 权限清单） | 🟢 | spawn-asset-skill |
| 把偏好/模板写入私有 profile | personalization 沉淀 | 🔑 沉淀 | spawn-asset-skill#personalization |
| 对外开放 skill / 数据范围 | export + 权限清单 | 🔑 开放 | spawn-asset-skill#sharing |

---

## 风险三档 + 同意闸

🟢 **低**（所有 view / 尽调 / 沉淀私有 skill）：全自动执行。
🟡 **中**（注册 / 冻结 / 规则调整 / 授权）：自动执行 + 回写 state.history 留痕。
🔴 **高**（deploy / mint / burn / 派息 / 强制划转 / 钱包恢复）：先出确认卡片，人 confirm 才执行。
🔑 **同意闸**（沉淀个人/敏感信息、对外开放 skill 或数据）：先出同意卡片（开放须附权限清单），人 consent 才执行；默认私有。
