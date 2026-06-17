# Reference: 链上尽调闸门（onchain-diligence）

> **能力定位**：发行任何 RWA 资产前，对目标地址（托管方 / 发行方 / 大额认购方）做**只读、零 gas** 的链上尽调，产出红黄绿风险画像。**结论必须可验证**——每一条都追溯到具体 cast 命令与返回值。
> **风险档**：🟢 低风险（纯只读，agent 全自动执行，无需人确认）。
> **闸门作用**：评级为 RED 时，agent 必须拒绝后续一切发行操作（写入 `state.diligence.passed = false`）。

---

## 何时触发

用户意图含："先查一下这个地址""这个托管方靠谱吗""发行前尽调""能不能把代币发给它"——在执行 `mint` / `registerIdentity` 给某地址前，**强制**先跑本尽调。

---

## 检查项与命令（全部只读，target = 被尽调地址，RPC 用 pharos_atlantic）

每项检查产出确定性 `flag ∈ {ok, warn, risk}`。**risk 是闸门的硬否决信号**，下表的 risk 条件让「RED → 拒绝发行」真正可达，而非装饰。

| check | cast 命令 | 含义 | flag 判定（确定性） |
|---|---|---|---|
| `denylist` | 比对 `state.config.denylist[]`（发行方维护的黑名单/制裁名单） | target 是否在禁投名单 | 命中 → **risk**；未命中 → ok |
| `is_contract` | `cast code <target> --rpc-url $RPC` | 是 EOA 还是合约 | `0x`（EOA）→ ok；有字节码（合约）→ warn（投资者通常应为受 KYC 的 EOA，向不透明合约发行需复核） |
| `code_size` | `cast codesize <target> --rpc-url $RPC` | 合约字节码大小 | 非合约 → ok；合约且 `> 0` → warn；**合约但 codesize `== 0`（已自毁/代码消失）→ risk** |
| `balance` | `cast balance <target> --rpc-url $RPC` | 原生 PHRS 余额 | `> 0` → ok；`== 0` → warn（空地址，无 gas 付能力） |
| `tx_count` | `cast nonce <target> --rpc-url $RPC` | 发起过的交易数（活跃度） | `> 0` → ok；`== 0` → warn（全新地址，无历史） |

> 命令以 Foundry `cast` 为准。`$RPC` = `https://atlantic.dplabs-internal.com`（Pharos atlantic 测试网，chainId 688689）。
> 链上检查全部为 `view`/只读 RPC 调用，**不发交易、不花 gas、零风险**；`denylist` 为本地名单比对——故整体归为 🟢 低风险，agent 自动执行。
>
> **risk 触发条件汇总（任一命中即 RED，闸门关闭）**：
> 1. `denylist` 命中发行方黑名单/制裁名单；
> 2. target 是合约但 `codesize == 0`（曾部署、现已自毁，代码不可信）。
>
> 发行方可在 `state.config.denylist` 维护需禁投的地址，使「合规前置」具备可执行的拒绝路径。

---

## evidence 结构（写入 state.diligence.evidence，可验证）

每个检查项产出一条 evidence，结构固定：

```json
{
  "check": "is_contract",
  "cmd": "cast code 0xABC... --rpc-url $RPC",
  "result": "0x",
  "infer": "目标为 EOA（外部账户），非合约",
  "flag": "ok"
}
```

`flag` 取值：`ok`（正常） / `warn`（需注意） / `risk`（高风险）。

---

## 评级规则（写死，不靠 agent 主观判断 —— 规则确定性、可复现）

按所有 evidence 的 flag 统计，规则如下，**确定性、可复现**：

- **🔴 RED**：任意一项 flag = `risk`。→ `passed = false`，**闸门关闭**，拒绝发行。
- **🟡 YELLOW**：无 risk，但 ≥ 2 项 flag = `warn`。→ `passed = true` 但提示风险，建议人工复核。
- **🟢 GREEN**：无 risk，且 warn ≤ 1 项。→ `passed = true`，可进入发行。

> 评级是 evidence 的纯函数：`rating = f(evidence[].flag)`。agent 不"感觉"，只套规则。任何人拿同样的链上数据，得出的评级必然一致——这是它可信的根本。

---

## 闸门强约束（1-C）

尽调完成后，agent 把结果写入 `state.json`：
```json
"diligence": { "target": "0x...", "rating": "GREEN", "passed": true, "evidence": [...] }
```

后续任何发行类操作（mint / registerIdentity 给该 target / forcedTransfer 到该 target）执行前，agent **必须**读 `state.diligence`：
- `passed == false` 或 `rating == "RED"` → **拒绝执行**，回复："目标地址未通过尽调（评级 RED），按合规前置原则，不能发行。依据：<列出 risk 项 evidence>。"
- `rating == "YELLOW"` → 执行前额外提示风险，建议人工复核。
- `rating == "GREEN"` → 正常进入发行流程。

这把"合规前置"从一句口号，变成 agent 行为里**绕不过去的代码级闸门**。

---

## 输出给用户的格式（带依据，可验证）

```
尽调结果：🟡 YELLOW（passed，建议复核）
目标：0xABC...

依据：
  ✓ [ok]   是否合约：cast code → 0x，确认为 EOA
  ⚠ [warn] 活跃度：  cast nonce → 0，全新地址，无历史
  ⚠ [warn] 余额：    cast balance → 0 PHRS，无 gas 付能力
  
评级逻辑：无 risk 项 + 2 项 warn → YELLOW
建议：可发行，但目标为无历史新地址，建议确认其真实身份后再加白名单。
```

RED（闸门关闭，拒绝发行）示例：

```
尽调结果：🔴 RED（NOT passed，拒绝发行）
目标：0xBAD...

依据：
  ✗ [risk] 黑名单：  命中 state.config.denylist（发行方禁投名单）
  ✓ [ok]   是否合约：cast code → 0x，确认为 EOA

评级逻辑：存在 1 项 risk → RED
处置：写入 state.diligence.passed=false；按合规前置原则，拒绝对该地址的一切发行操作。
```
