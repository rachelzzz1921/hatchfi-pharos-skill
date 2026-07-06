// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title DiligenceAttestationRegistry — on-chain diligence conclusion attestations (hash only, no PII)
/// @notice Records evidence-bundle hashes after deterministic rating and gates mint via isPassableFor.
/// @dev Attestations expire (validUntil) and can be revoked, so a stale GREEN hash cannot silently gate
///      future mints; isPassableFor additionally binds an attestation to a specific recipient.
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
        uint64 validUntil;
        address registrar;
    }

    /// @notice How long a fresh attestation stays passable. Owner-tunable.
    uint64 public validityWindow = 30 days;

    mapping(address => bool) private _registrars;
    mapping(address => Attestation) private _latestByTarget;
    mapping(bytes32 => Attestation) private _byEvidenceHash;
    mapping(bytes32 => bool) private _revoked;

    event RegistrarAdded(address indexed registrar);
    event RegistrarRemoved(address indexed registrar);
    event ValidityWindowUpdated(uint64 previousWindow, uint64 newWindow);
    event DiligenceAttested(
        address indexed target,
        bytes32 indexed evidenceHash,
        uint8 rating,
        bytes32 assetFingerprint,
        uint64 timestamp,
        uint64 validUntil,
        address indexed registrar
    );
    event AttestationRevoked(bytes32 indexed evidenceHash, address indexed target, address indexed registrar);

    error NotRegistrar();
    error InvalidRating();
    error RedRatingNotAttestable();
    error UnknownAttestation();

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

    /// @notice Set how long fresh attestations stay passable.
    function setValidityWindow(uint64 newWindow) external onlyOwner {
        emit ValidityWindowUpdated(validityWindow, newWindow);
        validityWindow = newWindow;
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
        uint64 validUntil = ts + validityWindow;
        Attestation memory a = Attestation({
            evidenceHash: evidenceHash,
            target: target,
            rating: rating,
            assetFingerprint: assetFingerprint,
            timestamp: ts,
            validUntil: validUntil,
            registrar: msg.sender
        });

        _latestByTarget[target] = a;
        _byEvidenceHash[evidenceHash] = a;
        _revoked[evidenceHash] = false; // re-attesting clears a prior revocation

        emit DiligenceAttested(target, evidenceHash, rating, assetFingerprint, ts, validUntil, msg.sender);
    }

    /// @notice Revoke an attestation — a re-screen that flips the conclusion has on-chain teeth.
    function revoke(bytes32 evidenceHash) external onlyRegistrar {
        Attestation memory a = _byEvidenceHash[evidenceHash];
        if (a.evidenceHash == bytes32(0)) revert UnknownAttestation();
        _revoked[evidenceHash] = true;
        emit AttestationRevoked(evidenceHash, a.target, msg.sender);
    }

    function isRevoked(bytes32 evidenceHash) external view returns (bool) {
        return _revoked[evidenceHash];
    }

    function latestAttestation(address target) external view returns (Attestation memory) {
        return _latestByTarget[target];
    }

    function attestationByHash(bytes32 evidenceHash) external view returns (Attestation memory) {
        return _byEvidenceHash[evidenceHash];
    }

    function _live(Attestation memory a, bytes32 evidenceHash) private view returns (bool) {
        return a.evidenceHash != bytes32(0) && !_revoked[evidenceHash] && block.timestamp <= a.validUntil;
    }

    /// @notice True when a live (non-revoked, non-expired) attestation exists and rating is GREEN.
    function isGreen(bytes32 evidenceHash) external view returns (bool) {
        Attestation memory a = _byEvidenceHash[evidenceHash];
        return _live(a, evidenceHash) && a.rating == RATING_GREEN;
    }

    /// @notice True when a live attestation exists and passed the gate (GREEN or YELLOW).
    function isPassable(bytes32 evidenceHash) external view returns (bool) {
        Attestation memory a = _byEvidenceHash[evidenceHash];
        return _live(a, evidenceHash) && a.rating >= RATING_YELLOW;
    }

    /// @notice Passable AND bound to `target` — the mint gate the token uses so a hash attested for
    ///         one recipient cannot unlock a mint to another.
    function isPassableFor(bytes32 evidenceHash, address target) external view returns (bool) {
        Attestation memory a = _byEvidenceHash[evidenceHash];
        return _live(a, evidenceHash) && a.rating >= RATING_YELLOW && a.target == target;
    }
}
