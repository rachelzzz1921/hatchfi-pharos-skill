// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {DiligenceAttestationRegistry} from "../src/DiligenceAttestationRegistry.sol";
import {AssetTokenizationRegistry} from "../src/AssetTokenizationRegistry.sol";

/**
 * Deploy diligence attestation + asset tokenization registries to Pharos Atlantic:
 *   export PHAROS_RPC_URL=https://atlantic.dplabs-internal.com
 *   forge script script/DeployAttestation.s.sol:DeployAttestation --rpc-url $PHAROS_RPC_URL \
 *     --private-key $PRIVATE_KEY --broadcast --slow
 */
contract DeployAttestation is Script {
    function run()
        external
        returns (DiligenceAttestationRegistry attestationRegistry, AssetTokenizationRegistry assetRegistry)
    {
        vm.startBroadcast();
        attestationRegistry = new DiligenceAttestationRegistry();
        assetRegistry = new AssetTokenizationRegistry();
        vm.stopBroadcast();

        console.log("DiligenceAttestationRegistry:", address(attestationRegistry));
        console.log("AssetTokenizationRegistry:", address(assetRegistry));
    }
}
