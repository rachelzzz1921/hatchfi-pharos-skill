// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CompliantRWAToken
 * @notice 一支「合规优先」的 RWA（现实世界资产）代币，遵循 ERC-3643 / T-REX 的核心精神：
 *         转账默认禁止，每一笔转移都必须同时通过「身份验证」与「合规规则」两道检查。
 *
 *         设计取舍（单合约内聚版）：
 *         完整 T-REX 由 6+ 个合约组成（Token / IdentityRegistry / IdentityRegistryStorage /
 *         TrustedIssuersRegistry / ClaimTopicsRegistry / ModularCompliance）。为在 Pharos
 *         atlantic 测试网可部署、可验证、可被 agent 通过 cast 调用，这里把
 *         「身份注册」与「模块化合规」内聚进单个合约，但【函数与事件命名严格对齐 ERC-3643】
 *         （isVerified / canTransfer / AddressFrozen / forcedTransfer / recoveryAddress …），
 *         以便未来平滑拆分为标准多合约套件。
 *
 *         —— 这正是 Pharos「协议层原生合规 + RWA」叙事所要的底层能力。
 */

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract CompliantRWAToken is ERC20, Ownable, Pausable {
    // ─────────────────────────────────────────────────────────────────────────
    // 角色：owner（发行方）+ agent（合规操作员，可加白名单/冻结/强制转移）
    // 对齐 T-REX 的 IAgentRole 思想
    // ─────────────────────────────────────────────────────────────────────────
    mapping(address => bool) private _agents;

    // ── 身份注册（对齐 IdentityRegistry 的核心：isVerified）──
    // verified[addr] = 该地址是否完成 KYC、够格持有本资产
    mapping(address => bool) private _verified;
    // country[addr] = 地区码（用于按国家做合规限制，对齐 T-REX 的 country-based rules）
    mapping(address => uint16) private _country;

    // ── 冻结（对齐 AddressFrozen / freezePartialTokens）──
    mapping(address => bool) private _frozen;
    mapping(address => uint256) private _frozenTokens;

    // ── 模块化合规规则（对齐 ModularCompliance 的 canTransfer 全局规则）──
    uint256 public maxHolders;        // 最大持有人数（0 = 不限制）
    uint256 public maxBalancePerInvestor; // 单投资者最大持仓（0 = 不限制）
    uint256 public holderCount;       // 当前持有人数

    // ── 派息（RWA 资产的生命周期能力：向所有合规持有人按持仓比例派息）──
    // 用「派息轮次 + 累计每股派息」模型，避免遍历持有人（gas 安全）
    uint256 public dividendPerShareCumulative; // 1e18 精度
    mapping(address => uint256) private _lastClaimedCumulative;
    mapping(address => uint256) public withdrawableDividend; // 已结算待提取
    // 派息整除余数（dust）累计：不计入每股累计，owner 可回收，避免永久锁死在合约
    uint256 public undistributedDividend;

    // ─────────────────────────────────────────────────────────────────────────
    // 事件（命名对齐 ERC-3643，便于 agent 用 cast logs 解析 + 未来标准化）
    // ─────────────────────────────────────────────────────────────────────────
    event AgentAdded(address indexed agent);
    event AgentRemoved(address indexed agent);
    event IdentityRegistered(address indexed investor, uint16 country);
    event IdentityRemoved(address indexed investor);
    event AddressFrozen(address indexed userAddress, bool indexed isFrozen, address indexed owner);
    event TokensFrozen(address indexed userAddress, uint256 amount);
    event TokensUnfrozen(address indexed userAddress, uint256 amount);
    event ComplianceRulesUpdated(uint256 maxHolders, uint256 maxBalancePerInvestor);
    event RecoverySuccess(address indexed lostWallet, address indexed newWallet);
    event DividendDeposited(uint256 amount, uint256 newCumulativePerShare);
    event DividendClaimed(address indexed investor, uint256 amount);
    event DividendDustSwept(address indexed to, uint256 amount);

    // ─────────────────────────────────────────────────────────────────────────
    // 自定义错误（human-readable，对齐手册「revert 信息要可读」的要求；
    // 这些字符串会被 D（skill 生成器）抽进 reference 的 Error Handling 表）
    // ─────────────────────────────────────────────────────────────────────────
    error NotAgent();
    error NotVerified(address account);     // 收款方未通过 KYC
    error WalletFrozen(address account);     // 钱包被冻结
    error ComplianceFailure(string reason);  // 违反全局合规规则
    error InsufficientUnfrozen(uint256 available, uint256 required);

    modifier onlyAgent() {
        if (!_agents[msg.sender] && msg.sender != owner()) revert NotAgent();
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 maxHolders_,
        uint256 maxBalancePerInvestor_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        _agents[msg.sender] = true;
        maxHolders = maxHolders_;
        maxBalancePerInvestor = maxBalancePerInvestor_;
        emit AgentAdded(msg.sender);
        emit ComplianceRulesUpdated(maxHolders_, maxBalancePerInvestor_);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 1) 身份注册管理（对应 reference: 加白名单 / 移除白名单 / 查验证状态）
    // ═════════════════════════════════════════════════════════════════════════

    /// @notice 注册一个合规投资者身份（KYC 通过后由 agent 调用）
    function registerIdentity(address investor, uint16 country) external onlyAgent {
        _verified[investor] = true;
        _country[investor] = country;
        emit IdentityRegistered(investor, country);
    }

    /// @notice 批量注册（机构发行常见需求）
    function batchRegisterIdentity(address[] calldata investors, uint16[] calldata countries)
        external
        onlyAgent
    {
        require(investors.length == countries.length, "length mismatch");
        for (uint256 i = 0; i < investors.length; i++) {
            _verified[investors[i]] = true;
            _country[investors[i]] = countries[i];
            emit IdentityRegistered(investors[i], countries[i]);
        }
    }

    function removeIdentity(address investor) external onlyAgent {
        _verified[investor] = false;
        emit IdentityRemoved(investor);
    }

    /// @notice 对齐 ERC-3643 IdentityRegistry.isVerified —— 该地址是否够格持有本资产
    function isVerified(address account) public view returns (bool) {
        return _verified[account];
    }

    function investorCountry(address account) external view returns (uint16) {
        return _country[account];
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 2) 合规规则（对齐 ModularCompliance.canTransfer 的全局规则检查）
    // ═════════════════════════════════════════════════════════════════════════

    function setComplianceRules(uint256 maxHolders_, uint256 maxBalancePerInvestor_)
        external
        onlyOwner
    {
        maxHolders = maxHolders_;
        maxBalancePerInvestor = maxBalancePerInvestor_;
        emit ComplianceRulesUpdated(maxHolders_, maxBalancePerInvestor_);
    }

    /// @notice 对齐 ERC-3643 Compliance.canTransfer —— 只看全局合规规则，不看身份
    ///         （身份由 isVerified 单独负责）。view 函数，agent 可在转账前预检并向用户解释。
    /// @return ok 是否合规
    /// @return reason 不合规时的人类可读原因（agent 直接展示给用户）
    function canTransfer(address from, address to, uint256 amount)
        public
        view
        returns (bool ok, string memory reason)
    {
        // 规则一：单投资者持仓上限
        if (maxBalancePerInvestor > 0) {
            if (balanceOf(to) + amount > maxBalancePerInvestor) {
                return (false, "exceeds max balance per investor");
            }
        }
        // 规则二：最大持有人数（收款方是新持有人时才校验）
        if (maxHolders > 0 && balanceOf(to) == 0 && to != from) {
            if (holderCount + 1 > maxHolders) {
                return (false, "exceeds max holder count");
            }
        }
        return (true, "");
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 3) 冻结（对齐 AddressFrozen / freezePartialTokens）
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
    // 4) 受限转账 —— ERC-3643 的灵魂：override 标准 transfer，强制两道检查
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
        // 普通转账（双方非零地址）才跑完整合规检查；
        // mint（from=0）只要求收款方 isVerified；burn（to=0）放行
        if (from != address(0) && to != address(0)) {
            _enforceTransfer(from, to, value);
        } else if (from == address(0)) {
            // mint（发行）：合规优先——既校验收款方身份，也强制全局合规上限
            // （持有人数上限、单投资者持仓上限同样适用于一级发行）
            if (!_verified[to]) revert NotVerified(to);
            (bool ok, string memory reason) = canTransfer(address(0), to, value);
            if (!ok) revert ComplianceFailure(reason);
        }

        _beforeBalanceChange(from, to);
        super._update(from, to, value);
        _afterBalanceChange(from, to);
    }

    // ── 持有人计数：用单一真值来源 _counted[addr] 表示"该地址当前是否被计入 holderCount"──
    // 规则：余额从 0 变正 → 计入；余额变 0 → 移出。在余额已更新后统一判定，无竞态。
    mapping(address => bool) private _counted;

    /// @dev 余额变动前：结算双方应得分红（派息模型要求，必须在余额变化前快照）
    function _beforeBalanceChange(address from, address to) internal {
        if (from != address(0)) _settleDividend(from);
        if (to != address(0)) _settleDividend(to);
    }

    /// @dev 余额变动后：根据"当前真实余额"对齐 _counted 与 holderCount，幂等、自洽
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
    // 5) mint / forcedTransfer / recovery（机构资产管理能力，对齐 T-REX）
    // ═════════════════════════════════════════════════════════════════════════

    /// @notice 发行（mint）新份额给合规投资者
    function mint(address to, uint256 amount) external onlyAgent {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyAgent {
        _burn(from, amount);
        // 维持不变量 frozenTokens ≤ balance：若销毁后冻结额超过余额，下调冻结额，
        // 否则 _enforceTransfer 里的 `balance - frozenTokens` 会下溢、永久锁死该账户转账。
        uint256 bal = balanceOf(from);
        if (_frozenTokens[from] > bal) {
            emit TokensUnfrozen(from, _frozenTokens[from] - bal);
            _frozenTokens[from] = bal;
        }
    }

    /// @notice 强制转移（对齐 forcedTransfer）—— 监管/法律场景下 agent 可强制划转，
    ///         绕过 compliance 全局规则，但收款方仍须 isVerified
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
        super._update(from, to, amount); // 绕过 _enforceTransfer 的 compliance 检查
        _afterBalanceChange(from, to);
        return true;
    }

    /// @notice 钱包恢复（对齐 recoveryAddress）—— 投资者丢失私钥时，agent 把余额迁到新钱包
    function recoveryAddress(address lostWallet, address newWallet)
        external
        onlyAgent
        returns (bool)
    {
        require(balanceOf(lostWallet) > 0, "no tokens to recover");
        _verified[newWallet] = true;
        _country[newWallet] = _country[lostWallet];
        uint256 bal = balanceOf(lostWallet);
        uint256 frozenBal = _frozenTokens[lostWallet];
        _settleDividend(lostWallet);
        _settleDividend(newWallet);
        // 迁移已结算但未领取的分红到新钱包（否则丢私钥的旧钱包会丢失这部分应得收益）
        uint256 pendingDividend = withdrawableDividend[lostWallet];
        if (pendingDividend > 0) {
            withdrawableDividend[lostWallet] = 0;
            withdrawableDividend[newWallet] += pendingDividend;
        }
        super._update(lostWallet, newWallet, bal);
        if (frozenBal > 0) {
            _frozenTokens[lostWallet] = 0;
            // 用 += 累加，避免覆盖 newWallet 已有的冻结额（防止冻结记账被冲掉）
            _frozenTokens[newWallet] += frozenBal;
            emit TokensFrozen(newWallet, frozenBal);
        }
        _afterBalanceChange(lostWallet, newWallet);
        emit RecoverySuccess(lostWallet, newWallet);
        return true;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 6) 派息（RWA 生命周期：发行方存入 PHRS，持有人按持仓比例领取）
    // ═════════════════════════════════════════════════════════════════════════

    /// @notice 发行方存入分红（payable，存入原生 PHRS），按当前总供应量摊到每股
    function depositDividend() external payable onlyOwner {
        require(totalSupply() > 0, "no supply");
        require(msg.value > 0, "no value");
        uint256 supply = totalSupply();
        uint256 perShare = (msg.value * 1e18) / supply;
        require(perShare > 0, "deposit too small for supply");
        dividendPerShareCumulative += perShare;
        // 整除产生的余数（dust）不可被持有人按每股领取，单独记账，owner 可回收
        uint256 distributed = (perShare * supply) / 1e18;
        undistributedDividend += msg.value - distributed;
        emit DividendDeposited(msg.value, dividendPerShareCumulative);
    }

    /// @notice 回收派息整除余数（dust）。仅 owner，避免少量 PHRS 永久锁死在合约。
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

    /// @notice 持有人领取已结算的分红
    function claimDividend() external {
        _settleDividend(msg.sender);
        uint256 amount = withdrawableDividend[msg.sender];
        require(amount > 0, "nothing to claim");
        withdrawableDividend[msg.sender] = 0;
        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "transfer failed");
        emit DividendClaimed(msg.sender, amount);
    }

    /// @notice 查询某地址当前可领分红（含未结算部分），view，agent 友好
    function dividendOf(address account) external view returns (uint256) {
        uint256 unsettled = (balanceOf(account) *
            (dividendPerShareCumulative - _lastClaimedCumulative[account])) / 1e18;
        return withdrawableDividend[account] + unsettled;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 7) 角色管理 + 暂停
    // ═════════════════════════════════════════════════════════════════════════

    function addAgent(address agent) external onlyOwner {
        _agents[agent] = true;
        emit AgentAdded(agent);
    }

    function removeAgent(address agent) external onlyOwner {
        _agents[agent] = false;
        emit AgentRemoved(agent);
    }

    function isAgent(address account) external view returns (bool) {
        return _agents[account];
    }

    function pause() external onlyAgent {
        _pause();
    }

    function unpause() external onlyAgent {
        _unpause();
    }

    // 不提供无 calldata 的 receive()/fallback：原生 PHRS 只能经 payable 的 depositDividend 进入，
    // 避免误转入的 PHRS 无对应记账而被永久锁死（审计 F4）。
}
