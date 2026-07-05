# Auto-generated contract surface

> Source: `src/CompliantRWAToken.sol` — **do not edit by hand**.
> Regenerate: `npm run refs:generate`

Counts: 44 external/public functions · 18 events · 14 errors

## Function index (agent risk tiers)

| Function | Tier | Mutability | cast hint |
|---|---|---|---|
| `registerIdentity(address,uint16,bytes32)` | 🟡 medium | write | `cast send <token> "registerIdentity(address,uint16,bytes32)" <investor> <country> <identityId> --rpc-url $RPC --private-key $PK` |
| `batchRegisterIdentity(address[],uint16[],bytes32[])` | 🟡 medium | write | `cast send <token> "batchRegisterIdentity(address[],uint16[],bytes32[])" "[<a1>]" "[<c1>]" "[<id1>]" --rpc-url $RPC --private-key $PK` |
| `removeIdentity(address)` | 🟡 medium | write | `cast send <token> "removeIdentity(address)" <investor> --rpc-url $RPC --private-key $PK` |
| `isVerified(address)` | 🟢 low | view | `cast call <token> "isVerified(address)(bool)" <account> --rpc-url $RPC` |
| `investorCountry(address)` | 🟢 low | view | `cast call <token> "investorCountry(address)(uint16)" <account> --rpc-url $RPC` |
| `investorIdentity(address)` | 🟢 low | view | `see references/rwa-issuance.md#investorIdentity` |
| `setComplianceRules(uint256,uint256)` | 🟡 medium | write | `cast send <token> "setComplianceRules(uint256,uint256)" $MAX_HOLDERS $MAX_BALANCE --rpc-url $RPC --private-key $PK` |
| `canTransfer(address,address,uint256)` | 🟢 low | view | `cast call <token> "canTransfer(address,address,uint256)(bool,string)" <from> <to> <amt> --rpc-url $RPC` |
| `setDiligenceAttestationRegistry(address)` | 🟡 medium | write | `see references/rwa-issuance.md#setDiligenceAttestationRegistry` |
| `setRecoveryDelay(uint64)` | 🟡 medium | write | `see references/rwa-issuance.md#setRecoveryDelay` |
| `setAddressFrozen(address,bool)` | 🟡 medium | write | `cast send <token> "setAddressFrozen(address,bool)" <account> true --rpc-url $RPC --private-key $PK` |
| `freezePartialTokens(address,uint256)` | 🟡 medium | write | `cast send <token> "freezePartialTokens(address,uint256)" <account> <amount> --rpc-url $RPC --private-key $PK` |
| `unfreezePartialTokens(address,uint256)` | 🟡 medium | write | `cast send <token> "unfreezePartialTokens(address,uint256)" <account> <amount> --rpc-url $RPC --private-key $PK` |
| `isFrozen(address)` | 🟢 low | view | `cast call <token> "isFrozen(address)(bool)" <account> --rpc-url $RPC` |
| `frozenTokens(address)` | 🟢 low | view | `cast call <token> "frozenTokens(address)(uint256)" <account> --rpc-url $RPC` |
| `mint(address,uint256,bytes32)` | 🔴 high | write | `cast send <token> "mint(address,uint256,bytes32)" <to> <amount> <evidenceHash> --rpc-url $RPC --private-key $PK` |
| `burn(address,uint256)` | 🔴 high | write | `cast send <token> "burn(address,uint256)" <from> <amount> --rpc-url $RPC --private-key $PK` |
| `forcedTransfer(address,address,uint256)` | 🔴 high | write | `cast send <token> "forcedTransfer(address,address,uint256)" <from> <to> <amount> --rpc-url $RPC --private-key $PK` |
| `proposeRecoveryAddress(address,address,bytes32)` | 🟡 medium | write | `cast send <token> "proposeRecoveryAddress(address,address,bytes32)" <lost> <new> <identityId> --rpc-url $RPC --private-key $PK` |
| `cancelRecoveryAddress(bytes32)` | 🟡 medium | write | `cast send <token> "cancelRecoveryAddress(bytes32)" <requestId> --rpc-url $RPC --private-key $PK` |
| `executeRecoveryAddress(bytes32)` | 🔴 high | write | `cast send <token> "executeRecoveryAddress(bytes32)" <requestId> --rpc-url $RPC --private-key $PK` |
| `getRecoveryRequest(bytes32)` | 🟢 low | view | `see references/rwa-issuance.md#getRecoveryRequest` |
| `depositDividend()` | 🔴 high | payable | `cast send <token> "depositDividend()" --value <PHRS> --rpc-url $RPC --private-key $PK` |
| `sweepUndistributedDividend(address)` | 🔴 high | write | `cast send <token> "sweepUndistributedDividend(address)" <to> --rpc-url $RPC --private-key $PK` |
| `claimDividend()` | 🟢 low | write | `cast send <token> "claimDividend()" --rpc-url $RPC --private-key $PK` |
| `dividendOf(address)` | 🟢 low | view | `cast call <token> "dividendOf(address)(uint256)" <holder> --rpc-url $RPC` |
| `addAgent(address)` | 🟡 medium | write | `cast send <token> "addAgent(address)" <agent> --rpc-url $RPC --private-key $PK` |
| `removeAgent(address)` | 🟡 medium | write | `cast send <token> "removeAgent(address)" <agent> --rpc-url $RPC --private-key $PK` |
| `isAgent(address)` | 🟢 low | view | `cast call <token> "isAgent(address)(bool)" <account> --rpc-url $RPC` |
| `addMinter(address)` | 🟡 medium | write | `cast send <token> "addMinter(address)" <account> --rpc-url $RPC --private-key $PK` |
| `removeMinter(address)` | 🟡 medium | write | `cast send <token> "removeMinter(address)" <account> --rpc-url $RPC --private-key $PK` |
| `isMinter(address)` | 🟢 low | view | `cast call <token> "isMinter(address)(bool)" <account> --rpc-url $RPC` |
| `addRecoveryOperator(address)` | 🟡 medium | write | `cast send <token> "addRecoveryOperator(address)" <account> --rpc-url $RPC --private-key $PK` |
| `removeRecoveryOperator(address)` | 🟡 medium | write | `cast send <token> "removeRecoveryOperator(address)" <account> --rpc-url $RPC --private-key $PK` |
| `isRecoveryOperator(address)` | 🟢 low | view | `cast call <token> "isRecoveryOperator(address)(bool)" <account> --rpc-url $RPC` |
| `pause()` | 🟡 medium | write | `cast send <token> "pause()" --rpc-url $RPC --private-key $PK` |
| `unpause()` | 🟡 medium | write | `cast send <token> "unpause()" --rpc-url $RPC --private-key $PK` |
| `supportsInterface(bytes4)` | 🟢 low | view | `see references/rwa-issuance.md#supportsInterface` |
| `maxHolders()` | 🟢 low | view | `cast call <token> "maxHolders()(uint256)" --rpc-url $RPC` |
| `maxBalancePerInvestor()` | 🟢 low | view | `cast call <token> "maxBalancePerInvestor()(uint256)" --rpc-url $RPC` |
| `holderCount()` | 🟢 low | view | `cast call <token> "holderCount()(uint256)" --rpc-url $RPC` |
| `dividendPerShareCumulative()` | 🟢 low | view | `cast call <token> "dividendPerShareCumulative()(...)" --rpc-url $RPC` |
| `undistributedDividend()` | 🟢 low | view | `cast call <token> "undistributedDividend()(uint256)" --rpc-url $RPC` |
| `recoveryDelay()` | 🟢 low | view | `cast call <token> "recoveryDelay()(...)" --rpc-url $RPC` |

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
