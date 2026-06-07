// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../VortexTokenV3.sol";

interface IVortexTokenV2 {
    struct ContainerData {
        bytes32 containerId;
        uint256 timestamp;
        string  verdict;
        uint256 fullBox7DComposite;
        uint256 trinitariumMoralScore;
        uint256 trinitariumGematriaFusion;
        string  moralTension;
        uint256 waveProximity;
        uint256 phaseAlignment;
        uint256 calibratedVortex;
        uint256 calibratedSync;
        uint256 neuralProximity;
        uint256 neuralVortex;
        uint256 gematriaResonance;
        uint256 virtueAlignment;
        uint256 moralSafety;
        uint256 intentAlignment;
        string  source;
        bytes32 containerHash;
    }

    function ownerOf(uint256 tokenId) external view returns (address);
    function getContainerData(uint256 tokenId) external view returns (ContainerData memory);
    function totalSupply() external view returns (uint256);
    function tokenByContainerId(bytes32 containerId) external view returns (uint256);
}

contract MigrateV2ToV3 is Script {
    address constant V2 = 0x6C61feb8389c99EBf00576E7A110140866C5D9fF;
    address constant REGISTRY = 0xCB418F081D4fDAD6B2b17027294865B26cb26855;
    address constant TREASURY = 0xd45CcF98D6db5A36E7CdD10ffae0b685BF27CE43;

    function run() external {
        IVortexTokenV2 v2 = IVortexTokenV2(V2);
        TemporalContainerRegistry registry = TemporalContainerRegistry(REGISTRY);

        vm.startBroadcast();

        // Deploy v3
        VortexTokenV3 v3 = new VortexTokenV3(REGISTRY, TREASURY);

        // Get all container IDs from registry
        (bytes32[] memory ids, uint256 total) = registry.listContainers(0, 100);
        require(total > 0, "No containers in registry");

        // Migrate or mint for every container
        uint256 migratedCount;
        for (uint256 i = 0; i < total; i++) {
            bytes32 cid = ids[i];

            // Check if v2 already has a token for this container
            try v2.tokenByContainerId(cid) returns (uint256 tokenId) {
                // Existing token — migrate with same owner and data
                address owner = v2.ownerOf(tokenId);
                IVortexTokenV2.ContainerData memory d = v2.getContainerData(tokenId);
                v3.mint(owner, cid, VortexTokenV3.ContainerData({
                    containerId: d.containerId,
                    timestamp: d.timestamp,
                    verdict: d.verdict,
                    fullBox7DComposite: d.fullBox7DComposite,
                    trinitariumMoralScore: d.trinitariumMoralScore,
                    trinitariumGematriaFusion: d.trinitariumGematriaFusion,
                    moralTension: d.moralTension,
                    waveProximity: d.waveProximity,
                    phaseAlignment: d.phaseAlignment,
                    calibratedVortex: d.calibratedVortex,
                    calibratedSync: d.calibratedSync,
                    neuralProximity: d.neuralProximity,
                    neuralVortex: d.neuralVortex,
                    gematriaResonance: d.gematriaResonance,
                    virtueAlignment: d.virtueAlignment,
                    moralSafety: d.moralSafety,
                    intentAlignment: d.intentAlignment,
                    source: d.source,
                    containerHash: d.containerHash
                }));
            } catch {
                // Unclaimed container — mint to treasury from registry data
                TemporalContainerRegistry.TemporalContainer memory c = registry.getContainer(cid);
                v3.mint(TREASURY, cid, VortexTokenV3.ContainerData({
                    containerId: cid,
                    timestamp: c.timestamp,
                    verdict: c.resonanceProfile.verdict,
                    fullBox7DComposite: c.resonanceProfile.fullBox7DComposite,
                    trinitariumMoralScore: c.moralOverlay.trinitariumMoralScore,
                    trinitariumGematriaFusion: c.moralOverlay.trinitariumGematriaFusion,
                    moralTension: c.moralOverlay.moralNumerologicalTension,
                    waveProximity: c.resonanceProfile.waveProximity,
                    phaseAlignment: c.resonanceProfile.phaseAlignment,
                    calibratedVortex: c.resonanceProfile.calibratedVortex,
                    calibratedSync: c.resonanceProfile.calibratedSync,
                    neuralProximity: c.resonanceProfile.neuralProximity,
                    neuralVortex: c.resonanceProfile.neuralVortex,
                    gematriaResonance: c.resonanceProfile.gematriaResonance,
                    virtueAlignment: c.moralOverlay.virtueAlignment,
                    moralSafety: c.moralOverlay.moralSafety,
                    intentAlignment: c.moralOverlay.intentAlignment,
                    source: c.source,
                    containerHash: c.containerHash
                }));
            }
            migratedCount++;
        }

        vm.stopBroadcast();

        // Verify: all containers have tokens on v3
        require(v3.totalSupply() == total, "Supply mismatch");
        for (uint256 i = 0; i < total; i++) {
            bytes32 cid = ids[i];
            uint256 tid = v3.tokenByContainerId(cid);
            VortexTokenV3.ContainerData memory cd = v3.getContainerData(tid);
            require(cd.containerId == cid, "Data mismatch for container");
        }
    }
}
