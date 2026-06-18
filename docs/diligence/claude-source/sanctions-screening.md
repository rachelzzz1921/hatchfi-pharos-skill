# sanctions-screening.md

> HatchFi 尽调 reference · 制裁筛查层
> 层级：🔗 链上只读 + 📚 合规知识 ｜ 适用角色：全部（ISS/CUS/SUB/INV/INT）
> 原则锚定：命中=硬红线（risk→RED→passed=false）；名单陈旧=流程风险（warn）。零付费 API。

---

## 1 · trigger

在以下任一情况执行本层：
- 任何 `target_address` 进入尽调阶段 B（即 `onchain-diligence` 的 #1 / #11 被调用）。
- spawn 子 skill 写入资产专属规则前，对发行相关地址做一次终检。

本层**只读、自动**，符合「尽调全 🟢 只读，免 human confirm」风险档。

---

## 2 · 检查表

### 2.1 denylist 数据来源（无付费 API）

| 来源 | 内容 | 接法 |
|---|---|---|
| `0xB10C/ofac-sanctioned-digital-currency-addresses` | OFAC SDN 中提取的 ETH/USDT/TRX/SOL… 被制裁地址，每晚 0 UTC 自动更新，输出 TXT/JSON | 取 `lists` 分支的 ETH 列表灌入 `state.config.denylist[]` |
| 自定 denylist | 项目自有黑名单 | 合并进同一数组 |
| OFAC Sanctions List Search（人工复核用） | 把地址 hash 填 `ID #` 字段精确查询（不做模糊匹配） | 仅用于 YELLOW 复核，不进自动流程 |

> **采集脚本（一次性，离线刷新本地快照）**
> ```bash
> # 拉取并写入本地快照，记录日期
> curl -sL https://raw.githubusercontent.com/0xB10C/ofac-sanctioned-digital-currency-addresses/lists/sanctioned_addresses_ETH.json \
>   -o denylist_ofac_eth.json
> date -u +%Y-%m-%d > denylist_ofac_eth.snapshot
> ```
> 把结果 merge 进 `state.config.denylist[]`，并把日期写进 `state.diligence.list_snapshots.ofac_eth`。

### 2.2 比对算法（确定性）

```
normalize(addr) = lowercase(addr)            # EIP-55 大小写无关
matched = normalize(target) ∈ denylist_set    # 精确集合成员判定，O(1)
```

- **精确比对，不做模糊/前缀匹配**（与 OFAC 工具一致：ID# 字段无 fuzzy）。
- denylist 用 set 而非 list，避免 O(n) 与重复项。

### 2.3 名单时效（确定性的隐藏前提）

制裁名单**会增也会删**，本地快照若不刷新会悄悄破坏「确定性」：
- 2022-08-08：Tornado Cash 被加入 SDN（一批 ETH 地址）。
- 2025-03-21：Tornado Cash 又从 SDN 删除。

规则：
- `snapshot_date` 距今 > 30 天 → 追加一条流程 warn（`sanctions_list_stale`），不阻断但提示刷新。
- evidence 必须写明命中的是**哪个日期**的名单。

---

## 3 · evidence 示例

未命中（正常）：
```json
{
  "check": "sanctions_screen",
  "cmd": "set-membership(target, denylist_ofac_eth)",
  "list_snapshot": "2026-06-18",
  "result": { "matched": false, "list_size": 612 },
  "infer": "未出现在 2026-06-18 OFAC ETH 制裁快照中",
  "flag": "ok"
}
```

命中（硬红线）：
```json
{
  "check": "sanctions_screen",
  "cmd": "set-membership(target, denylist_ofac_eth)",
  "list_snapshot": "2026-06-18",
  "result": { "matched": true, "program": "CYBER2" },
  "infer": "target 命中 OFAC SDN 制裁地址",
  "flag": "risk"
}
```

名单陈旧（流程档）：
```json
{
  "check": "sanctions_list_stale",
  "cmd": "today - snapshot_date",
  "result": { "age_days": 47, "snapshot": "2026-05-02" },
  "infer": "本地制裁快照超过 30 天未刷新，命中判定可能漏掉新增地址",
  "flag": "warn"
}
```

---

## 4 · rating 衔接

交给现有纯函数，不改逻辑：
- `sanctions_screen.flag == risk` → 评级直接 🔴 RED → `passed=false` → 拒绝 mint / registerIdentity / forcedTransfer。
- `sanctions_list_stale.flag == warn` → 计入 warn 总数（≥2 warn 触发 🟡）。

本层是唯一**任何角色都可能产出 risk** 的检查；其余链上检查多为 warn。

---

## 5 · 输出样例（一次完整筛查）

```
[sanctions-screening] target=0xabc… role=SUB
  ├─ list_snapshot: 2026-06-18 (age 0d, fresh)
  ├─ set-membership: matched=false (list_size=612)
  └─ flag: ok
→ 本层无 risk、无 warn。移交 onchain-diligence 继续 #2–#10。
```

命中场景：
```
[sanctions-screening] target=0xdef… role=INV
  ├─ list_snapshot: 2026-06-18
  ├─ set-membership: matched=TRUE (program=RUSSIA-EO14024)
  └─ flag: RISK
→ 评级强制 RED。agent 拒绝 registerIdentity(0xdef…)。终止后续检查。
```

---

## 数据主权说明

- denylist 与 `list_snapshots` 是公开链下事实 → **无需 deposit consent**，spawn 子 skill 可继承。
- 命中所涉的具体制裁项目/个人细节若需记录，写入 `state.json` 私有段（`background`），spawn 不打包。
