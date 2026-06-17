# Reference: 资产专属 Skill 自我繁殖（spawn-asset-skill）

> **能力定位**：一支 RWA 资产发行完成后，agent 自动为它生成一个**完整的、可复用的专属 skill 包**——把通用能力里的占位符替换成这支资产的真实地址与参数，使其他 agent 拿到即可零改造操作该资产。
> **这是生态飞轮**：skill 产出 skill。每发行一支资产，生态里就多一个可复用能力单元。
> **风险档**：🟢 低风险（纯本地文件生成，不发链上交易，agent 自动执行）。

---

## 何时触发

`state.asset.address` 非空（资产已部署）且 `state.spawned_skill.generated != true` 时，发行流程末尾自动触发；或用户显式："为这支资产生成专属 skill"。

---

## 产出结构（3-A，全套繁殖 —— 尽调/发行/派息/生命周期全带上）

在 `skills/<symbol>-asset/` 下生成完整子 skill 包：

```
skills/<SYMBOL>-asset/
├── SKILL.md                      # 这支资产专属的能力索引（地址已写死）
└── references/
    ├── <symbol>-diligence.md     # 尽调（继承通用闸门，target 默认指向本资产相关方）
    ├── <symbol>-issuance.md      # 发行+生命周期（mint/冻结/强制转移/恢复，token 地址已填实）
    └── <symbol>-dividend.md      # 派息（depositDividend/claim/查询，地址已填实）
```

> 全套而非只含操作命令——拿到这个包的 agent，对这支资产的尽调、发行、派息、生命周期管理**全链路开箱即用**，无需再回母 skill。

---

## 生成方式（3-B，确定性模板填充，不靠 LLM 现编）

**不是**让模型"写一个 skill"，而是**母版 + state 数据替换占位符**，确定性、可复现、零幻觉：

母版来源：本 skill 的 `references/rwa-issuance.md`、`onchain-diligence.md`（作为模板）。
替换映射（从 `state.asset` 取真实值）：

| 占位符 | 替换为 | 来源 |
|---|---|---|
| `<token>` | 真实合约地址 | `state.asset.address` |
| `<SYMBOL>` / `<symbol>` | 代币符号 | `state.asset.symbol` |
| `<name>` | 资产名 | `state.asset.name` |
| `<maxHolders>` | 已设持有人上限 | `state.asset.max_holders` |
| `<maxBalancePerInvestor>` | 已设单人上限 | `state.asset.max_balance_per_investor` |
| `$RPC` | 保留（环境一致） | 固定 atlantic |

实现：纯字符串模板替换（agent 用 sed / 脚本即可），生成后**校验**——确认产出的 `.md` 里已无 `<token>` 等未替换占位符，再写状态。

生成完成后回写：
```json
"spawned_skill": { "generated": true, "path": "skills/MPF-asset/", "generated_at": "<ISO8601>" }
```

---

## 生成的子 SKILL.md 模板（地址已写死示例）

```markdown
# Skill: MPF 资产操作（Manhattan Property Fund）
> 合约：0xABC...（CompliantRWAToken，Pharos atlantic）
> 本 skill 由发行 agent 自动繁殖，针对该资产的尽调/发行/派息/生命周期开箱即用。

## 能力索引
| 用户意图 | 操作 | 风险档 | reference |
|---|---|---|---|
| 查某地址能否持有 | isVerified | 🟢 | references/MPF-issuance.md |
| 加白名单 | registerIdentity | 🟡 | references/MPF-issuance.md |
| 增发份额 | mint | 🔴 | references/MPF-issuance.md |
| 冻结/解冻 | setAddressFrozen | 🟡 | references/MPF-issuance.md |
| 派息 | depositDividend | 🔴 | references/MPF-dividend.md |
| 查/领分红 | dividendOf/claim | 🟢 | references/MPF-dividend.md |
| 发行前尽调 | onchain diligence | 🟢 | references/MPF-diligence.md |
（合约地址 0xABC... 已写死，无需再传 token 参数）
```

---

## 飞轮价值（3-C，低调版，写进母 SKILL.md 顶部一句）

> 母 SKILL.md 顶部功能描述里中性陈述即可，不谈设计哲学：
> "发行完成后自动产出该资产的可复用操作 skill，供其他 agent 直接调用。"

讲的是能力本身。其生态含义（每发行一支资产 → 生态多一个可复用能力单元）由评审自行体会，不自夸。
