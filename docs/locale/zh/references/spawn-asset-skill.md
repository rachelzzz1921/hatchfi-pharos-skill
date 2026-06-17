# Reference: 资产专属 Skill 沉淀（spawn-asset-skill）

> **能力定位**：一支 RWA 资产发行完成后，agent 自动为它沉淀一个**完整的私有运营 skill 包**——把通用能力里的占位符替换成这支资产的真实地址与参数。**首先服务发行人自己**：发行人后续用自然语言运营这支资产时，这个 skill 持续精炼、越来越贴合其需求。
> **默认私有**：生成的包默认仅供发行人自用（`sharing=private`），并附一份**权限清单 `PERMISSIONS.md`**。对外开放是发行人**显式、限定范围**的 opt-in（见下方 Sharing）。
> **数据边界**：spawn 只带公开操作面（合约地址 + 命令）。发行人的主权账本（`state.json`：投资者 PII、尽调证据、派息明细、偏好）**永不复制进包**，仅按路径在本地引用。
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
├── PERMISSIONS.md                # 权限清单：暴露面（地址+命令）vs 保留的私有数据
└── references/
    ├── <symbol>-diligence.md     # 尽调（继承通用闸门，target 默认指向本资产相关方）
    ├── <symbol>-issuance.md      # 发行+生命周期（mint/冻结/强制转移/恢复，token 地址已填实）
    └── <symbol>-dividend.md      # 派息（depositDividend/claim/查询，地址已填实）
```

> 全套而非只含操作命令——发行人（或其授权的 agent）对这支资产的尽调、发行、派息、生命周期管理**全链路开箱即用**，无需再回母 skill。`PERMISSIONS.md` 只列**公开操作面**；私有账本不在包内。

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

生成完成后回写（默认私有 + 记录"待开放"的同意项）：
```json
"spawned_skill": {
  "generated": true,
  "path": "skills/MPF-asset/",
  "generated_at": "<ISO8601>",
  "sharing": "private",
  "permission_manifest": "skills/MPF-asset/PERMISSIONS.md"
},
"consent": {
  "shares": [
    { "artifact": "skills/MPF-asset/", "granted": false,
      "exposed": ["contract_address", "operation_commands", "public_compliance_constants"],
      "withheld": ["investor_pii", "diligence_evidence", "dividend_detail", "personalization"],
      "at": "<ISO8601>" }
  ]
}
```
`npm run spawn:asset`（`scripts/spawn_asset_skill.py`）已自动完成上述生成与回写。

---

## 进化（spawn → refine → rollback）

借鉴 dot-skill 的 `version_manager` 思路，spawn 不再是「一次性生成」：

| 命令 | 作用 |
|---|---|
| `npm run spawn:asset` | 全量确定性重生（母版模板替换）；若目录已存在，先归档到 `versions/` |
| `npm run refine:asset` | **增量精炼**：从 `state.personalization` 写入 `PREFERENCES.md`，不重新部署合约 |
| `npm run spawn:versions` | 列出 `skills/<SYMBOL>-asset/versions/` 归档 |
| `npm run spawn:rollback <id>` | 回滚到指定归档（回滚前也会再归档当前态） |

产物新增：
- `PREFERENCES.md` — 发行人私有偏好 overlay（分享 skill 时不打包，见 `PERMISSIONS.md` withheld）
- `meta.json` — `version` + `evolution[]` 审计轨迹

`state.spawned_skill.version` 与 `meta.json` 同步；重复 `spawn:asset` 不再重复追加 `consent.shares`（改为 upsert）。

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

## Personalization（个性化精炼，服务自己）

落点是**为发行人自己服务**：每次自然语言交互都可能精炼这支资产的运营方式。把发行人反复确认的偏好——常用司法辖区、默认持有人上限/单人持仓上限、派息节奏、披露模板、自定义风险阈值——经 **🔑 沉淀同意**后写入 `state.personalization`：

```json
"personalization": {
  "preferences": {
    "jurisdictions": [840, 344],
    "default_max_holders": 100,
    "default_max_balance_per_investor": "1000000000000000000000000",
    "dividend_cadence": "quarterly",
    "disclosure_template": "reg-d-506c"
  },
  "refined_at": "<ISO8601>",
  "refine_log": [
    { "change": "set dividend_cadence=quarterly", "from_interaction": "用户在第3次派息时确认按季度", "consented": true, "at": "<ISO8601>" }
  ]
}
```

下次发行/操作时，agent **先从 profile 预填、再与发行人确认差异**，而不是每次从零问起——skill 随需求持续成长。偏好属主权数据，默认私有；写入前出沉淀同意卡片说明"记录什么、用途、仅存本地"。

## Sharing（开放与权限清单，默认私有）

子 skill **默认 `sharing=private`**，仅供发行人自用。要把它（或任何数据范围）交给他人/其他 agent 前，必须走 **🔑 开放同意**：

1. 读 `PERMISSIONS.md`，向发行人展示**权限清单**——明确"暴露什么 vs 保留什么"：
   - **暴露**：合约地址、操作命令、公开合规常量（MAX_HOLDERS 等）。
   - **保留**：投资者 PII、尽调证据、派息明细、个性化偏好（这些只在 `state.json` 本地）。
2. 出同意卡片（操作=对外开放 / 对象=该 skill / 暴露面 / 保留面 / 接收方），收到 `consent` 才执行。
3. 回写 `state.consent.shares`：把对应记录的 `granted` 置 `true`，并记 `recipient` 与时间；`state.spawned_skill.sharing` 置 `shared`。

> **铁律：分享 skill ≠ 分享数据。** 即便开放，离开本机的也只有 `PERMISSIONS.md` 列出的公开操作面；`state.json` 永不随包外发。未获同意时，一律按默认私有处理。
