// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../GrooverIdentityToken.sol";

/// @notice Deploy GrooverIdentityToken (GRVR) with the same roles model as live v1–v4:
///         admin = deployer EOA (`DEPLOYER_PRIVATE_KEY`), minter = `GROOVER_MINTER`.
///
/// Base mainnet (8453) — do not broadcast from a cloud agent unless keys are already
/// in the environment. From `contracts/` with `contracts/.env` loaded:
///
///   # dry-run / simulate (no tx)
///   forge script script/DeployGrooverIdentity.s.sol --rpc-url base
///
///   # broadcast + Basescan verify
///   forge script script/DeployGrooverIdentity.s.sol --rpc-url base --broadcast --verify
///
/// Env: DEPLOYER_PRIVATE_KEY, GROOVER_MINTER, BASE_RPC_URL, BASESCAN_API_KEY.
/// Live Railway minter: 0x77E7A48609e9c8A77C7639172af9EEA0e5E80DF7
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