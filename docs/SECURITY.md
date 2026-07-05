# 安全说明 — CompliantRWAToken

本文件总结 `src/CompliantRWAToken.sol`（同时随包提供 `assets/rwa/CompliantRWAToken.sol`）的安全姿态、威胁模型、一次内部审计的发现，以及每条的处置方式。下述所有修复均有 Foundry 测试覆盖（`forge test`：36 passed；0 failed，含一个 fuzz 不变量）。

## 设计姿态

- **合规优先的转账**：所有余额变动统一走 OpenZeppelin v5 的 `_update`。普通转账同时强制身份（`isVerified(to)`）与模块化合规（`maxHolders`、`maxBalancePerInvestor`）；mint 发行强制身份**与**同样的合规上限；burn 放行。
- **最小权限角色**：`onlyOwner` 管治理（合规规则、agent、派息、dust 回收）；`onlyAgent` 管运营动作（注册、冻结、mint、burn、强制转移、恢复、暂停）。
- **可审计**：12 个对齐 ERC-3643 的事件；链下 `state.json` 历史记录每个写操作的风险档与人确认标记。
- **私钥不入代码**：私钥仅来自环境变量；`.env`、`state.json`、`cache/`、`broadcast/`、`out/` 全部 git 忽略。

## 审计发现与处置

| 编号 | 标题 | 严重度 | 状态 |
|----|------|------|------|
| F1 | `burn` 未下调 `_frozenTokens`，可致 `frozenTokens > balance`，在 `_enforceTransfer` 触发下溢、锁死账户转账 | 中 | **已修** — `burn` 现把 `_frozenTokens[from]` 下调至销毁后余额，并对差额 emit `TokensUnfrozen`。回归测试 `test_BurnKeepsFrozenWithinBalance`。 |
| F6 | `executeRecoveryAddress` 覆盖 `_frozenTokens[newWallet]` 而非累加 | 低 | **已修** — 改为 `+=`。回归测试 `test_RecoveryAccumulatesFrozenOnExistingWallet`。 |
| F4 | 误转入（无 calldata）的原生 PHRS 可能被锁死（`receive()` 无记账） | 提示 | **已修** — 移除无 calldata 的 `receive()`；PHRS 只能经 payable 的 `depositDividend` 进入，无无记账入金。 |
| D1 | 尽调闸门永远到不了 RED（无检查产出 `risk`） | 设计缺陷 | **已修（规范）** — `references/onchain-diligence.md` 现定义确定性 `risk` 触发（命中 denylist；合约已自毁 `codesize==0`），并以 `state.config.denylist` 提供可执行的拒绝路径。 |
| D2 | mint 发行绕过合规上限 | 中（合规） | **已修** — `_update` 的 mint 分支现调用 `canTransfer(0, to, value)`，发行同样强制 `maxBalancePerInvestor` 与 `maxHolders`。测试 `test_MintEnforcesMaxBalancePerInvestor`、`test_MintEnforcesMaxHolderCount`。 |
| D3 | 派息整除留永久不可回收 dust | 低 | **已修** — 存入时余数记入 `undistributedDividend`，owner 可经 `sweepUndistributedDividend` 回收；`depositDividend` 在 `perShare==0` 时 revert `deposit too small for supply`。测试 `test_DividendDustSwept`、`test_DepositTooSmallReverts`。 |
| D4 | `executeRecoveryAddress` 未迁移未领分红 | 低 | **已修** — 已结算未领的 `withdrawableDividend` 迁移到新钱包。测试 `test_RecoveryMigratesPendingDividend`。 |
| F7 | 派息领取 / dust 回收的重入 | 提示 | **设计已防** — `claimDividend` 与 `sweepUndistributedDividend` 在外部 `.call{value:}` **之前**清零状态（检查-生效-交互），重入读到 0 即 revert。 |

## 有意保留 / 已记录的设计取舍

以下为刻意设计，已记录而非"缺陷"：

- **`forcedTransfer` 与 `executeRecoveryAddress` 在暂停态仍可执行**：刻意为之——监管/法律补救（法院令转移、丢私钥恢复）须在普通转账被暂停时仍可进行。二者仍要求 `onlyAgent` 且收款方已验证。
- **每账户结算的整除残值（每次派息 < 持有人数 wei）**：除存入时记入 `undistributedDividend` 的 dust 外，每账户结算时的 `floor()` 仍可能留亚 wei 残值。fuzz 不变量断言派息绝不超发（`可领 + dust ≤ 存入`）；残值在经济上可忽略，且以持有人数为上界。
- **被取消 KYC 的转出方**：`_enforceTransfer` 校验收款方；撤销转出方身份不会自动冻结其转出。对存量持有人的合规手段是 `setAddressFrozen` / `freezePartialTokens`——这是 ERC-3643 风格的控制面。

## 权限矩阵

| 动作 | 守卫 |
|------|------|
| setComplianceRules、addAgent/removeAgent、depositDividend、sweepUndistributedDividend | `onlyOwner` |
| registerIdentity、batchRegisterIdentity、removeIdentity、mint、burn、setAddressFrozen、freeze/unfreezePartialTokens、forcedTransfer、executeRecoveryAddress、pause/unpause | `onlyAgent` |
| transfer / transferFrom | `_update` 内身份 + 合规 + 冻结检查 |
| claimDividend | 仅调用者本人（结算并支付调用者） |
| view/getter、`dividendOf`、`canTransfer`、事件读取 | 无限制（只读） |

## 复现证据

```bash
forge build
forge test          # 36 passed; 0 failed
```

agent 侧的运营守卫（写操作预检、尽调闸门、按风险档的人确认）见 `SKILL.md` 与 `references/`。
