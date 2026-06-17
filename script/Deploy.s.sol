// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {CompliantRWAToken} from "../src/CompliantRWAToken.sol";

/**
 * 部署到 Pharos atlantic 测试网：
 *   export PHAROS_RPC_URL=https://atlantic.dplabs-internal.com
 *   forge script script/Deploy.s.sol:Deploy --rpc-url $PHAROS_RPC_URL \
 *     --private-key $PRIVATE_KEY --broadcast --slow
 *
 * 可用环境变量覆盖参数（否则用默认）：
 *   ASSET_NAME / ASSET_SYMBOL / MAX_HOLDERS / MAX_BALANCE
 */
contract Deploy is Script {
    function run() external returns (CompliantRWAToken token) {
        string memory name_ = vm.envOr("ASSET_NAME", string("Manhattan Property Fund"));
        string memory symbol_ = vm.envOr("ASSET_SYMBOL", string("MPF"));
        uint256 maxHolders = vm.envOr("MAX_HOLDERS", uint256(100));
        uint256 maxBalance = vm.envOr("MAX_BALANCE", uint256(1_000_000 ether));

        vm.startBroadcast();
        token = new CompliantRWAToken(name_, symbol_, maxHolders, maxBalance);
        vm.stopBroadcast();

        console.log("CompliantRWAToken deployed at:", address(token));
        console.log("  name:", name_);
        console.log("  symbol:", symbol_);
        console.log("  maxHolders:", maxHolders);
        console.log("  maxBalancePerInvestor:", maxBalance);
    }
}
