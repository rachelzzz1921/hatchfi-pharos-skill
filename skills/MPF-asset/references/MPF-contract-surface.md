# MPF contract surface (auto-generated)

> Token: `0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3`
> Synced from `references/generated/contract-surface.md`.

> Source: `src/CompliantRWAToken.sol` — **do not edit by hand**.
> Regenerate: `npm run refs:generate`

Counts: 44 external/public functions · 18 events · 14 errors

## Function index (agent risk tiers)

| Function | Tier | Mutability | cast hint |
|---|---|---|---|
| `registerIdentity(address,uint16,bytes32)` | 🟡 medium | write | `cast send 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "registerIdentity(address,uint16,bytes32)" <investor> <country> <identityId> --rpc-url $RPC --private-key $PK` |
| `batchRegisterIdentity(address[],uint16[],bytes32[])` | 🟡 medium | write | `cast send 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "batchRegisterIdentity(address[],uint16[],bytes32[])" "[<a1>]" "[<c1>]" "[<id1>]" --rpc-url $RPC --private-key $PK` |
| `removeIdentity(address)` | 🟡 medium | write | `cast send 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "removeIdentity(address)" <investor> --rpc-url $RPC --private-key $PK` |
| `isVerified(address)` | 🟢 low | view | `cast call 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "isVerified(address)(bool)" <account> --rpc-url $RPC` |
| `investorCountry(address)` | 🟢 low | view | `cast call 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "investorCountry(address)(uint16)" <account> --rpc-url $RPC` |
| `investorIdentity(address)` | 🟢 low | view | `see references/rwa-issuance.md#investorIdentity` |
| `setComplianceRules(uint256,uint256)` | 🟡 medium | write | `cast send 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "setComplianceRules(uint256,uint256)" $MAX_HOLDERS $MAX_BALANCE --rpc-url $RPC --private-key $PK` |
| `canTransfer(address,address,uint256)` | 🟢 low | view | `cast call 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "canTransfer(address,address,uint256)(bool,string)" <from> <to> <amt> --rpc-url $RPC` |
| `setDiligenceAttestationRegistry(address)` | 🟡 medium | write | `see references/rwa-issuance.md#setDiligenceAttestationRegistry` |
| `setRecoveryDelay(uint64)` | 🟡 medium | write | `see references/rwa-issuance.md#setRecoveryDelay` |
| `setAddressFrozen(address,bool)` | 🟡 medium | write | `cast send 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "setAddressFrozen(address,bool)" <account> true --rpc-url $RPC --private-key $PK` |
| `freezePartialTokens(address,uint256)` | 🟡 medium | write | `cast send 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "freezePartialTokens(address,uint256)" <account> <amount> --rpc-url $RPC --private-key $PK` |
| `unfreezePartialTokens(address,uint256)` | 🟡 medium | write | `cast send 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "unfreezePartialTokens(address,uint256)" <account> <amount> --rpc-url $RPC --private-key $PK` |
| `isFrozen(address)` | 🟢 low | view | `cast call 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "isFrozen(address)(bool)" <account> --rpc-url $RPC` |
| `frozenTokens(address)` | 🟢 low | view | `cast call 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "frozenTokens(address)(uint256)" <account> --rpc-url $RPC` |
| `mint(address,uint256,bytes32)` | 🔴 high | write | `cast send 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "mint(address,uint256,bytes32)" <to> <amount> <evidenceHash> --rpc-url $RPC --private-key $PK` |
| `burn(address,uint256)` | 🔴 high | write | `cast send 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "burn(address,uint256)" <from> <amount> --rpc-url $RPC --private-key $PK` |
| `forcedTransfer(address,address,uint256)` | 🔴 high | write | `cast send 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "forcedTransfer(address,address,uint256)" <from> <to> <amount> --rpc-url $RPC --private-key $PK` |
| `proposeRecoveryAddress(address,address,bytes32)` | 🟡 medium | write | `cast send 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "proposeRecoveryAddress(address,address,bytes32)" <lost> <new> <identityId> --rpc-url $RPC --private-key $PK` |
| `cancelRecoveryAddress(bytes32)` | 🟡 medium | write | `cast send 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "cancelRecoveryAddress(bytes32)" <requestId> --rpc-url $RPC --private-key $PK` |
| `executeRecoveryAddress(bytes32)` | 🔴 high | write | `cast send 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "executeRecoveryAddress(bytes32)" <requestId> --rpc-url $RPC --private-key $PK` |
| `getRecoveryRequest(bytes32)` | 🟢 low | view | `see references/rwa-issuance.md#getRecoveryRequest` |
| `depositDividend()` | 🔴 high | payable | `cast send 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "depositDividend()" --value <PHRS> --rpc-url $RPC --private-key $PK` |
| `sweepUndistributedDividend(address)` | 🔴 high | write | `cast send 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "sweepUndistributedDividend(address)" <to> --rpc-url $RPC --private-key $PK` |
| `claimDividend()` | 🟢 low | write | `cast send 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "claimDividend()" --rpc-url $RPC --private-key $PK` |
| `dividendOf(address)` | 🟢 low | view | `cast call 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "dividendOf(address)(uint256)" <holder> --rpc-url $RPC` |
| `addAgent(address)` | 🟡 medium | write | `cast send 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "addAgent(address)" <agent> --rpc-url $RPC --private-key $PK` |
| `removeAgent(address)` | 🟡 medium | write | `cast send 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "removeAgent(address)" <agent> --rpc-url $RPC --private-key $PK` |
| `isAgent(address)` | 🟢 low | view | `cast call 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "isAgent(address)(bool)" <account> --rpc-url $RPC` |
| `addMinter(address)` | 🟡 medium | write | `cast send 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "addMinter(address)" <account> --rpc-url $RPC --private-key $PK` |
| `removeMinter(address)` | 🟡 medium | write | `cast send 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "removeMinter(address)" <account> --rpc-url $RPC --private-key $PK` |
| `isMinter(address)` | 🟢 low | view | `cast call 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "isMinter(address)(bool)" <account> --rpc-url $RPC` |
| `addRecoveryOperator(address)` | 🟡 medium | write | `cast send 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "addRecoveryOperator(address)" <account> --rpc-url $RPC --private-key $PK` |
| `removeRecoveryOperator(address)` | 🟡 medium | write | `cast send 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "removeRecoveryOperator(address)" <account> --rpc-url $RPC --private-key $PK` |
| `isRecoveryOperator(address)` | 🟢 low | view | `cast call 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "isRecoveryOperator(address)(bool)" <account> --rpc-url $RPC` |
| `pause()` | 🟡 medium | write | `cast send 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "pause()" --rpc-url $RPC --private-key $PK` |
| `unpause()` | 🟡 medium | write | `cast send 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "unpause()" --rpc-url $RPC --private-key $PK` |
| `supportsInterface(bytes4)` | 🟢 low | view | `see references/rwa-issuance.md#supportsInterface` |
| `maxHolders()` | 🟢 low | view | `cast call 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "maxHolders()(uint256)" --rpc-url $RPC` |
| `maxBalancePerInvestor()` | 🟢 low | view | `cast call 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "maxBalancePerInvestor()(uint256)" --rpc-url $RPC` |
| `holderCount()` | 🟢 low | view | `cast call 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "holderCount()(uint256)" --rpc-url $RPC` |
| `dividendPerShareCumulative()` | 🟢 low | view | `cast call 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "dividendPerShareCumulative()(...)" --rpc-url $RPC` |
| `undistributedDividend()` | 🟢 low | view | `cast call 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "undistributedDividend()(uint256)" --rpc-url $RPC` |
| `recoveryDelay()` | 🟢 low | view | `cast call 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3 "recoveryDelay()(...)" --rpc-url $RPC` |

