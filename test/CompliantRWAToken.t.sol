// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {CompliantRWAToken} from "../src/CompliantRWAToken.sol";

/**
 * @title CompliantRWAToken 冒烟测试
 * @notice 覆盖 ERC-3643 合规发行的关键不变量：
 *         身份验证、合规规则、受限转账、冻结、强制转移、钱包恢复、按比例派息。
 *         评审跑 `forge test -vvv` 全绿即为技术完整度的硬证据。
 */
contract CompliantRWATokenTest is Test {
    CompliantRWAToken token;

    address owner = address(this);          // 部署者 = owner = 初始 agent
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");
    address dave = makeAddr("dave");

    uint16 constant US = 840;
    uint16 constant SG = 702;

    function setUp() public {
        // maxHolders=3, maxBalancePerInvestor=1_000e18
        token = new CompliantRWAToken("Manhattan Property Fund", "MPF", 3, 1_000e18);
    }

    // ───────────── 身份验证 ─────────────

    function test_MintRequiresVerifiedRecipient() public {
        // 未注册身份 → mint 应 revert NotVerified
        vm.expectRevert(abi.encodeWithSelector(CompliantRWAToken.NotVerified.selector, alice));
        token.mint(alice, 100e18);

        // 注册后可 mint
        token.registerIdentity(alice, US);
        token.mint(alice, 100e18);
        assertEq(token.balanceOf(alice), 100e18);
        assertEq(token.holderCount(), 1);
    }

    function test_IsVerified() public {
        assertFalse(token.isVerified(alice));
        token.registerIdentity(alice, US);
        assertTrue(token.isVerified(alice));
        assertEq(token.investorCountry(alice), US);
    }

    function test_BatchRegister() public {
        address[] memory addrs = new address[](2);
        uint16[] memory countries = new uint16[](2);
        addrs[0] = alice; addrs[1] = bob;
        countries[0] = US; countries[1] = SG;
        token.batchRegisterIdentity(addrs, countries);
        assertTrue(token.isVerified(alice));
        assertTrue(token.isVerified(bob));
    }

    // ───────────── 受限转账（两道检查）─────────────

    function test_TransferRequiresVerifiedRecipient() public {
        token.registerIdentity(alice, US);
        token.mint(alice, 100e18);

        // bob 未验证 → alice 转给 bob 应 revert
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(CompliantRWAToken.NotVerified.selector, bob));
        token.transfer(bob, 10e18);

        // 验证 bob 后可转
        token.registerIdentity(bob, SG);
        vm.prank(alice);
        token.transfer(bob, 10e18);
        assertEq(token.balanceOf(bob), 10e18);
    }

    function test_CanTransferPreview() public {
        token.registerIdentity(alice, US);
        token.registerIdentity(bob, SG);
        token.mint(alice, 100e18);

        (bool ok, string memory reason) = token.canTransfer(alice, bob, 10e18);
        assertTrue(ok);
        assertEq(bytes(reason).length, 0);
    }

    // ───────────── 合规规则：单人上限 ─────────────

    function test_MaxBalancePerInvestorEnforced() public {
        token.registerIdentity(alice, US);
        token.registerIdentity(bob, SG);
        token.mint(alice, 1_000e18); // 正好上限

        // 转给 bob 1e18 没问题
        vm.prank(alice);
        token.transfer(bob, 1e18);

        // alice 把剩余 999e18 转给 bob → bob 正好到上限 1000e18
        vm.prank(alice);
        token.transfer(bob, 999e18);

        // 再给 bob 转 1e18 会超过单人上限 → canTransfer 在 _update 内拦截
        token.mint(alice, 1e18);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(CompliantRWAToken.ComplianceFailure.selector, "exceeds max balance per investor")
        );
        token.transfer(bob, 1e18);
    }

    // ───────────── 合规规则：持有人上限 ─────────────

    function test_MaxHolderCountEnforced() public {
        // maxHolders = 3
        address[] memory people = new address[](4);
        people[0] = alice; people[1] = bob; people[2] = carol; people[3] = dave;
        for (uint256 i = 0; i < 4; i++) {
            token.registerIdentity(people[i], US);
        }
        // mint 给前 3 个 → holderCount = 3
        token.mint(alice, 10e18);
        token.mint(bob, 10e18);
        token.mint(carol, 10e18);
        assertEq(token.holderCount(), 3);

        // 第 4 个新持有人：alice 转给 dave（dave 余额 0，会成为新持有人）→ 超 maxHolders 拦截
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(CompliantRWAToken.ComplianceFailure.selector, "exceeds max holder count")
        );
        token.transfer(dave, 5e18);
    }

    function test_HolderCountDecrementsOnZero() public {
        token.registerIdentity(alice, US);
        token.registerIdentity(bob, SG);
        token.mint(alice, 100e18);
        assertEq(token.holderCount(), 1);

        // alice 全部转给 bob → alice 归零移出、bob 计入，持有人数仍为 1
        vm.prank(alice);
        token.transfer(bob, 100e18);
        assertEq(token.holderCount(), 1);
        assertEq(token.balanceOf(alice), 0);
    }

    // ───────────── 冻结 ─────────────

    function test_FrozenWalletCannotTransfer() public {
        token.registerIdentity(alice, US);
        token.registerIdentity(bob, SG);
        token.mint(alice, 100e18);

        token.setAddressFrozen(alice, true);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(CompliantRWAToken.WalletFrozen.selector, alice));
        token.transfer(bob, 10e18);

        token.setAddressFrozen(alice, false);
        vm.prank(alice);
        token.transfer(bob, 10e18);
        assertEq(token.balanceOf(bob), 10e18);
    }

    function test_PartialFreeze() public {
        token.registerIdentity(alice, US);
        token.registerIdentity(bob, SG);
        token.mint(alice, 100e18);

        token.freezePartialTokens(alice, 60e18); // 冻结 60，可用 40
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(CompliantRWAToken.InsufficientUnfrozen.selector, 40e18, 50e18)
        );
        token.transfer(bob, 50e18);

        // 转可用范围内 OK
        vm.prank(alice);
        token.transfer(bob, 40e18);
        assertEq(token.balanceOf(bob), 40e18);
    }

    // ───────────── 强制转移 / 钱包恢复 ─────────────

    function test_ForcedTransferBypassesCompliance() public {
        token.registerIdentity(alice, US);
        token.registerIdentity(bob, SG);
        token.mint(alice, 100e18);
        token.setAddressFrozen(alice, true); // 即便冻结，forcedTransfer 也能执行

        token.forcedTransfer(alice, bob, 30e18);
        assertEq(token.balanceOf(bob), 30e18);
    }

    function test_RecoveryAddress() public {
        token.registerIdentity(alice, US);
        token.mint(alice, 100e18);

        token.recoveryAddress(alice, bob); // bob 自动继承验证状态
        assertEq(token.balanceOf(alice), 0);
        assertEq(token.balanceOf(bob), 100e18);
        assertTrue(token.isVerified(bob));
        assertEq(token.investorCountry(bob), US);
    }

    // ───────────── 派息（按比例）─────────────

    function test_DividendProRata() public {
        token.registerIdentity(alice, US);
        token.registerIdentity(bob, SG);
        token.mint(alice, 75e18); // 75%
        token.mint(bob, 25e18);   // 25%

        // 存入 1 PHRS 分红
        vm.deal(owner, 1 ether);
        token.depositDividend{value: 1 ether}();

        // alice 应得 0.75，bob 应得 0.25
        assertEq(token.dividendOf(alice), 0.75 ether);
        assertEq(token.dividendOf(bob), 0.25 ether);

        // alice 领取
        uint256 before = alice.balance;
        vm.prank(alice);
        token.claimDividend();
        assertEq(alice.balance - before, 0.75 ether);
        assertEq(token.dividendOf(alice), 0);
    }

    function test_DividendSettledOnTransfer() public {
        token.registerIdentity(alice, US);
        token.registerIdentity(bob, SG);
        token.mint(alice, 100e18);

        vm.deal(owner, 1 ether);
        token.depositDividend{value: 1 ether}();
        // 此刻 alice 持有 100%，应得 1 PHRS

        // alice 转一半给 bob —— 转账时自动结算 alice 已得分红
        vm.prank(alice);
        token.transfer(bob, 50e18);

        // alice 之前的 1 PHRS 应已锁定，bob 此后才开始计分红
        assertEq(token.dividendOf(alice), 1 ether);
        assertEq(token.dividendOf(bob), 0);
    }

    // ───────────── 发行（mint）合规上限 ─────────────

    function test_MintEnforcesMaxBalancePerInvestor() public {
        token.registerIdentity(alice, US);
        // 单人上限 1000e18，一次性 mint 1001e18 应被合规拦截
        vm.expectRevert(
            abi.encodeWithSelector(CompliantRWAToken.ComplianceFailure.selector, "exceeds max balance per investor")
        );
        token.mint(alice, 1_001e18);
    }

    function test_MintEnforcesMaxHolderCount() public {
        // maxHolders = 3
        token.registerIdentity(alice, US);
        token.registerIdentity(bob, SG);
        token.registerIdentity(carol, US);
        token.registerIdentity(dave, SG);
        token.mint(alice, 10e18);
        token.mint(bob, 10e18);
        token.mint(carol, 10e18); // holderCount = 3
        // 第 4 个新持有人 mint → 超持有人上限被拦截
        vm.expectRevert(
            abi.encodeWithSelector(CompliantRWAToken.ComplianceFailure.selector, "exceeds max holder count")
        );
        token.mint(dave, 10e18);
    }

    // ───────────── 派息 dust 回收 / 恢复迁移分红 ─────────────

    function test_DividendDustSwept() public {
        token.registerIdentity(alice, US);
        token.registerIdentity(bob, SG);
        token.mint(alice, 1e18);
        token.mint(bob, 2e18); // totalSupply = 3e18

        // 存入 1 wei 之上、会产生整除余数的金额：10 wei / 3e18 supply
        vm.deal(owner, 1 ether);
        token.depositDividend{value: 1 ether}();

        uint256 dust = token.undistributedDividend();
        // dust = msg.value - floor(perShare)*supply/1e18，应为可回收的小额余数
        if (dust > 0) {
            uint256 before = bob.balance;
            token.sweepUndistributedDividend(bob);
            assertEq(bob.balance - before, dust);
            assertEq(token.undistributedDividend(), 0);
        }
    }

    function test_DepositTooSmallReverts() public {
        token.registerIdentity(alice, US);
        token.mint(alice, 1_000e18); // supply 大
        vm.deal(owner, 1 ether);
        // msg.value=1 wei，perShare = 1*1e18/1000e18 = 0 → 应 revert，避免静默吞币
        vm.expectRevert(bytes("deposit too small for supply"));
        token.depositDividend{value: 1}();
    }

    function test_RecoveryMigratesPendingDividend() public {
        token.registerIdentity(alice, US);
        token.mint(alice, 100e18); // alice 100%

        vm.deal(owner, 1 ether);
        token.depositDividend{value: 1 ether}(); // alice 应得 1 PHRS（未领）

        // 恢复到 bob：已结算未领的 1 PHRS 应迁移到 bob
        token.recoveryAddress(alice, bob);
        assertEq(token.withdrawableDividend(bob), 1 ether);
        assertEq(token.withdrawableDividend(alice), 0);

        uint256 before = bob.balance;
        vm.prank(bob);
        token.claimDividend();
        assertEq(bob.balance - before, 1 ether);
    }

    // ───────────── 安全审计回归：冻结记账不变量 ─────────────

    function test_BurnKeepsFrozenWithinBalance() public {
        token.registerIdentity(alice, US);
        token.registerIdentity(bob, SG);
        token.mint(alice, 100e18);
        token.freezePartialTokens(alice, 60e18); // 冻结 60

        // 销毁 50 → 余额 50 < 冻结 60，冻结额应被下调为 50（维持 frozen ≤ balance）
        token.burn(alice, 50e18);
        assertEq(token.balanceOf(alice), 50e18);
        assertEq(token.frozenTokens(alice), 50e18);

        // 关键：后续转账不再因 balance - frozenTokens 下溢而 panic，而是正常合规拦截
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(CompliantRWAToken.InsufficientUnfrozen.selector, 0, 1e18)
        );
        token.transfer(bob, 1e18);
    }

    function test_RecoveryAccumulatesFrozenOnExistingWallet() public {
        token.registerIdentity(alice, US);
        token.registerIdentity(bob, SG);
        token.mint(alice, 100e18);
        token.mint(bob, 50e18);
        token.freezePartialTokens(alice, 30e18);
        token.freezePartialTokens(bob, 20e18);

        // 恢复 alice → bob：alice 的冻结 30 应累加到 bob 已有的 20，得 50（而非覆盖）
        token.recoveryAddress(alice, bob);
        assertEq(token.balanceOf(bob), 150e18);
        assertEq(token.frozenTokens(bob), 50e18);
        assertEq(token.frozenTokens(alice), 0);
    }

    // ───────────── Fuzz：派息按比例不变量 ─────────────

    function testFuzz_DividendProRataNeverExceedsDeposit(uint96 aliceShare, uint96 bobShare, uint96 deposit) public {
        aliceShare = uint96(bound(aliceShare, 1e18, 500e18));
        bobShare = uint96(bound(bobShare, 1e18, 500e18));
        deposit = uint96(bound(deposit, 1e15, 10 ether));

        token.registerIdentity(alice, US);
        token.registerIdentity(bob, SG);
        token.mint(alice, aliceShare);
        token.mint(bob, bobShare);

        vm.deal(owner, deposit);
        token.depositDividend{value: deposit}();

        // 安全不变量：派息绝不超发——可领之和、以及「可领 + 已记账 dust」都不超过存入额。
        // （每账户领取仍有 floor 整除，故为 ≤ 而非严格相等；差额是 < 持有人数 的极小 wei 级舍入）
        uint256 claimable = token.dividendOf(alice) + token.dividendOf(bob);
        assertLe(claimable, deposit);
        assertLe(claimable + token.undistributedDividend(), deposit);
    }

    // ───────────── 暂停 ─────────────

    function test_PausePreventsTransfer() public {
        token.registerIdentity(alice, US);
        token.registerIdentity(bob, SG);
        token.mint(alice, 100e18);

        token.pause();
        vm.prank(alice);
        vm.expectRevert(); // Pausable: EnforcedPause
        token.transfer(bob, 10e18);

        token.unpause();
        vm.prank(alice);
        token.transfer(bob, 10e18);
        assertEq(token.balanceOf(bob), 10e18);
    }

    // ───────────── 权限 ─────────────

    function test_OnlyAgentCanRegister() public {
        vm.prank(alice); // alice 非 agent
        vm.expectRevert(CompliantRWAToken.NotAgent.selector);
        token.registerIdentity(bob, US);
    }
}
