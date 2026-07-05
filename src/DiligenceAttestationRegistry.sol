// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title DiligenceAttestationRegistry — on-chain diligence conclusion attestations (hash only, no PII)
/// @notice Records evidence-bundle hashes after deterministic rating. Does NOT gate mint in Phase 1.
contract DiligenceAttestationRegistry is Ownable {
    uint8 public constant RATING_RED = 0;
    uint8 public constant RATING_YELLOW = 1;
    uint8 public constant RATING_GREEN = 2;

    struct Attestation {
        bytes32 evidenceHash;
        address target;
        uint8 rating;
        bytes32 assetFingerprint;
        uint64 timestamp;
        address registrar;
    }

    mapping(address => bool) private _registrars;
    mapping(address => Attestation) private _latestByTarget;
    mapping(bytes32 => Attestation) private _byEvidenceHash;

    event RegistrarAdded(address indexed registrar);
    event RegistrarRemoved(address indexed registrar);
    event DiligenceAttested(
        address indexed target,
        bytes32 indexed evidenceHash,
        uint8 rating,
        bytes32 assetFingerprint,
        uint64 timestamp,
        address indexed registrar
    );

    error NotRegistrar();
    error InvalidRating();
    error RedRatingNotAttestable();

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

    /// @notice Record a diligence conclusion. RED ratings are rejected — do not attest failed gates.
    function attest(bytes32 evidenceHash, address target, uint8 rating, bytes32 assetFingerprint)
        external
        onlyRegistrar
    {
        if (rating > RATING_GREEN) revert InvalidRating();
        if (rating == RATING_RED) revert RedRatingNotAttestable();
        if (evidenceHash == bytes32(0)) revert InvalidRating();

        uint64 ts = uint64(block.timestamp);
        Attestation memory a = Attestation({
            evidenceHash: evidenceHash,
            target: target,
            rating: rating,
            assetFingerprint: assetFingerprint,
            timestamp: ts,
            registrar: msg.sender
        });

        _latestByTarget[target] = a;
        _byEvidenceHash[evidenceHash] = a;

        emit DiligenceAttested(target, evidenceHash, rating, assetFingerprint, ts, msg.sender);
    }

    function latestAttestation(address target) external view returns (Attestation memory) {
        return _latestByTarget[target];
    }

    function attestationByHash(bytes32 evidenceHash) external view returns (Attestation memory) {
        return _byEvidenceHash[evidenceHash];
    }

    /// @notice True when attestation exists and rating is GREEN (Phase 2 strict mint gate).
    function isGreen(bytes32 evidenceHash) external view returns (bool) {
        Attestation memory a = _byEvidenceHash[evidenceHash];
        return a.evidenceHash != bytes32(0) && a.rating == RATING_GREEN;
    }

    /// @notice True when attestation exists and rating is GREEN or YELLOW (passed gate).
    function isPassable(bytes32 evidenceHash) external view returns (bool) {
        Attestation memory a = _byEvidenceHash[evidenceHash];
        return a.evidenceHash != bytes32(0) && a.rating >= RATING_YELLOW;
    }
}
