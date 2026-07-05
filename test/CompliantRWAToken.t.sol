// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {CompliantRWAToken} from "../src/CompliantRWAToken.sol";
import {DiligenceAttestationRegistry} from "../src/DiligenceAttestationRegistry.sol";

/**
 * @title CompliantRWAToken 冒烟测试
 * @notice 覆盖 ERC-3643 合规发行关键不变量 + 信任模型硬化：
 *         身份绑定恢复、双阶段恢复、mint attestation gate、角色分离。
 */
contract CompliantRWATokenTest is Test {
    CompliantRWAToken token;
    DiligenceAttestationRegistry attestation;

    address owner = address(this); // 部署者 = owner
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");
    address dave = makeAddr("dave");

    uint16 constant US = 840;
    uint16 constant SG = 702;
    bytes32 constant EVIDENCE_HASH = keccak256("diligence-green-evidence");
    bytes32 constant ASSET_FP = keccak256(abi.encode("MPF", "US", "permissioned_token"));

    function _id(address account) internal pure returns (bytes32) {
        return keccak256(abi.encode("identity", account));
    }

    function _register(address account, uint16 country) internal {
        token.registerIdentity(account, country, _id(account));
    }

    function _registerWithIdentity(address account, uint16 country, bytes32 identityId) internal {
        token.registerIdentity(account, country, identityId);
    }

    function _mintTo(address to, uint256 amount) internal {
        token.mint(to, amount, EVIDENCE_HASH);
    }

    function setUp() public {
        // maxHolders=3, maxBalancePerInvestor=1_000e18
        token = new CompliantRWAToken("Manhattan Property Fund", "MPF", 3, 1_000e18);
        attestation = new DiligenceAttestationRegistry();

        token.setDiligenceAttestationRegistry(address(attestation));
        attestation.attest(EVIDENCE_HASH, address(token), attestation.RATING_GREEN(), ASSET_FP);
    }

    // ───────────── attestation mint gate ─────────────

    function test_MintRevertsIfRegistryNotConfigured() public {
        CompliantRWAToken token2 = new CompliantRWAToken("Token 2", "TK2", 3, 1_000e18);
        token2.registerIdentity(alice, US, _id(alice));
        vm.expectRevert(CompliantRWAToken.DiligenceAttestationRegistryNotSet.selector);
        token2.mint(alice, 1e18, EVIDENCE_HASH);
    }

    function test_MintRevertsIfEvidenceNotAttested() public {
        _register(alice, US);
        bytes32 unknownEvidence = keccak256("unknown-evidence");
        vm.expectRevert(
            abi.encodeWithSelector(CompliantRWAToken.DiligenceNotAttested.selector, unknownEvidence)
        );
        token.mint(alice, 1e18, unknownEvidence);
    }

    // ───────────── 身份验证 ─────────────

    function test_MintRequiresVerifiedRecipient() public {
        vm.expectRevert(abi.encodeWithSelector(CompliantRWAToken.NotVerified.selector, alice));
        token.mint(alice, 100e18, EVIDENCE_HASH);

        _register(alice, US);
        _mintTo(alice, 100e18);
        assertEq(token.balanceOf(alice), 100e18);
        assertEq(token.holderCount(), 1);
    }

    function test_IsVerified() public {
        assertFalse(token.isVerified(alice));
        _register(alice, US);
        assertTrue(token.isVerified(alice));
        assertEq(token.investorCountry(alice), US);
        assertEq(token.investorIdentity(alice), _id(alice));
    }

    function test_BatchRegister() public {
        address[] memory addrs = new address[](2);
        uint16[] memory countries = new uint16[](2);
        bytes32[] memory identities = new bytes32[](2);
        addrs[0] = alice;
        addrs[1] = bob;
        countries[0] = US;
        countries[1] = SG;
        identities[0] = _id(alice);
        identities[1] = _id(bob);
        token.batchRegisterIdentity(addrs, countries, identities);
        assertTrue(token.isVerified(alice));
        assertTrue(token.isVerified(bob));
    }

    // ───────────── 受限转账（两道检查）─────────────

    function test_TransferRequiresVerifiedRecipient() public {
        _register(alice, US);
        _mintTo(alice, 100e18);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(CompliantRWAToken.NotVerified.selector, bob));
        token.transfer(bob, 10e18);

        _register(bob, SG);
        vm.prank(alice);
        assertTrue(token.transfer(bob, 10e18));
        assertEq(token.balanceOf(bob), 10e18);
    }

    function test_CanTransferPreview() public {
        _register(alice, US);
        _register(bob, SG);
        _mintTo(alice, 100e18);

        (bool ok, string memory reason) = token.canTransfer(alice, bob, 10e18);
        assertTrue(ok);
        assertEq(bytes(reason).length, 0);
    }

    // ───────────── 合规规则：单人上限 ─────────────

    function test_MaxBalancePerInvestorEnforced() public {
        _register(alice, US);
        _register(bob, SG);
        _mintTo(alice, 1_000e18);

        vm.prank(alice);
        assertTrue(token.transfer(bob, 1e18));

        vm.prank(alice);
        assertTrue(token.transfer(bob, 999e18));

        _mintTo(alice, 1e18);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(CompliantRWAToken.ComplianceFailure.selector, "exceeds max balance per investor")
        );
        token.transfer(bob, 1e18);
    }

    // ───────────── 合规规则：持有人上限 ─────────────

    function test_MaxHolderCountEnforced() public {
        address[] memory people = new address[](4);
        people[0] = alice;
        people[1] = bob;
        people[2] = carol;
        people[3] = dave;
        for (uint256 i = 0; i < 4; i++) {
            _register(people[i], US);
        }

        _mintTo(alice, 10e18);
        _mintTo(bob, 10e18);
        _mintTo(carol, 10e18);
        assertEq(token.holderCount(), 3);

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(CompliantRWAToken.ComplianceFailure.selector, "exceeds max holder count")
        );
        token.transfer(dave, 5e18);
    }

    function test_HolderCountDecrementsOnZero() public {
        _register(alice, US);
        _register(bob, SG);
        _mintTo(alice, 100e18);
        assertEq(token.holderCount(), 1);

        vm.prank(alice);
        assertTrue(token.transfer(bob, 100e18));
        assertEq(token.holderCount(), 1);
        assertEq(token.balanceOf(alice), 0);
    }

    // ───────────── 冻结 ─────────────

    function test_FrozenWalletCannotTransfer() public {
        _register(alice, US);
        _register(bob, SG);
        _mintTo(alice, 100e18);

        token.setAddressFrozen(alice, true);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(CompliantRWAToken.WalletFrozen.selector, alice));
        token.transfer(bob, 10e18);

        token.setAddressFrozen(alice, false);
        vm.prank(alice);
        assertTrue(token.transfer(bob, 10e18));
        assertEq(token.balanceOf(bob), 10e18);
    }

    function test_PartialFreeze() public {
        _register(alice, US);
        _register(bob, SG);
        _mintTo(alice, 100e18);

        token.freezePartialTokens(alice, 60e18);
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(CompliantRWAToken.InsufficientUnfrozen.selector, 40e18, 50e18)
        );
        token.transfer(bob, 50e18);

        vm.prank(alice);
        assertTrue(token.transfer(bob, 40e18));
        assertEq(token.balanceOf(bob), 40e18);
    }

    // ───────────── 强制转移 / 钱包恢复 ─────────────

    function test_ForcedTransferBypassesCompliance() public {
        _register(alice, US);
        _register(bob, SG);
        _mintTo(alice, 100e18);
        token.setAddressFrozen(alice, true);

        token.forcedTransfer(alice, bob, 30e18);
        assertEq(token.balanceOf(bob), 30e18);
    }

    function test_RecoveryAddressTwoStep() public {
        bytes32 identityId = keccak256("investor-1");
        _registerWithIdentity(alice, US, identityId);
        _registerWithIdentity(bob, US, identityId);
        _mintTo(alice, 100e18);

        bytes32 requestId = token.proposeRecoveryAddress(alice, bob, identityId);
        vm.warp(block.timestamp + token.recoveryDelay());
        token.executeRecoveryAddress(requestId);

        assertEq(token.balanceOf(alice), 0);
        assertEq(token.balanceOf(bob), 100e18);
        assertTrue(token.isVerified(bob));
        assertFalse(token.isVerified(alice));
        assertEq(token.investorCountry(bob), US);
        assertEq(token.investorIdentity(bob), identityId);
    }

    function test_RecoveryRejectsIdentityMismatch() public {
        bytes32 oldId = keccak256("id-old");
        bytes32 newId = keccak256("id-new");
        _registerWithIdentity(alice, US, oldId);
        _registerWithIdentity(bob, US, newId);
        _mintTo(alice, 100e18);

        vm.expectRevert(
            abi.encodeWithSelector(CompliantRWAToken.IdentityMismatch.selector, bob, oldId, newId)
        );
        token.proposeRecoveryAddress(alice, bob, oldId);
    }

    // ───────────── 派息（按比例）─────────────

    function test_DividendProRata() public {
        _register(alice, US);
        _register(bob, SG);
        _mintTo(alice, 75e18);
        _mintTo(bob, 25e18);

        vm.deal(owner, 1 ether);
        token.depositDividend{value: 1 ether}();

        assertEq(token.dividendOf(alice), 0.75 ether);
        assertEq(token.dividendOf(bob), 0.25 ether);

        uint256 before = alice.balance;
        vm.prank(alice);
        token.claimDividend();
        assertEq(alice.balance - before, 0.75 ether);
        assertEq(token.dividendOf(alice), 0);
    }

    function test_DividendSettledOnTransfer() public {
        _register(alice, US);
        _register(bob, SG);
        _mintTo(alice, 100e18);

        vm.deal(owner, 1 ether);
        token.depositDividend{value: 1 ether}();

        vm.prank(alice);
        assertTrue(token.transfer(bob, 50e18));
        assertEq(token.dividendOf(alice), 1 ether);
        assertEq(token.dividendOf(bob), 0);
    }

    // ───────────── 发行（mint）合规上限 ─────────────

    function test_MintEnforcesMaxBalancePerInvestor() public {
        _register(alice, US);
        vm.expectRevert(
            abi.encodeWithSelector(CompliantRWAToken.ComplianceFailure.selector, "exceeds max balance per investor")
        );
        token.mint(alice, 1_001e18, EVIDENCE_HASH);
    }

    function test_MintEnforcesMaxHolderCount() public {
        _register(alice, US);
        _register(bob, SG);
        _register(carol, US);
        _register(dave, SG);
        _mintTo(alice, 10e18);
        _mintTo(bob, 10e18);
        _mintTo(carol, 10e18);
        vm.expectRevert(
            abi.encodeWithSelector(CompliantRWAToken.ComplianceFailure.selector, "exceeds max holder count")
        );
        token.mint(dave, 10e18, EVIDENCE_HASH);
    }

    // ───────────── 派息 dust 回收 / 恢复迁移分红 ─────────────

    function test_DividendDustSwept() public {
        _register(alice, US);
        _register(bob, SG);
        _mintTo(alice, 1e18);
        _mintTo(bob, 2e18);

        vm.deal(owner, 1 ether);
        token.depositDividend{value: 1 ether}();

        uint256 dust = token.undistributedDividend();
        if (dust > 0) {
            uint256 before = bob.balance;
            token.sweepUndistributedDividend(bob);
            assertEq(bob.balance - before, dust);
            assertEq(token.undistributedDividend(), 0);
        }
    }

    function test_DepositTooSmallReverts() public {
        _register(alice, US);
        _mintTo(alice, 1_000e18);
        vm.deal(owner, 1 ether);
        vm.expectRevert(bytes("deposit too small for supply"));
        token.depositDividend{value: 1}();
    }

    function test_RecoveryMigratesPendingDividend() public {
        bytes32 identityId = keccak256("investor-1");
        _registerWithIdentity(alice, US, identityId);
        _registerWithIdentity(bob, US, identityId);
        _mintTo(alice, 100e18);

        vm.deal(owner, 1 ether);
        token.depositDividend{value: 1 ether}();

        bytes32 requestId = token.proposeRecoveryAddress(alice, bob, identityId);
        vm.warp(block.timestamp + token.recoveryDelay());
        token.executeRecoveryAddress(requestId);

        assertEq(token.withdrawableDividend(bob), 1 ether);
        assertEq(token.withdrawableDividend(alice), 0);

        uint256 before = bob.balance;
        vm.prank(bob);
        token.claimDividend();
        assertEq(bob.balance - before, 1 ether);
    }

    // ───────────── 安全审计回归：冻结记账不变量 ─────────────

    function test_BurnKeepsFrozenWithinBalance() public {
        _register(alice, US);
        _register(bob, SG);
        _mintTo(alice, 100e18);
        token.freezePartialTokens(alice, 60e18);

        token.burn(alice, 50e18);
        assertEq(token.balanceOf(alice), 50e18);
        assertEq(token.frozenTokens(alice), 50e18);

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(CompliantRWAToken.InsufficientUnfrozen.selector, 0, 1e18)
        );
        token.transfer(bob, 1e18);
    }

    function test_RecoveryAccumulatesFrozenOnExistingWallet() public {
        bytes32 identityId = keccak256("investor-1");
        _registerWithIdentity(alice, US, identityId);
        _registerWithIdentity(bob, SG, identityId);
        _mintTo(alice, 100e18);
        _mintTo(bob, 50e18);
        token.freezePartialTokens(alice, 30e18);
        token.freezePartialTokens(bob, 20e18);

        bytes32 requestId = token.proposeRecoveryAddress(alice, bob, identityId);
        vm.warp(block.timestamp + token.recoveryDelay());
        token.executeRecoveryAddress(requestId);

        assertEq(token.balanceOf(bob), 150e18);
        assertEq(token.frozenTokens(bob), 50e18);
        assertEq(token.frozenTokens(alice), 0);
    }

    // ───────────── Fuzz：派息按比例不变量 ─────────────

    function testFuzz_DividendProRataNeverExceedsDeposit(
        uint96 aliceShare,
        uint96 bobShare,
        uint96 deposit
    ) public {
        aliceShare = uint96(bound(aliceShare, 1e18, 500e18));
        bobShare = uint96(bound(bobShare, 1e18, 500e18));
        deposit = uint96(bound(deposit, 1e15, 10 ether));

        _register(alice, US);
        _register(bob, SG);
        _mintTo(alice, aliceShare);
        _mintTo(bob, bobShare);

        vm.deal(owner, deposit);
        token.depositDividend{value: deposit}();

        uint256 claimable = token.dividendOf(alice) + token.dividendOf(bob);
        assertLe(claimable, deposit);
        assertLe(claimable + token.undistributedDividend(), deposit);
    }

    // ───────────── 暂停 ─────────────

    function test_PausePreventsTransfer() public {
        _register(alice, US);
        _register(bob, SG);
        _mintTo(alice, 100e18);

        token.pause();
        vm.prank(alice);
        vm.expectRevert(); // Pausable: EnforcedPause
        token.transfer(bob, 10e18);

        token.unpause();
        vm.prank(alice);
        assertTrue(token.transfer(bob, 10e18));
        assertEq(token.balanceOf(bob), 10e18);
    }

    // ───────────── 权限 ─────────────

    function test_OnlyAgentCanRegister() public {
        vm.prank(alice);
        vm.expectRevert(CompliantRWAToken.NotAgent.selector);
        token.registerIdentity(bob, US, _id(bob));
    }
}
