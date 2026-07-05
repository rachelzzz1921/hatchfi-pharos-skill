// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title AssetTokenizationRegistry — maps underlying asset fingerprints to token contracts
/// @notice Prevents duplicate tokenization within this registry scope (ecosystem-level, not global land registry).
contract AssetTokenizationRegistry is Ownable {
    mapping(address => bool) private _registrars;
    mapping(bytes32 => address) private _tokenByAsset;

    event RegistrarAdded(address indexed registrar);
    event RegistrarRemoved(address indexed registrar);
    event AssetRegistered(bytes32 indexed assetFingerprint, address indexed token, address indexed registrar);

    error NotRegistrar();
    error AssetAlreadyTokenized(bytes32 assetFingerprint, address existingToken);
    error ZeroToken();
    error ZeroFingerprint();

    modifier onlyRegistrar() {
        if (!_registrars[msg.sender] && msg.sender != owner()) revert NotRegistrar();
        _;
    }

    constructor() Ownable(msg.sender) {
        _registrars[msg.sender] = true;
        emit RegistrarAdded(msg.sender);
    }

    function addRegistrar(address registrar) external onlyOwner {
        _registrars[registrar] = true;
        emit RegistrarAdded(registrar);
    }

    function removeRegistrar(address registrar) external onlyOwner {
        _registrars[registrar] = false;
        emit RegistrarRemoved(registrar);
    }

    function isRegistrar(address account) external view returns (bool) {
        return _registrars[account] || account == owner();
    }

    /// @notice Register a token for an asset fingerprint. Reverts if another token already holds this fingerprint.
    function registerAsset(bytes32 assetFingerprint, address token) external onlyRegistrar {
        if (assetFingerprint == bytes32(0)) revert ZeroFingerprint();
        if (token == address(0)) revert ZeroToken();

        address existing = _tokenByAsset[assetFingerprint];
        if (existing != address(0) && existing != token) {
            revert AssetAlreadyTokenized(assetFingerprint, existing);
        }

        _tokenByAsset[assetFingerprint] = token;
        emit AssetRegistered(assetFingerprint, token, msg.sender);
    }

    function tokenForAsset(bytes32 assetFingerprint) external view returns (address) {
        return _tokenByAsset[assetFingerprint];
    }
}
