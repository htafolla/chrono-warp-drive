// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../TemporalContainer.sol";
import "../VortexToken.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        TemporalContainerRegistry registry = new TemporalContainerRegistry();
        console.log("TemporalContainerRegistry deployed at:", address(registry));

        address treasury = vm.addr(deployerPrivateKey);
        VortexToken token = new VortexToken(address(registry), treasury);
        console.log("VortexToken deployed at:", address(token));
        console.log("VortexToken treasury:", treasury);
        console.log("VortexToken symbol:", token.symbol());
        console.log("VortexToken name:", token.name());

        vm.stopBroadcast();
    }
}
