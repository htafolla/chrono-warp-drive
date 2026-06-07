// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../VortexTokenV41.sol";

interface IVortexTokenV4 {
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
        string  hammerReason;
        string  proposalText;
    }

    function ownerOf(uint256 tokenId) external view returns (address);
    function getContainerData(uint256 tokenId) external view returns (ContainerData memory);
    function totalSupply() external view returns (uint256);
    function tokenByContainerId(bytes32 containerId) external view returns (uint256);
}

contract MigrateV4ToV41 is Script {
    address constant V4 = 0x16f6E7E21ADd5EdF37c4a3f2f1898e8FB66c2328;
    address constant REGISTRY = 0xCB418F081D4fDAD6B2b17027294865B26cb26855;
    address constant TREASURY = 0xd45CcF98D6db5A36E7CdD10ffae0b685BF27CE43;

    function run() external {
        IVortexTokenV4 v4 = IVortexTokenV4(V4);
        TemporalContainerRegistry registry = TemporalContainerRegistry(REGISTRY);

        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy v41
        VortexTokenV41 v41 = new VortexTokenV41(REGISTRY, TREASURY);

        // Grant MINTER_ROLE to deployer for migration
        v41.grantRole(v41.MINTER_ROLE(), msg.sender);

        // Get all container IDs from registry
        (bytes32[] memory ids, uint256 total) = registry.listContainers(0, 100);
        require(total > 0, "No containers in registry");

        // Migrate every v4 token to v41
        for (uint256 i = 0; i < total; i++) {
            bytes32 cid = ids[i];

            // Read container data from registry for hammerReason
            TemporalContainerRegistry.TemporalContainer memory rc = registry.getContainer(cid);

            // Check if v4 has a token for this container
            try v4.tokenByContainerId(cid) returns (uint256 tokenId) {
                // Existing token — migrate with same owner and data
                address owner = v4.ownerOf(tokenId);
                IVortexTokenV4.ContainerData memory d = v4.getContainerData(tokenId);
                v41.mint(owner, cid, VortexTokenV41.ContainerData({
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
                    containerHash: d.containerHash,
                    hammerReason: rc.hammerReason,
                    proposalText: d.proposalText
                }));
            } catch {
                // Unclaimed container — mint to treasury from registry data
                v41.mint(TREASURY, cid, VortexTokenV41.ContainerData({
                    containerId: cid,
                    timestamp: rc.timestamp,
                    verdict: rc.resonanceProfile.verdict,
                    fullBox7DComposite: rc.resonanceProfile.fullBox7DComposite,
                    trinitariumMoralScore: rc.moralOverlay.trinitariumMoralScore,
                    trinitariumGematriaFusion: rc.moralOverlay.trinitariumGematriaFusion,
                    moralTension: rc.moralOverlay.moralNumerologicalTension,
                    waveProximity: rc.resonanceProfile.waveProximity,
                    phaseAlignment: rc.resonanceProfile.phaseAlignment,
                    calibratedVortex: rc.resonanceProfile.calibratedVortex,
                    calibratedSync: rc.resonanceProfile.calibratedSync,
                    neuralProximity: rc.resonanceProfile.neuralProximity,
                    neuralVortex: rc.resonanceProfile.neuralVortex,
                    gematriaResonance: rc.resonanceProfile.gematriaResonance,
                    virtueAlignment: rc.moralOverlay.virtueAlignment,
                    moralSafety: rc.moralOverlay.moralSafety,
                    intentAlignment: rc.moralOverlay.intentAlignment,
                    source: rc.source,
                    containerHash: rc.containerHash,
                    hammerReason: rc.hammerReason,
                    proposalText: ""
                }));
            }
        }

        vm.stopBroadcast();

        // Verify: all containers have tokens on v41
        require(v41.totalSupply() == total, "Supply mismatch");
        for (uint256 i = 0; i < total; i++) {
            bytes32 cid = ids[i];
            uint256 tid = v41.tokenByContainerId(cid);
            VortexTokenV41.ContainerData memory cd = v41.getContainerData(tid);
            require(cd.containerId == cid, "Data mismatch for container");
        }
    }
}
