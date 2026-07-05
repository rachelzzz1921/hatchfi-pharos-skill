# Reference: RWA 收益派息（rwa-dividend）

> 合约源真值：`assets/rwa/CompliantRWAToken.sol`。`$RPC=https://atlantic.dplabs-internal.com`，`$PK=$PRIVATE_KEY`。
> 派息模型：累计每股 `dividendPerShareCumulative`（1e18 精度）+ 各地址 last-claimed 游标，**无需遍历持有人**，gas 安全；存入/领取均为原生 PHRS。

---

## 派发收益 🔴（发行方存入分红）

前置：`state.asset.address` 非空；`totalSupply > 0`。
确认卡片影响项须写明：存入金额、按当前总供应摊到每股、**不可逆**。

```bash
cast send <token> "depositDividend()" --value <PHRS_amount> --rpc-url $RPC --private-key $PK
```
断言：`cast receipt <txhash>` 验 `status==1` → 写 `state.dividends[]{amount,tx,at}` + `history{action:"depositDividend",risk:"high",confirmed_by_human:true,tx,at}`。

> 原理：存入时 `dividendPerShareCumulative += value*1e18/totalSupply`。此后每个持有人按其持仓比例分得，转账时自动结算双方应得（合约 `_settleDividend`）。

---

## 查询可领收益 🟢（只读，含未结算部分）

```bash
cast call <token> "dividendOf(address)(uint256)" <holder> --rpc-url $RPC
```
返回值 = 已结算 `withdrawableDividend` + 未结算（持仓 × 累计每股增量）。agent 直接展示，无需发交易。

---

## 领取收益 🟢（持有人自领）

```bash
cast send <token> "claimDividend()" --rpc-url $RPC --private-key $PK
```
合约先结算再转出 PHRS；无可领时 revert `nothing to claim`。归 🟢：调用者动用自己的资金、动作可预期、无对他人影响。
断言后可写 history（可选，领取为用户自身操作）。

---

## 回收派息整除余数 dust 🔴（仅 owner）

派息按每股整除分配，`value*1e18/totalSupply` 的余数（dust）无法被持有人按每股领取。合约把这部分单独记入 `undistributedDividend`，owner 可回收，避免少量 PHRS 永久锁死。

```bash
# 先查 dust 余额（只读）
cast call <token> "undistributedDividend()(uint256)" --rpc-url $RPC
# 回收到指定地址（owner，🔴 需确认卡片）
cast send <token> "sweepUndistributedDividend(address)" <to> --rpc-url $RPC --private-key $PK
```
断言 `status==1` 后写 `history{action:"sweepUndistributedDividend",risk:"high",confirmed_by_human:true,tx,at}`，并可用 `cast logs ... "DividendDustSwept(address,uint256)"` 取证。

> 另：`depositDividend` 现要求 `perShare>0`（即存入额相对总供应不能太小），否则 revert `deposit too small for supply`，避免整笔被静默当作 dust。
> 钱包恢复（`executeRecoveryAddress`）会把旧钱包**已结算未领**的分红一并迁移到新钱包，丢私钥不丢收益。

---

## 错误处理

| revert | 含义 | agent 应对 |
|---|---|---|
| `no supply` | 总供应为 0，无法派息 | 提示先 mint 份额 |
| `no value` | 未附带 PHRS | 提示 `--value` 必填 |
| `deposit too small for supply` | 存入额相对总供应过小，每股为 0 | 提示加大存入额或减少供应 |
| `nothing to claim` | 当前无可领分红 | 告知余额为 0 |
| `nothing to sweep` | 无可回收 dust | 告知 `undistributedDividend` 为 0 |
| `transfer failed` / `sweep failed` | PHRS 转出失败 | 提示检查合约 PHRS 余额/接收方 |
