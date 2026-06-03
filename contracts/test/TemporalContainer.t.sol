// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../TemporalContainer.sol";

contract TemporalContainerTest is Test {
    TemporalContainerRegistry registry;

    bytes32 constant CONTAINER_ID = keccak256("test-container-1");
    bytes32 constant CONTAINER_ID_2 = keccak256("test-container-2");
    uint256 constant TIMESTAMP = 1717200000;
    bytes32 constant PROPOSAL_HASH = keccak256("proposal text");
    bytes32 constant CONTAINER_HASH = keccak256("full container json");

    TemporalContainerRegistry.SolarSnapshot solarSnapshot;
    TemporalContainerRegistry.ResonanceProfile resonanceProfile;
    TemporalContainerRegistry.MoralOverlay moralOverlay;

    function setUp() public {
        registry = new TemporalContainerRegistry();

        solarSnapshot = TemporalContainerRegistry.SolarSnapshot({
            timestamp:     TIMESTAMP,
            activityLevel: "moderate",
            xrayFlux:      12300000,
            kpIndex:       320,
            protonFlux:    1240,
            magnetometer:  -124,
            solarTdf:      5781045929080
        });

        resonanceProfile = TemporalContainerRegistry.ResonanceProfile({
            fullBox7DComposite:  0.82e18,
            fullBox7DVerdict:    "PASS",
            waveProximity:       0.75e18,
            phaseAlignment:      0.88e18,
            calibratedVortex:    0.71e18,
            calibratedSync:      0.79e18,
            neuralProximity:     0.84e18,
            neuralVortex:        0.77e18,
            gematriaResonance:   0.79e18,
            structuralResonance: 0.98e18,
            verdict:             "PASS",
            confidence:          0.93e18
        });

        moralOverlay = TemporalContainerRegistry.MoralOverlay({
            trinitariumMoralScore:       0.68e18,
            virtueAlignment:             0.72e18,
            moralSafety:                 0.85e18,
            intentAlignment:             0.84e18,
            trinitariumGematriaFusion:   0.54e18,
            moralNumerologicalTension:   "Aligned"
        });
    }

    function _storeContainer(bytes32 id, string memory source) internal {
        bytes32 hash = keccak256(abi.encode(id));
        registry.storeContainer(
            id,
            TIMESTAMP,
            PROPOSAL_HASH,
            solarSnapshot,
            resonanceProfile,
            moralOverlay,
            "Strong resonance with current solar conditions",
            hash,
            source
        );
    }

    function test_StoreContainer() public {
        _storeContainer(CONTAINER_ID, "human");
        assertTrue(registry.containerExists(CONTAINER_ID));
    }

    function test_GetContainer() public {
        _storeContainer(CONTAINER_ID, "human");

        TemporalContainerRegistry.TemporalContainer memory c = registry.getContainer(CONTAINER_ID);
        assertEq(c.containerId, CONTAINER_ID);
        assertEq(c.timestamp, TIMESTAMP);
        assertEq(c.proposalHash, PROPOSAL_HASH);
        assertEq(c.resonanceProfile.verdict, "PASS");
        assertEq(c.moralOverlay.moralNumerologicalTension, "Aligned");
        assertEq(c.source, "human");
        assertEq(c.creator, address(this));
    }

    function test_MoralOverlayFields() public {
        _storeContainer(CONTAINER_ID, "agent");

        TemporalContainerRegistry.TemporalContainer memory c = registry.getContainer(CONTAINER_ID);
        assertEq(c.moralOverlay.trinitariumMoralScore, 0.68e18);
        assertEq(c.moralOverlay.virtueAlignment, 0.72e18);
        assertEq(c.moralOverlay.moralSafety, 0.85e18);
        assertEq(c.moralOverlay.intentAlignment, 0.84e18);
        assertEq(c.moralOverlay.trinitariumGematriaFusion, 0.54e18);
    }

    function test_ChainLinking() public {
        _storeContainer(CONTAINER_ID, "human");

        bytes32 firstHash = registry.latestContainerHash();

        _storeContainer(CONTAINER_ID_2, "ambient");

        TemporalContainerRegistry.TemporalContainer memory c2 = registry.getContainer(CONTAINER_ID_2);
        assertEq(c2.previousContainerHash, firstHash);
    }

    function test_SourceTypes() public {
        _storeContainer(CONTAINER_ID, "human");
        assertEq(registry.getContainer(CONTAINER_ID).source, "human");

        bytes32 id2 = keccak256("agent-container");
        _storeContainer(id2, "agent");
        assertEq(registry.getContainer(id2).source, "agent");

        bytes32 id3 = keccak256("ambient-container");
        _storeContainer(id3, "ambient");
        assertEq(registry.getContainer(id3).source, "ambient");
    }

    function test_RevertOnDuplicate() public {
        _storeContainer(CONTAINER_ID, "human");

        vm.expectRevert(
            abi.encodeWithSelector(
                TemporalContainerRegistry.ContainerAlreadyExists.selector,
                CONTAINER_ID
            )
        );
        _storeContainer(CONTAINER_ID, "human");
    }

    function test_RevertOnNotFound() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                TemporalContainerRegistry.ContainerNotFound.selector,
                CONTAINER_ID
            )
        );
        registry.getContainer(CONTAINER_ID);
    }

    function test_VerifyContainer() public {
        bytes32 hash = keccak256(abi.encode(CONTAINER_ID));
        _storeContainer(CONTAINER_ID, "human");

        assertTrue(registry.verifyContainer(CONTAINER_ID, hash));
        assertFalse(registry.verifyContainer(CONTAINER_ID, keccak256("wrong hash")));
    }

    function test_ContainerCount() public {
        assertEq(registry.containerCount(), 0);

        _storeContainer(CONTAINER_ID, "human");
        assertEq(registry.containerCount(), 1);
    }

    function test_ListContainers() public {
        bytes32 id1 = keccak256("container-1");
        bytes32 id2 = keccak256("container-2");

        registry.storeContainer(id1, TIMESTAMP, PROPOSAL_HASH, solarSnapshot, resonanceProfile, moralOverlay, "reason", keccak256("hash1"), "human");
        registry.storeContainer(id2, TIMESTAMP, PROPOSAL_HASH, solarSnapshot, resonanceProfile, moralOverlay, "reason", keccak256("hash2"), "ambient");

        (bytes32[] memory ids, uint256 total) = registry.listContainers(0, 10);
        assertEq(total, 2);
        assertEq(ids.length, 2);
        assertEq(ids[0], id1);
        assertEq(ids[1], id2);
    }

    function test_SeventDFeilds() public {
        _storeContainer(CONTAINER_ID, "human");

        TemporalContainerRegistry.TemporalContainer memory c = registry.getContainer(CONTAINER_ID);
        assertEq(c.resonanceProfile.fullBox7DComposite, 0.82e18);
        assertEq(c.resonanceProfile.waveProximity, 0.75e18);
        assertEq(c.resonanceProfile.phaseAlignment, 0.88e18);
        assertEq(c.resonanceProfile.calibratedVortex, 0.71e18);
        assertEq(c.resonanceProfile.calibratedSync, 0.79e18);
        assertEq(c.resonanceProfile.neuralProximity, 0.84e18);
        assertEq(c.resonanceProfile.neuralVortex, 0.77e18);
        assertEq(c.resonanceProfile.gematriaResonance, 0.79e18);
    }

    function test_LatestContainerHash() public {
        assertEq(registry.latestContainerHash(), bytes32(0));

        bytes32 hash1 = keccak256(abi.encode(CONTAINER_ID));
        _storeContainer(CONTAINER_ID, "human");
        assertEq(registry.latestContainerHash(), hash1);

        bytes32 hash2 = keccak256(abi.encode(CONTAINER_ID_2));
        _storeContainer(CONTAINER_ID_2, "ambient");
        assertEq(registry.latestContainerHash(), hash2);
    }
}