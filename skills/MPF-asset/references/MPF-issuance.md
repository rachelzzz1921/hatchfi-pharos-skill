# MPF-bound reference

> Asset: `Manhattan Property Fund` (`MPF`)
> Token: `0xfef7519bebda6c47af49583dbc9e60801f8aa3de`
> This file was generated from `references/rwa-issuance.md`.

# Reference: 合规 RWA 发行主干（rwa-issuance）

> 合约源真值：`assets/rwa/CompliantRWAToken.sol`（20 外部函数 / 12 事件 / 5 自定义错误）。
> 本文按 **agent 操作流程** 组织（非按函数罗列），每个操作标风险档、给 cast 命令、给前置检查与操作后断言。
> 通用：`$RPC=https://atlantic.dplabs-internal.com`（chainId 688689），`$PK=$PRIVATE_KEY`（环境变量，绝不入库）。

---

## 操作风险三档（统一框架）

| 档 | 操作 | agent 行为 |
|---|---|---|
| 🟢 低 | 所有 view：isVerified / canTransfer 预检 / dividendOf / isFrozen / frozenTokens / holderCount / 尽调 | 全自动，无需确认 |
| 🟡 中 | registerIdentity / batchRegisterIdentity / setAddressFrozen / freezePartialTokens / unfreezePartialTokens / setComplianceRules / addAgent | 自动执行 + 回写 state.history（留痕） |
| 🔴 高 | deploy / mint / burn / forcedTransfer / recoveryAddress / depositDividend | 先出「确认卡片」，等人 confirm 才执行 |

---

## 高风险确认卡片（2-B，🔴 操作执行前必须先输出）

```
⚠️ 高风险操作待确认
操作：Manhattan Property Fund
对象：<target + 关键参数>
影响：<状态变化，标明不可逆>
前置检查：<逐项 ✓/✗>
下一步预告：<确认后流程的下一步>
确认回复 "confirm"，取消回复 "cancel"
```

收到 `confirm` 才执行；执行后按 2-C 断言，并写 `history{action,risk:"high",confirmed_by_human:true,tx,at}`。

---

## 操作后断言（2-C，所有写操作通用）

`cast send` 返回 txhash 后**不假设成功**：
```bash
cast receipt <txhash> --rpc-url $RPC
```
`status` = `1`（成功）才回写 state、进下一步；`0`（失败）则停下报告，不续作。

---

## 流程一：发行一支资产（deploy → 加白名单 → mint）

### 1. 部署合约 🔴
前置：尽调 `state.diligence.passed == true`（否则拒绝，见 onchain-diligence）。
```bash
forge create assets/rwa/CompliantRWAToken.sol:CompliantRWAToken \
  --rpc-url $RPC --private-key $PK --broadcast \
  --constructor-args "Manhattan Property Fund" "MPF" 100 1000000000000000000000000
```
断言：取 `Deployed to` 地址 → 写 `state.asset{address,deploy_tx,deployed_at,...}`。

### 2. 注册合规投资者（加白名单）🟡
```bash
cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "registerIdentity(address,uint16)" <investor> <country> \
  --rpc-url $RPC --private-key $PK
```
批量：
```bash
cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "batchRegisterIdentity(address[],uint16[])" "[<a1>,<a2>]" "[<c1>,<c2>]" \
  --rpc-url $RPC --private-key $PK
```
断言后写 `state.whitelist[]`。前置验证（低风险，可先查）：
```bash
cast call 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "isVerified(address)(bool)" <investor> --rpc-url $RPC
cast call 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "investorCountry(address)(uint16)" <investor> --rpc-url $RPC
```
移除白名单 🟡：
```bash
cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "removeIdentity(address)" <investor> --rpc-url $RPC --private-key $PK
```

### 3. 发行份额 mint 🔴
前置：`isVerified(to)==true`（合约会强制，agent 先查避免白跑）。
```bash
cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "mint(address,uint256)" <to> <amount> --rpc-url $RPC --private-key $PK
```
确认卡片影响项需写明：总供应量变化、不可逆。断言后写 history。

销毁份额 burn 🔴（监管/赎回场景，从指定地址扣减）：
```bash
cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "burn(address,uint256)" <from> <amount> --rpc-url $RPC --private-key $PK
```

---

## 流程二：转账与合规（受限转账的两道检查）

普通转账走标准 `transfer`，合约内部强制 `isVerified(to)` + `canTransfer`。agent 转账前**先做只读预检**（🟢），把可能的失败提前告诉用户：
```bash
cast call 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "canTransfer(address,address,uint256)(bool,string)" <from> <to> <amt> --rpc-url $RPC
```
返回 `(false,"exceeds max holder count")` 之类 → 直接告知用户原因，不发交易。
两道检查口径：`isVerified` 看收款方够不够格持有；`canTransfer` 看全局规则（持有人上限 / 单人额度）。mint 与 forcedTransfer 仅需 isVerified，绕过 canTransfer。

---

## 流程三：资产生命周期管理

### 冻结整个钱包 🟡
```bash
cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "setAddressFrozen(address,bool)" <account> true --rpc-url $RPC --private-key $PK
```
解冻同命令传 `false`。冻结后该地址不能转入/转出。

### 冻结/解冻部分份额 🟡
```bash
cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "freezePartialTokens(address,uint256)" <account> <amount> --rpc-url $RPC --private-key $PK
cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "unfreezePartialTokens(address,uint256)" <account> <amount> --rpc-url $RPC --private-key $PK
```
冻结部分份额只锁定该数量，剩余可正常转移。查询：
```bash
cast call 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "isFrozen(address)(bool)" <account> --rpc-url $RPC
cast call 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "frozenTokens(address)(uint256)" <account> --rpc-url $RPC
```

