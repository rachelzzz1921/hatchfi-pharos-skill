# onchain-diligence.md

> HatchFi 尽调 reference · 链上只读层（升级原有 5 项 → 11 项）
> 层级：🔗 cast 只读（假设 Pharos Atlantic 标准 EVM + 标准 cast 子命令可用）
> 原则锚定：评级是纯函数；只读自动跑、免 confirm；硬闸门不变。

---

## 1 · trigger

`target_address` 确定、需做只读体检时执行。先经 `sanctions-screening` 出 #1/#11，再跑本表 #2–#10。

设 `RPC=$PHAROS_RPC`（所有命令追加 `--rpc-url $RPC`）。

---

## 2 · 检查表

| # | check | cmd（cast） | flag 规则 | 可产 risk？ |
|---|---|---|---|---|
| 2 | is_contract | `cast code <a>` | `0x`→ok（EOA）；有 bytecode→**warn** | 否 |
| 3 | code_size | `cast codesize <a>` | 曾是合约但现 `0`（自毁）→**risk**；正常→ok | **是** |
| 4 | balance | `cast balance <a>` | `0`→**warn**；>0→ok | 否 |
| 5 | tx_count | `cast nonce <a>` | `0`→**warn**；>0→ok | 否 |
| 6 | account_age † | `cast logs`/explorer 取首笔区块时间戳 | `<7d`→**warn**；取数失败→**warn**(`age_unknown`) | 否 |
| 7 | counterparty_set † | `cast logs` 范围扫历史 from/to，与 denylist 交叉 | 交互过 denylist→**risk**；高度集中于极少对手→**warn** | **是** |
| 8 | contract_verified ‡ | explorer verified-source API（**Pharos 若无→降级 📋**） | 未验证源码→**warn** | 否 |
| 9 | privileged_powers | `cast call <a> "owner()(address)"` / `cast storage <a> <slot>` | 单 owner 可无限增发/提全/无时间锁→**warn**；多项叠加→**risk** | **是**(叠加) |
| 10 | proxy_upgradeable | `cast storage <a> 0x360894…bbc`（EIP-1967 impl slot） | 非零 impl 且无时间锁治理→**warn** | 否 |

**† 历史依赖检查的诚实边界**：纯 RPC 只给当前 nonce，**不给历史**。`account_age` 与 `counterparty_set` 需 explorer/indexer 或 `cast logs` 范围扫；若 Pharos 无 indexer，标 best-effort，evidence 写明取数方式（`source: "cast_logs_scan" | "explorer" | "unavailable"`），**不得伪装成完整链上验证**。取数失败时降级为 warn 而非静默 ok。

**‡ #8 默认锁为 📋**：见 `offchain-diligence.md`。Pharos 若提供 verified-source 端点，把本行改回 🔗 并在 evidence 写 `verified_by: "explorer"`。

**EIP-1967 槽位常量**（#10/可扩展）：
- implementation slot：`0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc`
- admin slot：`0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103`

---

## 3 · evidence 示例

```json
{ "check": "is_contract", "cmd": "cast code 0xabc…", "result": "0x60806040…", "infer": "目标是合约，非 EOA，需进一步看权限", "flag": "warn" }

{ "check": "code_size", "cmd": "cast codesize 0xabc…", "result": 0, "infer": "曾部署但当前 codesize=0，疑似自毁合约，不可追责", "flag": "risk" }

{ "check": "counterparty_set", "cmd": "cast logs --from-block X --to-block latest …", "source": "cast_logs_scan", "result": { "counterparties": 3, "denylist_hits": 1 }, "infer": "历史交互对象中 1 个命中 denylist", "flag": "risk" }

{ "check": "account_age", "cmd": "cast logs (first tx lookup)", "source": "unavailable", "result": null, "infer": "Pharos 无 indexer，首笔时间未取到，保守降级", "flag": "warn" }

{ "check": "privileged_powers", "cmd": "cast call 0xabc… \"owner()(address)\"", "result": { "owner": "0xEOA…", "timelock": false, "mint_unbounded": true }, "infer": "单 EOA owner + 无限增发 + 无时间锁，集权叠加", "flag": "risk" }
```

---

## 4 · rating 衔接

纯函数输入 = 本表 evidence[] ∪ 制裁层 evidence[]。可产 risk 的只有 **#3 自毁 / #7 denylist 交互 / #9 集权叠加**（外加制裁层 #1/#11）。其余仅 warn，靠组合达 🟡。逻辑不变：

```
any(flag==risk)            → 🔴 RED, passed=false
no risk & warn_count>=2     → 🟡 YELLOW, passed=true(+复核)
no risk & warn_count<=1     → 🟢 GREEN
```

---

## 5 · 输出样例

```
[onchain-diligence] target=0xabc… role=ISS
  ├─ is_contract     : bytecode present            → warn
  ├─ code_size       : 14820 bytes                 → ok
  ├─ balance         : 2.1 ETH                      → ok
  ├─ tx_count        : 318                          → ok
  ├─ account_age     : first tx 410d ago           → ok
  ├─ counterparty_set: 42 cp, 0 denylist hits       → ok
  ├─ contract_verified: verified_by=manual (📋)     → ok
  ├─ privileged_powers: multisig owner, timelock on → ok
  └─ proxy_upgradeable: impl set, timelock gov       → warn
→ risk=0, warn=2 → 🟡 YELLOW, passed=true, 建议人工复核 proxy 升级路径。
```
