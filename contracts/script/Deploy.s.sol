// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../TemporalContainer.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        TemporalContainerRegistry registry = new TemporalContainerRegistry();

        vm.stopBroadcast();

        console.log("TemporalContainerRegistry deployed at:", address(registry));
    }
}
