// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MockOFACRegistry — testnet sanctions oracle for HatchFi diligence drills
/// @notice NOT production OFAC integration. Pre-seeds public sample addresses for cast call drills.
contract MockOFACRegistry {
    address public owner;
    mapping(address => bool) private sanctionedAddresses;

    constructor() {
        owner = msg.sender;
        // Public sample used in diligence RED demos (see assets/knowledge/sanctions_sample.json)
        sanctionedAddresses[0x7F367cC41522cE07553e823bf3be79A889DEbe1B] = true;
    }

    function isSanctioned(address wallet) external view returns (bool) {
        return sanctionedAddresses[wallet];
    }

    function setSanctioned(address wallet, bool status) external {
        require(msg.sender == owner, "not owner");
        sanctionedAddresses[wallet] = status;
    }
}
