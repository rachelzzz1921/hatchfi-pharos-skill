# MPF contract surface (auto-generated)

> Token: `0xfef7519bebda6c47af49583dbc9e60801f8aa3de`
> Synced from `references/generated/contract-surface.md`.

> Source: `src/CompliantRWAToken.sol` — **do not edit by hand**.
> Regenerate: `npm run refs:generate`

Counts: 25 external/public functions · 12 events · 5 errors

## Function index (agent risk tiers)

| Function | Tier | Mutability | cast hint |
|---|---|---|---|
| `registerIdentity(address,uint16)` | 🟡 medium | write | `cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "registerIdentity(address,uint16)" <investor> <country> --rpc-url $RPC --private-key $PK` |
| `batchRegisterIdentity(address[],uint16[])` | 🟡 medium | write | `cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "batchRegisterIdentity(address[],uint16[])" "[<a1>]" "[<c1>]" --rpc-url $RPC --private-key $PK` |
| `removeIdentity(address)` | 🟡 medium | write | `cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "removeIdentity(address)" <investor> --rpc-url $RPC --private-key $PK` |
| `isVerified(address)` | 🟢 low | view | `cast call 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "isVerified(address)(bool)" <account> --rpc-url $RPC` |
| `investorCountry(address)` | 🟢 low | view | `cast call 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "investorCountry(address)(uint16)" <account> --rpc-url $RPC` |
| `setComplianceRules(uint256,uint256)` | 🟡 medium | write | `cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "setComplianceRules(uint256,uint256)" $MAX_HOLDERS $MAX_BALANCE --rpc-url $RPC --private-key $PK` |
| `canTransfer(address,address,uint256)` | 🟢 low | view | `cast call 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "canTransfer(address,address,uint256)(bool,string)" <from> <to> <amt> --rpc-url $RPC` |
| `setAddressFrozen(address,bool)` | 🟡 medium | write | `cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "setAddressFrozen(address,bool)" <account> true --rpc-url $RPC --private-key $PK` |
| `freezePartialTokens(address,uint256)` | 🟡 medium | write | `cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "freezePartialTokens(address,uint256)" <account> <amount> --rpc-url $RPC --private-key $PK` |
| `unfreezePartialTokens(address,uint256)` | 🟡 medium | write | `cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "unfreezePartialTokens(address,uint256)" <account> <amount> --rpc-url $RPC --private-key $PK` |
| `isFrozen(address)` | 🟢 low | view | `cast call 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "isFrozen(address)(bool)" <account> --rpc-url $RPC` |
| `frozenTokens(address)` | 🟢 low | view | `cast call 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "frozenTokens(address)(uint256)" <account> --rpc-url $RPC` |
| `mint(address,uint256)` | 🔴 high | write | `cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "mint(address,uint256)" <to> <amount> --rpc-url $RPC --private-key $PK` |
| `burn(address,uint256)` | 🔴 high | write | `cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "burn(address,uint256)" <from> <amount> --rpc-url $RPC --private-key $PK` |
| `forcedTransfer(address,address,uint256)` | 🔴 high | write | `cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "forcedTransfer(address,address,uint256)" <from> <to> <amount> --rpc-url $RPC --private-key $PK` |
| `recoveryAddress(address,address)` | 🔴 high | write | `cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "recoveryAddress(address,address)" <lost> <new> --rpc-url $RPC --private-key $PK` |
| `depositDividend()` | 🔴 high | payable | `cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "depositDividend()" --value <PHRS> --rpc-url $RPC --private-key $PK` |
| `sweepUndistributedDividend(address)` | 🔴 high | write | `cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "sweepUndistributedDividend(address)" <to> --rpc-url $RPC --private-key $PK` |
| `claimDividend()` | 🟢 low | write | `cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "claimDividend()" --rpc-url $RPC --private-key $PK` |
| `dividendOf(address)` | 🟢 low | view | `cast call 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "dividendOf(address)(uint256)" <holder> --rpc-url $RPC` |
| `addAgent(address)` | 🟡 medium | write | `cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "addAgent(address)" <agent> --rpc-url $RPC --private-key $PK` |
| `removeAgent(address)` | 🟡 medium | write | `cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "removeAgent(address)" <agent> --rpc-url $RPC --private-key $PK` |
| `isAgent(address)` | 🟢 low | view | `cast call 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "isAgent(address)(bool)" <account> --rpc-url $RPC` |
| `pause()` | 🟡 medium | write | `cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "pause()" --rpc-url $RPC --private-key $PK` |
| `unpause()` | 🟡 medium | write | `cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "unpause()" --rpc-url $RPC --private-key $PK` |

## Events (cast logs)

| Event | Params |
|---|---|
| `AgentAdded` | `address indexed agent` |
| `AgentRemoved` | `address indexed agent` |
| `IdentityRegistered` | `address indexed investor, uint16 country` |
| `IdentityRemoved` | `address indexed investor` |
| `AddressFrozen` | `address indexed userAddress, bool indexed isFrozen, address indexed owner` |
| `TokensFrozen` | `address indexed userAddress, uint256 amount` |
| `TokensUnfrozen` | `address indexed userAddress, uint256 amount` |
| `ComplianceRulesUpdated` | `uint256 maxHolders, uint256 maxBalancePerInvestor` |
| `RecoverySuccess` | `address indexed lostWallet, address indexed newWallet` |
| `DividendDeposited` | `uint256 amount, uint256 newCumulativePerShare` |
| `DividendClaimed` | `address indexed investor, uint256 amount` |
| `DividendDustSwept` | `address indexed to, uint256 amount` |

## Custom errors

| Error | Params |
|---|---|
| `NotAgent` | `` |
| `NotVerified` | `address account` |
| `WalletFrozen` | `address account` |
| `ComplianceFailure` | `string reason` |
| `InsufficientUnfrozen` | `uint256 available, uint256 required` |
