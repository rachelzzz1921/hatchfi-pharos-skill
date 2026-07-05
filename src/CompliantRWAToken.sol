// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {DiligenceAttestationRegistry} from "./DiligenceAttestationRegistry.sol";

/**
 * @title CompliantRWAToken
 * @notice ERC-3643 / T-REX 风格的合规 RWA 代币（单合约内聚版）。
 *         强制转账前身份+合规双检查；引入角色分离、身份绑定恢复、on-chain diligence mint 闸门。
 */
contract CompliantRWAToken is ERC20, Ownable, Pausable, AccessControl {
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant RECOVERY_ROLE = keccak256("RECOVERY_ROLE");

    // ── 身份 / 合规状态 ───────────────────────────────────────────────────────
    mapping(address => bool) private _verified;
    mapping(address => uint16) private _country;
    mapping(address => bytes32) private _walletIdentity;

    mapping(address => bool) private _frozen;
    mapping(address => uint256) private _frozenTokens;

    uint256 public maxHolders;
    uint256 public maxBalancePerInvestor;
    uint256 public holderCount;
    mapping(address => bool) private _counted;

    // ── 派息状态 ───────────────────────────────────────────────────────────────
    uint256 public dividendPerShareCumulative; // 1e18 precision
    mapping(address => uint256) private _lastClaimedCumulative;
    mapping(address => uint256) public withdrawableDividend;
    uint256 public undistributedDividend;

    // ── mint diligence gate ───────────────────────────────────────────────────
    DiligenceAttestationRegistry public diligenceAttestationRegistry;

    // ── recovery two-step state ───────────────────────────────────────────────
    struct RecoveryRequest {
        address lostWallet;
        address newWallet;
        bytes32 identityId;
        uint64 executeAfter;
        address proposer;
        bool executed;
        bool cancelled;
    }

    mapping(bytes32 => RecoveryRequest) private _recoveryRequests;
    uint256 private _recoveryNonce;
    uint64 public recoveryDelay = 1 hours;

    // ──────────────────────────────────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────────────────────────────────
    event AgentAdded(address indexed agent);
    event AgentRemoved(address indexed agent);
    event IdentityRegistered(address indexed investor, uint16 country);
    event IdentityRemoved(address indexed investor);
    event WalletIdentityBound(address indexed investor, bytes32 indexed identityId);
    event AddressFrozen(address indexed userAddress, bool indexed isFrozen, address indexed owner);
    event TokensFrozen(address indexed userAddress, uint256 amount);
    event TokensUnfrozen(address indexed userAddress, uint256 amount);
    event ComplianceRulesUpdated(uint256 maxHolders, uint256 maxBalancePerInvestor);
    event RecoverySuccess(address indexed lostWallet, address indexed newWallet);
    event RecoveryProposed(
        bytes32 indexed requestId,
        address indexed lostWallet,
        address indexed newWallet,
        bytes32 identityId,
        uint64 executeAfter,
        address proposer
    );
    event RecoveryCancelled(bytes32 indexed requestId, address indexed by);
    event RecoveryExecuted(bytes32 indexed requestId, address indexed by);
    event RecoveryDelayUpdated(uint64 oldDelay, uint64 newDelay);
    event DiligenceAttestationRegistrySet(address indexed registry);
    event DividendDeposited(uint256 amount, uint256 newCumulativePerShare);
    event DividendClaimed(address indexed investor, uint256 amount);
    event DividendDustSwept(address indexed to, uint256 amount);

    // ──────────────────────────────────────────────────────────────────────────
    // Errors
    // ──────────────────────────────────────────────────────────────────────────
    error NotAgent();
    error NotMinter();
    error NotRecoveryOperator();
    error NotVerified(address account);
    error WalletFrozen(address account);
    error ComplianceFailure(string reason);
    error InsufficientUnfrozen(uint256 available, uint256 required);
    error InvalidIdentity();
    error IdentityMismatch(address account, bytes32 expectedIdentity, bytes32 actualIdentity);
    error RecoveryRequestNotFound(bytes32 requestId);
    error RecoveryRequestProcessed(bytes32 requestId);
    error RecoveryNotReady(bytes32 requestId, uint64 executeAfter);
    error DiligenceAttestationRegistryNotSet();
    error DiligenceNotAttested(bytes32 evidenceHash);

    modifier onlyAgent() {
        if (!hasRole(COMPLIANCE_ROLE, msg.sender)) revert NotAgent();
        _;
    }

    modifier onlyMinter() {
        if (!hasRole(MINTER_ROLE, msg.sender)) revert NotMinter();
        _;
    }

    modifier onlyRecoveryOperator() {
        if (!hasRole(RECOVERY_ROLE, msg.sender)) revert NotRecoveryOperator();
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 maxHolders_,
        uint256 maxBalancePerInvestor_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(COMPLIANCE_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(RECOVERY_ROLE, msg.sender);

        maxHolders = maxHolders_;
        maxBalancePerInvestor = maxBalancePerInvestor_;

        emit AgentAdded(msg.sender);
        emit ComplianceRulesUpdated(maxHolders_, maxBalancePerInvestor_);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 1) 身份注册管理
    // ═════════════════════════════════════════════════════════════════════════

    function registerIdentity(address investor, uint16 country, bytes32 identityId) external onlyAgent {
        if (identityId == bytes32(0)) revert InvalidIdentity();
        _verified[investor] = true;
        _country[investor] = country;
        _walletIdentity[investor] = identityId;
        emit IdentityRegistered(investor, country);
        emit WalletIdentityBound(investor, identityId);
    }

    function batchRegisterIdentity(
        address[] calldata investors,
        uint16[] calldata countries,
        bytes32[] calldata identityIds
    ) external onlyAgent {
        require(investors.length == countries.length, "length mismatch countries");
        require(investors.length == identityIds.length, "length mismatch identities");

        for (uint256 i = 0; i < investors.length; i++) {
            if (identityIds[i] == bytes32(0)) revert InvalidIdentity();
            _verified[investors[i]] = true;
            _country[investors[i]] = countries[i];
            _walletIdentity[investors[i]] = identityIds[i];
            emit IdentityRegistered(investors[i], countries[i]);
            emit WalletIdentityBound(investors[i], identityIds[i]);
        }
    }

    function removeIdentity(address investor) external onlyAgent {
        _verified[investor] = false;
        _walletIdentity[investor] = bytes32(0);
        emit IdentityRemoved(investor);
    }

    function isVerified(address account) public view returns (bool) {
        return _verified[account];
    }

    function investorCountry(address account) external view returns (uint16) {
        return _country[account];
    }

    function investorIdentity(address account) external view returns (bytes32) {
        return _walletIdentity[account];
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 2) 合规规则
    // ═════════════════════════════════════════════════════════════════════════

    function setComplianceRules(uint256 maxHolders_, uint256 maxBalancePerInvestor_)
        external
        onlyOwner
    {
        maxHolders = maxHolders_;
        maxBalancePerInvestor = maxBalancePerInvestor_;
        emit ComplianceRulesUpdated(maxHolders_, maxBalancePerInvestor_);
    }

    function canTransfer(address from, address to, uint256 amount)
        public
        view
        returns (bool ok, string memory reason)
    {
        if (maxBalancePerInvestor > 0) {
            if (balanceOf(to) + amount > maxBalancePerInvestor) {
                return (false, "exceeds max balance per investor");
            }
        }

        if (maxHolders > 0 && balanceOf(to) == 0 && to != from) {
            if (holderCount + 1 > maxHolders) {
                return (false, "exceeds max holder count");
            }
        }
        return (true, "");
    }

    function setDiligenceAttestationRegistry(address registry) external onlyOwner {
        diligenceAttestationRegistry = DiligenceAttestationRegistry(registry);
        emit DiligenceAttestationRegistrySet(registry);
    }

    function setRecoveryDelay(uint64 newDelay) external onlyOwner {
        uint64 oldDelay = recoveryDelay;
        recoveryDelay = newDelay;
        emit RecoveryDelayUpdated(oldDelay, newDelay);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 3) 冻结
    // ═════════════════════════════════════════════════════════════════════════

    function setAddressFrozen(address account, bool freeze) external onlyAgent {
        _frozen[account] = freeze;
        emit AddressFrozen(account, freeze, msg.sender);
    }

    function freezePartialTokens(address account, uint256 amount) external onlyAgent {
        require(_frozenTokens[account] + amount <= balanceOf(account), "amount exceeds balance");
        _frozenTokens[account] += amount;
        emit TokensFrozen(account, amount);
    }

    function unfreezePartialTokens(address account, uint256 amount) external onlyAgent {
        require(amount <= _frozenTokens[account], "amount exceeds frozen");
        _frozenTokens[account] -= amount;
        emit TokensUnfrozen(account, amount);
    }

    function isFrozen(address account) external view returns (bool) {
        return _frozen[account];
    }

    function frozenTokens(address account) external view returns (uint256) {
        return _frozenTokens[account];
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 4) 受限转账
    // ═════════════════════════════════════════════════════════════════════════

    function _enforceTransfer(address from, address to, uint256 amount) internal view {
        if (_frozen[from]) revert WalletFrozen(from);
        if (_frozen[to]) revert WalletFrozen(to);
        if (!_verified[to]) revert NotVerified(to);

        uint256 available = balanceOf(from) - _frozenTokens[from];
        if (amount > available) revert InsufficientUnfrozen(available, amount);

        (bool ok, string memory reason) = canTransfer(from, to, amount);
        if (!ok) revert ComplianceFailure(reason);
    }

    // OZ v5 统一走 _update 钩子；mint/burn 时 from/to 有一端为 address(0)
    function _update(address from, address to, uint256 value)
        internal
        override
        whenNotPaused
    {
        if (from != address(0) && to != address(0)) {
            _enforceTransfer(from, to, value);
        } else if (from == address(0)) {
            if (!_verified[to]) revert NotVerified(to);
            (bool ok, string memory reason) = canTransfer(address(0), to, value);
            if (!ok) revert ComplianceFailure(reason);
        }

        _beforeBalanceChange(from, to);
        super._update(from, to, value);
        _afterBalanceChange(from, to);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 5) mint / forcedTransfer / recovery
    // ═════════════════════════════════════════════════════════════════════════

    function mint(address to, uint256 amount, bytes32 evidenceHash) external onlyMinter {
        if (address(diligenceAttestationRegistry) == address(0)) {
            revert DiligenceAttestationRegistryNotSet();
        }
        if (!diligenceAttestationRegistry.isPassable(evidenceHash)) {
            revert DiligenceNotAttested(evidenceHash);
        }
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyMinter {
        _burn(from, amount);
        uint256 bal = balanceOf(from);
        if (_frozenTokens[from] > bal) {
            emit TokensUnfrozen(from, _frozenTokens[from] - bal);
            _frozenTokens[from] = bal;
        }
    }

    function forcedTransfer(address from, address to, uint256 amount)
        external
        onlyAgent
        returns (bool)
    {
        if (!_verified[to]) revert NotVerified(to);
        uint256 freeBalance = balanceOf(from) - _frozenTokens[from];
        if (amount > freeBalance && _frozenTokens[from] > 0) {
            uint256 tokensToUnfreeze = amount - freeBalance;
            _frozenTokens[from] -= tokensToUnfreeze;
            emit TokensUnfrozen(from, tokensToUnfreeze);
        }

        _settleDividend(from);
        _settleDividend(to);
        super._update(from, to, amount); // bypass _enforceTransfer global compliance
        _afterBalanceChange(from, to);
        return true;
    }

    function proposeRecoveryAddress(address lostWallet, address newWallet, bytes32 identityId)
        external
        onlyRecoveryOperator
        returns (bytes32 requestId)
    {
        if (identityId == bytes32(0)) revert InvalidIdentity();
        if (_walletIdentity[lostWallet] != identityId) {
            revert IdentityMismatch(lostWallet, identityId, _walletIdentity[lostWallet]);
        }
        if (_walletIdentity[newWallet] != identityId) {
            revert IdentityMismatch(newWallet, identityId, _walletIdentity[newWallet]);
        }
        if (!_verified[newWallet]) revert NotVerified(newWallet);
        require(balanceOf(lostWallet) > 0, "no tokens to recover");

        requestId = keccak256(
            abi.encode(lostWallet, newWallet, identityId, block.timestamp, _recoveryNonce++)
        );
        RecoveryRequest storage request = _recoveryRequests[requestId];
        request.lostWallet = lostWallet;
        request.newWallet = newWallet;
        request.identityId = identityId;
        request.executeAfter = uint64(block.timestamp) + recoveryDelay;
        request.proposer = msg.sender;

        emit RecoveryProposed(
            requestId,
            lostWallet,
            newWallet,
            identityId,
            request.executeAfter,
            msg.sender
        );
    }

    function cancelRecoveryAddress(bytes32 requestId) external onlyRecoveryOperator {
        RecoveryRequest storage request = _recoveryRequests[requestId];
        if (request.lostWallet == address(0)) revert RecoveryRequestNotFound(requestId);
        if (request.executed || request.cancelled) revert RecoveryRequestProcessed(requestId);

        request.cancelled = true;
        emit RecoveryCancelled(requestId, msg.sender);
    }

    function executeRecoveryAddress(bytes32 requestId) external onlyRecoveryOperator returns (bool) {
        RecoveryRequest storage request = _recoveryRequests[requestId];
        if (request.lostWallet == address(0)) revert RecoveryRequestNotFound(requestId);
        if (request.executed || request.cancelled) revert RecoveryRequestProcessed(requestId);
        if (block.timestamp < request.executeAfter) {
            revert RecoveryNotReady(requestId, request.executeAfter);
        }

        request.executed = true;
        _executeRecovery(request.lostWallet, request.newWallet);
        emit RecoveryExecuted(requestId, msg.sender);
        return true;
    }

    function getRecoveryRequest(bytes32 requestId) external view returns (RecoveryRequest memory) {
        return _recoveryRequests[requestId];
    }

    function _executeRecovery(address lostWallet, address newWallet) internal {
        uint256 bal = balanceOf(lostWallet);
        uint256 frozenBal = _frozenTokens[lostWallet];
        bytes32 identityId = _walletIdentity[lostWallet];

        _settleDividend(lostWallet);
        _settleDividend(newWallet);

        _verified[newWallet] = true;
        _country[newWallet] = _country[lostWallet];
        _walletIdentity[newWallet] = identityId;

        _verified[lostWallet] = false;
        _walletIdentity[lostWallet] = bytes32(0);

        uint256 pendingDividend = withdrawableDividend[lostWallet];
        if (pendingDividend > 0) {
            withdrawableDividend[lostWallet] = 0;
            withdrawableDividend[newWallet] += pendingDividend;
        }

        super._update(lostWallet, newWallet, bal);

        if (frozenBal > 0) {
            _frozenTokens[lostWallet] = 0;
            _frozenTokens[newWallet] += frozenBal;
            emit TokensFrozen(newWallet, frozenBal);
        }
        _afterBalanceChange(lostWallet, newWallet);
        emit RecoverySuccess(lostWallet, newWallet);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 6) 派息
    // ═════════════════════════════════════════════════════════════════════════

    function depositDividend() external payable onlyOwner {
        require(totalSupply() > 0, "no supply");
        require(msg.value > 0, "no value");
        uint256 supply = totalSupply();
        uint256 perShare = (msg.value * 1e18) / supply;
        require(perShare > 0, "deposit too small for supply");
        dividendPerShareCumulative += perShare;

        uint256 distributed = (perShare * supply) / 1e18;
        undistributedDividend += msg.value - distributed;
        emit DividendDeposited(msg.value, dividendPerShareCumulative);
    }

    function sweepUndistributedDividend(address to) external onlyOwner {
        uint256 amount = undistributedDividend;
        require(amount > 0, "nothing to sweep");
        undistributedDividend = 0;
        (bool sent, ) = to.call{value: amount}("");
        require(sent, "sweep failed");
        emit DividendDustSwept(to, amount);
    }

    function _settleDividend(address account) internal {
        if (account == address(0)) return;
        uint256 owed = (balanceOf(account) *
            (dividendPerShareCumulative - _lastClaimedCumulative[account])) / 1e18;
        if (owed > 0) {
            withdrawableDividend[account] += owed;
        }
        _lastClaimedCumulative[account] = dividendPerShareCumulative;
    }

    function claimDividend() external {
        _settleDividend(msg.sender);
        uint256 amount = withdrawableDividend[msg.sender];
        require(amount > 0, "nothing to claim");
        withdrawableDividend[msg.sender] = 0;
        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "transfer failed");
        emit DividendClaimed(msg.sender, amount);
    }

    function dividendOf(address account) external view returns (uint256) {
        uint256 unsettled = (balanceOf(account) *
            (dividendPerShareCumulative - _lastClaimedCumulative[account])) / 1e18;
        return withdrawableDividend[account] + unsettled;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 7) holder count sync
    // ═════════════════════════════════════════════════════════════════════════

    function _beforeBalanceChange(address from, address to) internal {
        if (from != address(0)) _settleDividend(from);
        if (to != address(0)) _settleDividend(to);
    }

    function _afterBalanceChange(address from, address to) internal {
        _syncHolder(from);
        _syncHolder(to);
    }

    function _syncHolder(address account) internal {
        if (account == address(0)) return;
        bool hasBalance = balanceOf(account) > 0;
        if (hasBalance && !_counted[account]) {
            _counted[account] = true;
            holderCount += 1;
        } else if (!hasBalance && _counted[account]) {
            _counted[account] = false;
            if (holderCount > 0) holderCount -= 1;
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 8) 权限管理 + 暂停
    // ═════════════════════════════════════════════════════════════════════════

    function addAgent(address agent) external onlyOwner {
        _grantRole(COMPLIANCE_ROLE, agent);
        emit AgentAdded(agent);
    }

    function removeAgent(address agent) external onlyOwner {
        _revokeRole(COMPLIANCE_ROLE, agent);
        emit AgentRemoved(agent);
    }

    function isAgent(address account) external view returns (bool) {
        return hasRole(COMPLIANCE_ROLE, account);
    }

    function addMinter(address account) external onlyOwner {
        _grantRole(MINTER_ROLE, account);
    }

    function removeMinter(address account) external onlyOwner {
        _revokeRole(MINTER_ROLE, account);
    }

    function isMinter(address account) external view returns (bool) {
        return hasRole(MINTER_ROLE, account);
    }

    function addRecoveryOperator(address account) external onlyOwner {
        _grantRole(RECOVERY_ROLE, account);
    }

    function removeRecoveryOperator(address account) external onlyOwner {
        _revokeRole(RECOVERY_ROLE, account);
    }

    function isRecoveryOperator(address account) external view returns (bool) {
        return hasRole(RECOVERY_ROLE, account);
    }

    function pause() external onlyAgent {
        _pause();
    }

    function unpause() external onlyAgent {
        _unpause();
    }

    // 不提供无 calldata 的 receive()/fallback：原生 PHRS 只能经 payable 的 depositDividend 进入，
    // 避免误转入的 PHRS 无对应记账而被永久锁死。

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