### 强制转移 🔴（监管/法律场景）
```bash
cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "forcedTransfer(address,address,uint256)" <from> <to> <amount> --rpc-url $RPC --private-key $PK
```
绕过 canTransfer 全局规则，仍要求 `to` 已 `isVerified`。确认卡片须写明「绕过合规规则、用于监管/法律场景、不可逆」。

### 钱包恢复 🔴（投资者丢私钥）
```bash
cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "recoveryAddress(address,address)" <lostWallet> <newWallet> --rpc-url $RPC --private-key $PK
```
迁移余额（含冻结部分），新钱包自动继承验证状态与地区。前置：`lostWallet` 余额 > 0。

### 合规规则调整 🟡
```bash
cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "setComplianceRules(uint256,uint256)" 100 1000000000000000000000000 --rpc-url $RPC --private-key $PK
```
传 `0` 表示该项不限制。

---

## 流程五：权限与暂停（owner/agent 治理）

### 授予/撤销操作员 🟡
```bash
cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "addAgent(address)" <agent> --rpc-url $RPC --private-key $PK     # owner only
cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "removeAgent(address)" <agent> --rpc-url $RPC --private-key $PK  # owner only
cast call 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "isAgent(address)(bool)" <account> --rpc-url $RPC
```

### 全局暂停/恢复 🟡（应急熔断，agent 可调）
```bash
cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "pause()" --rpc-url $RPC --private-key $PK
cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "unpause()" --rpc-url $RPC --private-key $PK
```
暂停期间所有转账（含 mint）被 `_update` 钩子拦截。

---

## 命令速查：参数与输出

| 操作 | 签名 | 关键参数 | 返回 / 状态变化 |
|---|---|---|---|
| registerIdentity | `registerIdentity(address,uint16)` | investor 地址、country 地区码 | `_verified[investor]=true`，emit IdentityRegistered |
| mint | `mint(address,uint256)` | to（须 isVerified）、amount（wei） | totalSupply 增加，holderCount 可能 +1 |
| burn | `burn(address,uint256)` | from、amount | totalSupply 减少 |
| canTransfer | `canTransfer(address,address,uint256)(bool,string)` | from、to、amount | `(true,"")` 或 `(false,<reason>)` |
| setComplianceRules | `setComplianceRules(uint256,uint256)` | maxHolders、maxBalancePerInvestor（0=不限） | emit ComplianceRulesUpdated |
| forcedTransfer | `forcedTransfer(address,address,uint256)` | from、to（须 isVerified）、amount | 余额迁移，绕过全局规则 |
| recoveryAddress | `recoveryAddress(address,address)` | lostWallet、newWallet | 余额+验证状态迁移，emit RecoverySuccess |
| depositDividend | `depositDividend()` payable | `--value <PHRS>` | dividendPerShareCumulative 增加 |
| dividendOf | `dividendOf(address)(uint256)` | holder | 可领金额（含未结算） |
| holderCount | `holderCount()(uint256)` | — | 当前持有人数 |

---

## 事件查询（cast logs，🟢 只读，审计/对账用）

合约对每次状态变更都 emit 事件，agent 可用 `cast logs` 取证回写 `state.history`：

```bash
# 身份注册 / 移除
cast logs --rpc-url $RPC --address 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "IdentityRegistered(address,uint16)"
cast logs --rpc-url $RPC --address 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "IdentityRemoved(address)"
# 冻结相关
cast logs --rpc-url $RPC --address 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "AddressFrozen(address,bool,address)"
cast logs --rpc-url $RPC --address 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "TokensFrozen(address,uint256)"
cast logs --rpc-url $RPC --address 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "TokensUnfrozen(address,uint256)"
# 合规规则 / 恢复
cast logs --rpc-url $RPC --address 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "ComplianceRulesUpdated(uint256,uint256)"
cast logs --rpc-url $RPC --address 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "RecoverySuccess(address,address)"
# 派息
cast logs --rpc-url $RPC --address 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "DividendDeposited(uint256,uint256)"
cast logs --rpc-url $RPC --address 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "DividendClaimed(address,uint256)"
cast logs --rpc-url $RPC --address 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "DividendDustSwept(address,uint256)"
# 权限
cast logs --rpc-url $RPC --address 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "AgentAdded(address)"
cast logs --rpc-url $RPC --address 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "AgentRemoved(address)"
```

> 11 个事件全部命名对齐 ERC-3643，便于未来标准化与第三方索引。

---

## 流程四：派息（RWA 收益分配）

### 存入分红 🔴
```bash
cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "depositDividend()" --value <PHRS> --rpc-url $RPC --private-key $PK
```
确认卡片影响项：存入金额、按当前总供应摊到每股、不可逆。断言后写 `state.dividends[]`。

### 持有人查询/领取（🟢 查 / 用户自领）
```bash
cast call 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "dividendOf(address)(uint256)" <holder> --rpc-url $RPC   # 查可领（含未结算）
cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "claimDividend()" --rpc-url $RPC --private-key $PK         # 持有人自领
```
派息模型：累计每股 `dividendPerShareCumulative` + 各地址 last claimed，无需遍历持有人，gas 安全。

---

## 错误处理表（从合约 revert 抽取，agent 据此向用户解释）

| revert | 含义 | agent 应对 |
|---|---|---|
| `NotVerified(address)` | 收款方未通过 KYC | 提示先 registerIdentity |
| `WalletFrozen(address)` | 钱包被冻结 | 提示该地址处冻结态 |
| `ComplianceFailure(string)` | 违反全局规则（含原因串） | 透传 reason，如"exceeds max holder count" |
| `InsufficientUnfrozen(avail,req)` | 可用余额不足（扣除冻结） | 告知可用额度 |
| `NotAgent()` | 调用者无 agent 权限 | 提示需 owner/agent 身份 |
