// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {DiligenceAttestationRegistry} from "../src/DiligenceAttestationRegistry.sol";
import {AssetTokenizationRegistry} from "../src/AssetTokenizationRegistry.sol";

contract DiligenceAttestationTest is Test {
    DiligenceAttestationRegistry attestation;
    AssetTokenizationRegistry assets;

    address issuer = makeAddr("issuer");
    address tokenA = makeAddr("tokenA");
    address tokenB = makeAddr("tokenB");

    bytes32 constant EVIDENCE_HASH = keccak256("canonical-evidence-v1");
    bytes32 constant ASSET_FP = keccak256(abi.encode("MPF-001", "US", "permissioned_token"));

    function setUp() public {
        attestation = new DiligenceAttestationRegistry();
        assets = new AssetTokenizationRegistry();
    }

    function test_AttestGreen() public {
        attestation.attest(EVIDENCE_HASH, issuer, attestation.RATING_GREEN(), ASSET_FP);

        DiligenceAttestationRegistry.Attestation memory a = attestation.latestAttestation(issuer);
        assertEq(a.evidenceHash, EVIDENCE_HASH);
        assertEq(a.rating, attestation.RATING_GREEN());
        assertTrue(attestation.isGreen(EVIDENCE_HASH));
        assertTrue(attestation.isPassable(EVIDENCE_HASH));
    }

    function test_AttestYellowIsPassableNotGreen() public {
        bytes32 hash = keccak256("yellow-bundle");
        attestation.attest(hash, issuer, attestation.RATING_YELLOW(), ASSET_FP);

        assertFalse(attestation.isGreen(hash));
        assertTrue(attestation.isPassable(hash));
    }

    function test_RevertAttestRed() public {
        vm.expectRevert(DiligenceAttestationRegistry.RedRatingNotAttestable.selector);
        attestation.attest(EVIDENCE_HASH, issuer, 0, ASSET_FP);
    }

    function test_NonRegistrarCannotAttest() public {
        vm.prank(issuer);
        vm.expectRevert(DiligenceAttestationRegistry.NotRegistrar.selector);
        attestation.attest(EVIDENCE_HASH, issuer, 2, ASSET_FP);
    }

    function test_RegisterAsset() public {
        assets.registerAsset(ASSET_FP, tokenA);
        assertEq(assets.tokenForAsset(ASSET_FP), tokenA);
    }

    function test_RevertDuplicateAssetDifferentToken() public {
        assets.registerAsset(ASSET_FP, tokenA);
        vm.expectRevert(
            abi.encodeWithSelector(AssetTokenizationRegistry.AssetAlreadyTokenized.selector, ASSET_FP, tokenA)
        );
        assets.registerAsset(ASSET_FP, tokenB);
    }

    function test_IdempotentRegisterSameToken() public {
        assets.registerAsset(ASSET_FP, tokenA);
        assets.registerAsset(ASSET_FP, tokenA);
        assertEq(assets.tokenForAsset(ASSET_FP), tokenA);
    }

    /// @dev Cross-language golden: must match eval/evidence_hash_golden.json (Python + cast)
    function test_AssetFingerprintGoldenMpf() public pure {
        bytes32 fp = keccak256(abi.encode("MPF", "US", "permissioned_token"));
        assertEq(fp, 0xe8d343f2ca60abadc7ac491a9272fa3b4a19eadfe82629924c4d52794e4c65f3);
    }

    /// @dev Canonical JSON from eval/evidence_hash_fixture.json — same bytes as evidence_hash_lib.py
    function test_EvidenceHashGoldenFixture() public pure {
        string memory canon =
            '[{"check":"balance","cmd":"cast balance 0xA54A3C2766a80d3AFe7C4Bf00D5bcfF9e1892bc4 --rpc-url $RPC","flag":"ok","infer":"\xe6\x9c\x89\xe4\xbd\x99\xe9\xa2\x9d","result":">0"},{"check":"denylist","cmd":"compare state.config.denylist[]","flag":"ok","infer":"\xe7\x9b\xae\xe6\xa0\x87\xe4\xb8\x8d\xe5\x9c\xa8\xe7\xa6\x81\xe6\x8a\x95\xe5\x90\x8d\xe5\x8d\x95","result":"miss"},{"check":"is_contract","cmd":"cast code 0xA54A3C2766a80d3AFe7C4Bf00D5bcfF9e1892bc4 --rpc-url $RPC","flag":"ok","infer":"EOA","result":"0x"}]';
        bytes32 h = keccak256(bytes(canon));
        assertEq(h, 0xadd0e6f2a56877d9c5bcc383e7a7d4a5aeab5fe49c2701873d3e49e0dbf18054);
    }
}
