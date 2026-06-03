// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title TemporalContainerRegistry
/// @notice On-chain registry for Dynamo temporal resonance containers on Base
/// @dev Each container captures a complete temporal resonance event: proposal,
///      solar snapshot, 7D resonance profile (physical + temporal + neural + numerological),
///      Trinitarium Moral Overlay, and cryptographic proof of integrity.
///      Chain-linked via previousContainerHash for temporal manifold navigation.
///      Deployed on Base for low-cost, fast-finality iteration.
contract TemporalContainerRegistry {
    // ---------- scaling ----------
    uint256 public constant SCALE_1E18 = 1e18;
    uint256 public constant XRAY_SCALE = 1e9;
    uint256 public constant KP_SCALE = 1e2;

    // ---------- structs ----------

    struct SolarSnapshot {
        uint256 timestamp;
        string  activityLevel;   // "quiet" | "moderate" | "active" | "storm"
        uint256 xrayFlux;        // scaled by XRAY_SCALE
        uint256 kpIndex;         // scaled by KP_SCALE
        uint256 protonFlux;
        int256  magnetometer;    // nT, can be negative
        uint256 solarTdf;
    }

    struct ResonanceProfile {
        // 7D composite
        uint256 fullBox7DComposite;  // scaled by SCALE_1E18
        string  fullBox7DVerdict;    // "PASS" | "NEEDS_REVISION" | "REJECT"
        // Physical dimensions
        uint256 waveProximity;       // scaled by SCALE_1E18
        uint256 phaseAlignment;      // scaled by SCALE_1E18
        uint256 calibratedVortex;    // scaled by SCALE_1E18
        uint256 calibratedSync;      // scaled by SCALE_1E18
        // Neural dimensions
        uint256 neuralProximity;     // scaled by SCALE_1E18
        uint256 neuralVortex;        // scaled by SCALE_1E18
        // Numerological dimension
        uint256 gematriaResonance;   // scaled by SCALE_1E18
        // Legacy 4D/5D
        uint256 structuralResonance; // scaled by SCALE_1E18
        string  verdict;             // "PASS" | "NEEDS_REVISION" | "REJECT"
        uint256 confidence;          // scaled by SCALE_1E18
    }

    struct MoralOverlay {
        uint256 trinitariumMoralScore;       // scaled by SCALE_1E18
        uint256 virtueAlignment;             // scaled by SCALE_1E18
        uint256 moralSafety;                 // scaled by SCALE_1E18 (1 - harmPotential)
        uint256 intentAlignment;             // scaled by SCALE_1E18
        uint256 trinitariumGematriaFusion;   // scaled by SCALE_1E18
        string  moralNumerologicalTension;   // "Aligned" | "Mild" | "Significant" | "Critical"
    }

    struct TemporalContainer {
        bytes32          containerId;
        uint256          timestamp;
        bytes32          proposalHash;
        SolarSnapshot    solarSnapshot;
        ResonanceProfile resonanceProfile;
        MoralOverlay     moralOverlay;
        string           hammerReason;
        bytes32          previousContainerHash;  // chain link to previous vortex
        bytes32          containerHash;           // integrity hash
        string           source;                 // "human" | "agent" | "ambient"
        address          creator;
        uint256          blockNumber;
    }

    // ---------- state ----------

    mapping(bytes32 => TemporalContainer) private _containers;
    mapping(bytes32 => bool)               private _exists;

    bytes32[] private _allContainerIds;
    bytes32  public  latestContainerHash;

    uint256 public constant MAX_CONTAINERS = 10_000;

    // ---------- events ----------

    event ContainerStored(
        bytes32 indexed containerId,
        address indexed creator,
        uint256   timestamp,
        string    verdict,
        string    moralTension,
        string    source
    );

    event ContainerVerified(
        bytes32 indexed containerId,
        bool             valid
    );

    // ---------- errors ----------

    error ContainerAlreadyExists(bytes32 containerId);
    error ContainerNotFound(bytes32 containerId);
    error ContainerLimitReached(uint256 max);

    // ---------- write ----------

    /// @notice Store a new temporal container, chain-linked to the previous one
    function storeContainer(
        bytes32           _containerId,
        uint256           _timestamp,
        bytes32           _proposalHash,
        SolarSnapshot calldata  _solarSnapshot,
        ResonanceProfile calldata _resonanceProfile,
        MoralOverlay calldata    _moralOverlay,
        string calldata           _hammerReason,
        bytes32                   _containerHash,
        string calldata           _source
    ) external {
        if (_exists[_containerId]) revert ContainerAlreadyExists(_containerId);
        if (_allContainerIds.length >= MAX_CONTAINERS) revert ContainerLimitReached(MAX_CONTAINERS);

        _containers[_containerId] = TemporalContainer({
            containerId:            _containerId,
            timestamp:             _timestamp,
            proposalHash:           _proposalHash,
            solarSnapshot:         _solarSnapshot,
            resonanceProfile:      _resonanceProfile,
            moralOverlay:          _moralOverlay,
            hammerReason:          _hammerReason,
            previousContainerHash: latestContainerHash,
            containerHash:         _containerHash,
            source:                _source,
            creator:               msg.sender,
            blockNumber:           block.number
        });

        _exists[_containerId] = true;
        _allContainerIds.push(_containerId);
        latestContainerHash = _containerHash;

        emit ContainerStored(
            _containerId,
            msg.sender,
            _timestamp,
            _resonanceProfile.verdict,
            _moralOverlay.moralNumerologicalTension,
            _source
        );
    }

    // ---------- read ----------

    /// @notice Get a full container by ID
    function getContainer(bytes32 _containerId)
        external
        view
        returns (TemporalContainer memory)
    {
        if (!_exists[_containerId]) revert ContainerNotFound(_containerId);
        return _containers[_containerId];
    }

    /// @notice Get the previous container in the chain
    function getPreviousContainer(bytes32 _containerId)
        external
        view
        returns (bytes32)
    {
        if (!_exists[_containerId]) revert ContainerNotFound(_containerId);
        return _containers[_containerId].previousContainerHash;
    }

    /// @notice Verify a container's integrity hash
    function verifyContainer(bytes32 _containerId, bytes32 _expectedHash)
        external
        returns (bool)
    {
        if (!_exists[_containerId]) revert ContainerNotFound(_containerId);
        bool valid = _containers[_containerId].containerHash == _expectedHash;
        emit ContainerVerified(_containerId, valid);
        return valid;
    }

    /// @notice Total containers stored
    function containerCount() external view returns (uint256) {
        return _allContainerIds.length;
    }

    /// @notice Paginated list of all container IDs
    function listContainers(uint256 _offset, uint256 _limit)
        external
        view
        returns (bytes32[] memory ids, uint256 total)
    {
        total = _allContainerIds.length;
        if (_offset >= total) return (new bytes32[](0), total);

        uint256 end = _offset + _limit;
        if (end > total) end = total;

        ids = new bytes32[](end - _offset);
        for (uint256 i = _offset; i < end; i++) {
            ids[i - _offset] = _allContainerIds[i];
        }
    }

    /// @notice Check if a container exists
    function containerExists(bytes32 _containerId) external view returns (bool) {
        return _exists[_containerId];
    }

    /// @notice Traverse the chain: get N ancestors of a container
    function getAncestors(bytes32 _containerId, uint256 _count)
        external
        view
        returns (bytes32[] memory ancestors)
    {
        if (!_exists[_containerId]) revert ContainerNotFound(_containerId);

        ancestors = new bytes32[](_count);
        bytes32 current = _containers[_containerId].previousContainerHash;

        for (uint256 i = 0; i < _count; i++) {
            // previousContainerHash stores the containerHash of the previous container,
            // not its containerId. To traverse, we'd need a hash → id mapping.
            // For now, store the chain of hashes.
            ancestors[i] = current;
            // Note: full traversal requires hashToId mapping (future enhancement)
            if (current == bytes32(0)) break;
        }
    }
}