## Events (cast logs)

| Event | Params |
|---|---|
| `AgentAdded` | `address indexed agent` |
| `AgentRemoved` | `address indexed agent` |
| `IdentityRegistered` | `address indexed investor, uint16 country` |
| `IdentityRemoved` | `address indexed investor` |
| `WalletIdentityBound` | `address indexed investor, bytes32 indexed identityId` |
| `AddressFrozen` | `address indexed userAddress, bool indexed isFrozen, address indexed owner` |
| `TokensFrozen` | `address indexed userAddress, uint256 amount` |
| `TokensUnfrozen` | `address indexed userAddress, uint256 amount` |
| `ComplianceRulesUpdated` | `uint256 maxHolders, uint256 maxBalancePerInvestor` |
| `RecoverySuccess` | `address indexed lostWallet, address indexed newWallet` |
| `RecoveryProposed` | `bytes32 indexed requestId,
        address indexed lostWallet,
        address indexed newWallet,
        bytes32 identityId,
        uint64 executeAfter,
        address proposer` |
| `RecoveryCancelled` | `bytes32 indexed requestId, address indexed by` |
| `RecoveryExecuted` | `bytes32 indexed requestId, address indexed by` |
| `RecoveryDelayUpdated` | `uint64 oldDelay, uint64 newDelay` |
| `DiligenceAttestationRegistrySet` | `address indexed registry` |
| `DividendDeposited` | `uint256 amount, uint256 newCumulativePerShare` |
| `DividendClaimed` | `address indexed investor, uint256 amount` |
| `DividendDustSwept` | `address indexed to, uint256 amount` |

## Custom errors

| Error | Params |
|---|---|
| `NotAgent` | `` |
| `NotMinter` | `` |
| `NotRecoveryOperator` | `` |
| `NotVerified` | `address account` |
| `WalletFrozen` | `address account` |
| `ComplianceFailure` | `string reason` |
| `InsufficientUnfrozen` | `uint256 available, uint256 required` |
| `InvalidIdentity` | `` |
| `IdentityMismatch` | `address account, bytes32 expectedIdentity, bytes32 actualIdentity` |
| `RecoveryRequestNotFound` | `bytes32 requestId` |
| `RecoveryRequestProcessed` | `bytes32 requestId` |
| `RecoveryNotReady` | `bytes32 requestId, uint64 executeAfter` |
| `DiligenceAttestationRegistryNotSet` | `` |
| `DiligenceNotAttested` | `bytes32 evidenceHash` |
