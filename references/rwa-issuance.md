# Reference: Compliant RWA issuance core (rwa-issuance)

> Contract source of truth: `assets/rwa/CompliantRWAToken.sol` (20 external functions / 12 events / 5 custom errors).
> Organized by **agent operation flows** (not function-by-function); each op has risk tier, `cast` commands, pre-checks, and post-tx assertions.
> Common: `$RPC=https://atlantic.dplabs-internal.com` (chainId 688689), `$PK=$PRIVATE_KEY` (env only — never commit).

---

## Three-tier risk framework

| Tier | Operations | Agent behavior |
|---|---|---|
| 🟢 Low | All views: isVerified / canTransfer pre-check / dividendOf / isFrozen / frozenTokens / holderCount / diligence | Fully automatic, no confirm |
| 🟡 Medium | registerIdentity / batchRegisterIdentity / setAddressFrozen / freezePartialTokens / unfreezePartialTokens / setComplianceRules / addAgent | Auto + write state.history |
| 🔴 High | deploy / mint / burn / forcedTransfer / recoveryAddress / depositDividend | Confirmation card first; execute after `confirm` |

---

## High-risk confirmation card (2-B — required before 🔴 ops)

```
⚠️ High-risk operation pending confirmation
Operation: <name>
Target: <target + key params>
Impact: <state change, mark irreversible>
Pre-checks: <itemized ✓/✗>
Next step: <what happens after confirm>
Reply "confirm" to proceed, "cancel" to abort
```

Execute only after `confirm`; then 2-C assertion and `history{action,risk:"high",confirmed_by_human:true,tx,at}`.

---

## Post-tx assertion (2-C — all writes)

After `cast send` returns txhash, **do not assume success**:
```bash
cast receipt <txhash> --rpc-url $RPC
```
Only if `status` = `1` → update state and continue; if `0` → stop and report.

---

## Flow 1: Issue an asset (deploy → whitelist → mint)

### 1. Deploy contract 🔴
Pre: diligence `state.diligence.passed == true` (else refuse — see onchain-diligence).
```bash
forge create assets/rwa/CompliantRWAToken.sol:CompliantRWAToken \
  --rpc-url $RPC --private-key $PK --broadcast \
  --constructor-args "<name>" "<symbol>" <maxHolders> <maxBalancePerInvestor>
```
Assert: capture `Deployed to` address → write `state.asset{address,deploy_tx,deployed_at,...}`.

### 2. Register compliant investors (whitelist) 🟡
```bash
cast send <token> "registerIdentity(address,uint16)" <investor> <country> \
  --rpc-url $RPC --private-key $PK
```
Batch:
```bash
cast send <token> "batchRegisterIdentity(address[],uint16[])" "[<a1>,<a2>]" "[<c1>,<c2>]" \
  --rpc-url $RPC --private-key $PK
```
After assert → write `state.whitelist[]`. Pre-verify (low risk, optional):
```bash
cast call <token> "isVerified(address)(bool)" <investor> --rpc-url $RPC
cast call <token> "investorCountry(address)(uint16)" <investor> --rpc-url $RPC
```
Remove whitelist 🟡:
```bash
cast send <token> "removeIdentity(address)" <investor> --rpc-url $RPC --private-key $PK
```

### 3. Mint shares 🔴
Pre: `isVerified(to)==true` (contract enforces; agent pre-checks to avoid wasted tx).
```bash
cast send <token> "mint(address,uint256)" <to> <amount> --rpc-url $RPC --private-key $PK
```
Confirmation card must state: total supply change, irreversible. Assert → history.

Burn shares 🔴 (regulatory / redemption — deduct from address):
```bash
cast send <token> "burn(address,uint256)" <from> <amount> --rpc-url $RPC --private-key $PK
```

---

## Flow 2: Transfers & compliance (two checks)

Standard `transfer` enforces `isVerified(to)` + `canTransfer` in-contract. Agent **pre-checks read-only** (🟢) before transfer:
```bash
cast call <token> "canTransfer(address,address,uint256)(bool,string)" <from> <to> <amt> --rpc-url $RPC
```
Returns `(false,"exceeds max holder count")` etc. → tell user, do not send tx.
Two checks: `isVerified` = recipient eligible; `canTransfer` = global rules (holder cap / per-investor limit). **Normal transfer** needs both; **mint** also enforces `canTransfer(0, to, amount)`; **forcedTransfer** is regulatory — only requires `to` isVerified, bypasses `canTransfer`.

---

## Flow 3: Asset lifecycle management

### Freeze entire wallet 🟡
```bash
cast send <token> "setAddressFrozen(address,bool)" <account> true --rpc-url $RPC --private-key $PK
```
Unfreeze: same with `false`. Frozen addresses cannot send or receive.

### Freeze / unfreeze partial balance 🟡
```bash
cast send <token> "freezePartialTokens(address,uint256)" <account> <amount> --rpc-url $RPC --private-key $PK
cast send <token> "unfreezePartialTokens(address,uint256)" <account> <amount> --rpc-url $RPC --private-key $PK
```
Partial freeze locks only that amount. Query:
```bash
cast call <token> "isFrozen(address)(bool)" <account> --rpc-url $RPC
cast call <token> "frozenTokens(address)(uint256)" <account> --rpc-url $RPC
```

