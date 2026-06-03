// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../TemporalContainer.sol";

contract TemporalContainerTest is Test {
    TemporalContainerRegistry registry;

    bytes32 constant CONTAINER_ID = keccak256("test-container-1");
    uint256 constant TIMESTAMP = 1717200000;
    bytes32 constant PROPOSAL_HASH = keccak256("proposal text");
    bytes32 constant CONTAINER_HASH = keccak256("full container json");

    TemporalContainerRegistry.SolarSnapshot solarSnapshot;
    TemporalContainerRegistry.ResonanceProfile resonanceProfile;

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
            structuralResonance: 0.98e18,
            proximity:           0.998e18,
            phaseAlignment:      0.99e18,
            vortexAlignment:     0.9999998e18,
            synchronization:     0.956e18,
            neuralProximity:     0.746e18,
            neuralVortex:        0.773e18,
            verdict:             "PASS",
            confidence:          0.93e18,
            fullBox7DComposite:  0.97e18,
            fullBox7DVerdict:    "PASS",
            gematriaResonance:   0.82e18,
            gematriaEnglishOrdinal: 74,
            gematriaFullReduction:  32,
            gematriaDigitalRootEO:  5,
            gematriaDigitalRootFR:  5
        });
    }

    function test_StoreContainer() public {
        registry.storeContainer(
            CONTAINER_ID,
            TIMESTAMP,
            PROPOSAL_HASH,
            solarSnapshot,
            resonanceProfile,
            "Strong resonance with current solar conditions",
            CONTAINER_HASH
        );

        assertTrue(registry.containerExists(CONTAINER_ID));
    }

    function test_GetContainer() public {
        registry.storeContainer(
            CONTAINER_ID,
            TIMESTAMP,
            PROPOSAL_HASH,
            solarSnapshot,
            resonanceProfile,
            "Strong resonance with current solar conditions",
            CONTAINER_HASH
        );

        TemporalContainerRegistry.TemporalContainer memory c = registry.getContainer(CONTAINER_ID);
        assertEq(c.containerId, CONTAINER_ID);
        assertEq(c.timestamp, TIMESTAMP);
        assertEq(c.proposalHash, PROPOSAL_HASH);
        assertEq(c.resonanceProfile.verdict, "PASS");
        assertEq(c.creator, address(this));
    }

    function test_RevertOnDuplicate() public {
        registry.storeContainer(
            CONTAINER_ID,
            TIMESTAMP,
            PROPOSAL_HASH,
            solarSnapshot,
            resonanceProfile,
            "Strong resonance with current solar conditions",
            CONTAINER_HASH
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                TemporalContainerRegistry.ContainerAlreadyExists.selector,
                CONTAINER_ID
            )
        );
        registry.storeContainer(
            CONTAINER_ID,
            TIMESTAMP,
            PROPOSAL_HASH,
            solarSnapshot,
            resonanceProfile,
            "Strong resonance with current solar conditions",
            CONTAINER_HASH
        );
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
        registry.storeContainer(
            CONTAINER_ID,
            TIMESTAMP,
            PROPOSAL_HASH,
            solarSnapshot,
            resonanceProfile,
            "Strong resonance with current solar conditions",
            CONTAINER_HASH
        );

        assertTrue(registry.verifyContainer(CONTAINER_ID, CONTAINER_HASH));
        assertFalse(registry.verifyContainer(CONTAINER_ID, keccak256("wrong hash")));
    }

    function test_ContainerCount() public {
        assertEq(registry.containerCount(), 0);

        registry.storeContainer(
            CONTAINER_ID,
            TIMESTAMP,
            PROPOSAL_HASH,
            solarSnapshot,
            resonanceProfile,
            "Strong resonance with current solar conditions",
            CONTAINER_HASH
        );

        assertEq(registry.containerCount(), 1);
    }

    function test_ListContainers() public {
        bytes32 id1 = keccak256("container-1");
        bytes32 id2 = keccak256("container-2");

        registry.storeContainer(id1, TIMESTAMP, PROPOSAL_HASH, solarSnapshot, resonanceProfile, "reason", CONTAINER_HASH);
        registry.storeContainer(id2, TIMESTAMP, PROPOSAL_HASH, solarSnapshot, resonanceProfile, "reason", CONTAINER_HASH);

        (bytes32[] memory ids, uint256 total) = registry.listContainers(0, 10);
        assertEq(total, 2);
        assertEq(ids.length, 2);
        assertEq(ids[0], id1);
        assertEq(ids[1], id2);
    }
}
