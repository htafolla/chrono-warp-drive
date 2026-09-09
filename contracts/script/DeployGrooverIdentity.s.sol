// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../GrooverIdentityToken.sol";

contract DeployGrooverIdentity is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address admin = vm.addr(deployerPrivateKey);
        address minter = vm.envAddress("GROOVER_MINTER");

        vm.startBroadcast(deployerPrivateKey);

        GrooverIdentityToken token = new GrooverIdentityToken(admin, minter);
        console.log("GrooverIdentityToken deployed at:", address(token));
        console.log("GrooverIdentityToken name:", token.name());
        console.log("GrooverIdentityToken symbol:", token.symbol());
        console.log("GrooverIdentityToken admin:", admin);
        console.log("GrooverIdentityToken minter:", minter);
        console.log("GrooverIdentityToken minterHasRole:", token.hasRole(token.MINTER_ROLE(), minter));

        vm.stopBroadcast();
    }
}