### Forced transfer 🔴 (regulatory / legal)
```bash
cast send <token> "forcedTransfer(address,address,uint256)" <from> <to> <amount> --rpc-url $RPC --private-key $PK
```
Bypasses canTransfer; still requires `to` isVerified. Card must state: bypasses compliance rules, regulatory/legal use, irreversible.

### Wallet recovery 🔴 (investor lost key)
```bash
cast send <token> "recoveryAddress(address,address)" <lostWallet> <newWallet> --rpc-url $RPC --private-key $PK
```
Migrates balance (including frozen); new wallet inherits verification & country. Pre: `lostWallet` balance > 0.

### Adjust compliance rules 🟡
```bash
cast send <token> "setComplianceRules(uint256,uint256)" <maxHolders> <maxBalancePerInvestor> --rpc-url $RPC --private-key $PK
```
Pass `0` for unlimited on that dimension.

---

## Flow 5: Permissions & pause (owner/agent governance)

### Grant / revoke operator 🟡
```bash
cast send <token> "addAgent(address)" <agent> --rpc-url $RPC --private-key $PK     # owner only
cast send <token> "removeAgent(address)" <agent> --rpc-url $RPC --private-key $PK  # owner only
cast call <token> "isAgent(address)(bool)" <account> --rpc-url $RPC
```

### Global pause / unpause 🟡 (emergency circuit breaker)
```bash
cast send <token> "pause()" --rpc-url $RPC --private-key $PK
cast send <token> "unpause()" --rpc-url $RPC --private-key $PK
```
While paused, all transfers (including mint) blocked by `_update` hook.

---

## Command cheat sheet: params & effects

| Operation | Signature | Key params | Return / state change |
|---|---|---|---|
| registerIdentity | `registerIdentity(address,uint16)` | investor, country code | `_verified[investor]=true`, emit IdentityRegistered |
| mint | `mint(address,uint256)` | to (must isVerified), amount (wei) | totalSupply ↑, holderCount may ↑ |
| burn | `burn(address,uint256)` | from, amount | totalSupply ↓ |
| canTransfer | `canTransfer(address,address,uint256)(bool,string)` | from, to, amount | `(true,"")` or `(false,<reason>)` |
| setComplianceRules | `setComplianceRules(uint256,uint256)` | maxHolders, maxBalancePerInvestor (0=unlimited) | emit ComplianceRulesUpdated |
| forcedTransfer | `forcedTransfer(address,address,uint256)` | from, to (must isVerified), amount | balance moved, bypasses global rules |
| recoveryAddress | `recoveryAddress(address,address)` | lostWallet, newWallet | balance + verification migrated, emit RecoverySuccess |
| depositDividend | `depositDividend()` payable | `--value <PHRS>` | dividendPerShareCumulative ↑ |
| dividendOf | `dividendOf(address)(uint256)` | holder | claimable (incl. unsettled) |
| holderCount | `holderCount()(uint256)` | — | current holder count |

---

## Event queries (cast logs, 🟢 read-only, audit/reconciliation)

```bash
# Identity register / remove
cast logs --rpc-url $RPC --address <token> "IdentityRegistered(address,uint16)"
cast logs --rpc-url $RPC --address <token> "IdentityRemoved(address)"
# Freeze
cast logs --rpc-url $RPC --address <token> "AddressFrozen(address,bool,address)"
cast logs --rpc-url $RPC --address <token> "TokensFrozen(address,uint256)"
cast logs --rpc-url $RPC --address <token> "TokensUnfrozen(address,uint256)"
# Rules / recovery
cast logs --rpc-url $RPC --address <token> "ComplianceRulesUpdated(uint256,uint256)"
cast logs --rpc-url $RPC --address <token> "RecoverySuccess(address,address)"
# Dividends
cast logs --rpc-url $RPC --address <token> "DividendDeposited(uint256,uint256)"
cast logs --rpc-url $RPC --address <token> "DividendClaimed(address,uint256)"
cast logs --rpc-url $RPC --address <token> "DividendDustSwept(address,uint256)"
# Permissions
cast logs --rpc-url $RPC --address <token> "AgentAdded(address)"
cast logs --rpc-url $RPC --address <token> "AgentRemoved(address)"
```

> All 11 events named per ERC-3643 for future standardization and indexing.

---

## Flow 4: Dividends (RWA yield distribution)

### Deposit dividend 🔴
```bash
cast send <token> "depositDividend()" --value <PHRS> --rpc-url $RPC --private-key $PK
```
Card: deposit amount, per-share allocation at current supply, irreversible. Assert → `state.dividends[]`.

### Holder query / claim (🟢 query / self-claim)
```bash
cast call <token> "dividendOf(address)(uint256)" <holder> --rpc-url $RPC   # claimable incl. unsettled
cast send <token> "claimDividend()" --rpc-url $RPC --private-key $PK         # holder self-claim
```
Model: cumulative per-share `dividendPerShareCumulative` + per-address last claimed — no holder iteration, gas-safe.

---

## Error handling (from contract reverts)

| revert | Meaning | Agent response |
|---|---|---|
| `NotVerified(address)` | Recipient not KYC'd | Suggest registerIdentity first |
| `WalletFrozen(address)` | Wallet frozen | Inform frozen state |
| `ComplianceFailure(string)` | Global rule violation | Pass through reason, e.g. "exceeds max holder count" |
| `InsufficientUnfrozen(avail,req)` | Insufficient unfrozen balance | State available amount |
| `NotAgent()` | Caller lacks agent role | Needs owner/agent identity |
