// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../GrooverIdentityToken.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract GrooverIdentityTokenTest is Test {
    GrooverIdentityToken token;

    address alice = vm.addr(0x1001);
    address bob = vm.addr(0x1002);
    address attacker = vm.addr(0xBEEF);

    bytes32 constant SAMPLE_DNA = keccak256("sample-agent-dna");
    bytes32 constant OTHER_DNA = keccak256("other-agent-dna");
    string constant SAMPLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"/>';

    function setUp() public {
        token = new GrooverIdentityToken(address(this), address(this));
    }

    function _did(string memory suffix) internal pure returns (string memory) {
        return string.concat("did:groover:", suffix);
    }

    /// @dev Current Groover registry DID: prefix + 64 hex (76 bytes).
    function _did64() internal pure returns (string memory) {
        return _did("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
    }

    function test_mint_assigns_token_and_emits() public {
        string memory did = _did("0000000000000001");
        bytes32 key = token.identityKey(did, SAMPLE_DNA);

        vm.expectEmit(true, true, true, true, address(token));
        emit GrooverIdentityToken.IdentityMinted(1, key, alice, did, "0xray-suit", 3);

        uint256 tokenId = token.mint(alice, did, SAMPLE_DNA, "0xray-suit", 3, bytes32(0), 0, SAMPLE_SVG);

        assertEq(tokenId, 1);
        assertEq(token.ownerOf(1), alice);
        assertEq(token.balanceOf(alice), 1);
        assertTrue(token.minted(did, SAMPLE_DNA));
        assertEq(token.tokenByIdentity(did, SAMPLE_DNA), 1);
    }

    function test_mint_same_did_dna_reverts() public {
        string memory did = _did("0000000000000001");
        token.mint(alice, did, SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);

        bytes32 key = token.identityKey(did, SAMPLE_DNA);
        vm.expectRevert(abi.encodeWithSelector(GrooverIdentityToken.AlreadyMinted.selector, key));
        token.mint(bob, did, SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);
    }

    function test_mint_same_dna_different_did_ok() public {
        token.mint(alice, _did("0000000000000001"), SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);
        uint256 second = token.mint(bob, _did("0000000000000002"), SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);
        assertEq(second, 2);
        assertEq(token.totalSupply(), 2);
    }

    function test_mint_same_did_different_dna_ok() public {
        token.mint(alice, _did("0000000000000001"), SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);
        uint256 second = token.mint(bob, _did("0000000000000001"), OTHER_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);
        assertEq(second, 2);
        assertEq(token.totalSupply(), 2);
    }

    function test_mint_variant_16_reverts() public {
        vm.expectRevert(abi.encodeWithSelector(GrooverIdentityToken.InvalidVariant.selector, uint8(16)));
        token.mint(alice, _did("0000000000000001"), SAMPLE_DNA, "groover-identity", 16, bytes32(0), 0, SAMPLE_SVG);
    }

    function test_mint_variant_15_ok() public {
        token.mint(alice, _did("0000000000000001"), SAMPLE_DNA, "groover-identity", 15, bytes32(0), 0, SAMPLE_SVG);
        assertEq(token.getTokenData(1).variant, 15);
        assertEq(token.getTokenData(1).mintedAt, block.timestamp);
    }

    function test_mint_bad_did_reverts() public {
        vm.expectRevert(GrooverIdentityToken.InvalidDid.selector);
        token.mint(alice, "", SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);

        vm.expectRevert(GrooverIdentityToken.InvalidDid.selector);
        token.mint(alice, "not-a-did-at-all", SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);

        string memory tooShort = "did:groover:0000";
        assertTrue(bytes(tooShort).length < 25);
        vm.expectRevert(GrooverIdentityToken.InvalidDid.selector);
        token.mint(alice, tooShort, SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);

        // 26-byte pad used on Sepolia v1 — no longer valid (canonical is 28 hex-suffix bytes)
        vm.expectRevert(GrooverIdentityToken.InvalidDid.selector);
        token.mint(alice, "did:groover:test0000000001", SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);

        // 28 bytes, prefix ok, non-hex suffix
        vm.expectRevert(GrooverIdentityToken.InvalidDid.selector);
        token.mint(alice, "did:groover:zzzzzzzzzzzzzzzz", SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);

        // 44 bytes: prefix + 32 hex — neither legacy 16 nor registry 64
        string memory midLen = _did("0123456789abcdef0123456789abcdef");
        assertEq(bytes(midLen).length, 44);
        vm.expectRevert(GrooverIdentityToken.InvalidDid.selector);
        token.mint(alice, midLen, SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);

        // 75 bytes: 63 hex
        string memory oneShort = _did("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcde");
        assertEq(bytes(oneShort).length, 75);
        vm.expectRevert(GrooverIdentityToken.InvalidDid.selector);
        token.mint(alice, oneShort, SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);

        // 77 bytes: 65 hex
        string memory oneLong = _did("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0");
        assertEq(bytes(oneLong).length, 77);
        vm.expectRevert(GrooverIdentityToken.InvalidDid.selector);
        token.mint(alice, oneLong, SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);

        // 76 bytes, prefix ok, non-hex in suffix
        string memory badHex64 = _did("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdez");
        assertEq(bytes(badHex64).length, 76);
        vm.expectRevert(GrooverIdentityToken.InvalidDid.selector);
        token.mint(alice, badHex64, SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);
    }

    function test_mint_empty_pack_reverts() public {
        vm.expectRevert(GrooverIdentityToken.InvalidPack.selector);
        token.mint(alice, _did("0000000000000001"), SAMPLE_DNA, "", 0, bytes32(0), 0, SAMPLE_SVG);
    }

    function test_mint_long_wrong_prefix_reverts() public {
        // 28 bytes so this hits the prefix check, not the length check
        string memory badPrefix = "did:xxxxxxxx0000000000000000";
        assertEq(bytes(badPrefix).length, 28);
        vm.expectRevert(GrooverIdentityToken.InvalidDid.selector);
        token.mint(alice, badPrefix, SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);

        // 76 bytes, wrong prefix, hex-looking tail
        string memory badPrefix64 = string.concat(
            "did:xxxxxxxx",
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
        );
        assertEq(bytes(badPrefix64).length, 76);
        vm.expectRevert(GrooverIdentityToken.InvalidDid.selector);
        token.mint(alice, badPrefix64, SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);
    }

    function test_mint_64_hex_did_ok() public {
        string memory did = _did64();
        assertEq(bytes(did).length, 76);

        uint256 tokenId = token.mint(alice, did, SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);
        assertEq(tokenId, 1);
        assertEq(token.ownerOf(1), alice);
        assertTrue(token.minted(did, SAMPLE_DNA));
        assertEq(token.tokenByIdentity(did, SAMPLE_DNA), 1);
        assertEq(token.getTokenData(1).did, did);
    }

    function test_mint_64_hex_did_uppercase_ok() public {
        string memory did = _did("0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF");
        assertEq(bytes(did).length, 76);
        uint256 tokenId = token.mint(alice, did, SAMPLE_DNA, "0xray-suit", 3, bytes32(0), 4, SAMPLE_SVG);
        assertEq(tokenId, 1);
        assertEq(token.getTokenData(1).did, did);
    }

    function test_mint_legacy_16_and_registry_64_same_dna_ok() public {
        token.mint(alice, _did("0000000000000001"), SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);
        uint256 second = token.mint(bob, _did64(), SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);
        assertEq(second, 2);
        assertEq(token.totalSupply(), 2);
    }

    function test_tokenURI_contains_64_hex_did() public {
        string memory did = _did64();
        token.mint(alice, did, SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);
        bytes memory json = _base64Decode(_stripPrefix(token.tokenURI(1)));
        assertTrue(_contains(json, did));
    }

    function test_mint_control_char_did_reverts() public {
        string memory badDid = "did:groover:0000000000000001\n";
        vm.expectRevert(GrooverIdentityToken.InvalidDid.selector);
        token.mint(alice, badDid, SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);
    }

    function test_mint_control_char_pack_reverts() public {
        vm.expectRevert(GrooverIdentityToken.InvalidPack.selector);
        token.mint(alice, _did("0000000000000001"), SAMPLE_DNA, "groover\tidentity", 0, bytes32(0), 0, SAMPLE_SVG);
    }

    function test_mint_long_pack_reverts() public {
        bytes memory longPack = new bytes(65);
        for (uint256 i = 0; i < 65; i++) longPack[i] = "a";
        vm.expectRevert(GrooverIdentityToken.InvalidPack.selector);
        token.mint(alice, _did("0000000000000001"), SAMPLE_DNA, string(longPack), 0, bytes32(0), 0, SAMPLE_SVG);
    }

    function test_mint_zero_address_reverts() public {
        vm.expectRevert(GrooverIdentityToken.ZeroAddress.selector);
        token.mint(address(0), _did("0000000000000001"), SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);
    }

    function test_tokenURI_unknown_reverts() public {
        vm.expectRevert(GrooverIdentityToken.TokenDoesNotExist.selector);
        token.tokenURI(999);
    }

    function test_tokenByIdentity_unknown_returns_zero() public {
        assertEq(token.tokenByIdentity(_did("0000000000000001"), SAMPLE_DNA), 0);
        assertFalse(token.minted(_did("0000000000000001"), SAMPLE_DNA));
    }

    function test_mint_pack_too_long_reverts() public {
        string memory tooLong = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789xxxx"; // 66
        assertTrue(bytes(tooLong).length > 64);
        vm.expectRevert(GrooverIdentityToken.InvalidPack.selector);
        token.mint(alice, _did("0000000000000001"), SAMPLE_DNA, tooLong, 0, bytes32(0), 0, SAMPLE_SVG);
    }

    function test_identityKey_uses_abi_encode_not_packed() public {
        string memory did = _did("0000000000000001");
        bytes32 encoded = keccak256(abi.encode(did, SAMPLE_DNA));
        bytes32 packed = keccak256(abi.encodePacked(did, SAMPLE_DNA));
        assertEq(token.identityKey(did, SAMPLE_DNA), encoded);
        assertTrue(encoded != packed);
    }

    function test_tokenURI_escapes_quotes_in_pack() public {
        string memory did = _did("0000000000000001");
        token.mint(alice, did, SAMPLE_DNA, "job\"helm", 0, bytes32(0), 0, SAMPLE_SVG);
        bytes memory json = _base64Decode(_stripPrefix(token.tokenURI(1)));
        assertTrue(_contains(json, "job\\\"helm"));
    }

    function test_mint_reentering_receiver_cannot_double_mint() public {
        ReenteringReceiver rx = new ReenteringReceiver(token);
        token.grantRole(token.MINTER_ROLE(), address(rx));
        string memory did = _did("0000000000000001");
        uint256 tokenId = token.mint(address(rx), did, SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);
        assertEq(tokenId, 1);
        assertEq(token.ownerOf(1), address(rx));
        assertTrue(rx.sawAlreadyMinted());
        assertEq(token.totalSupply(), 1);
    }

    function test_mint_non_minter_reverts() public {
        string memory did = _did("0000000000000001");
        assertFalse(token.hasRole(token.MINTER_ROLE(), attacker));
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                attacker,
                token.MINTER_ROLE()
            )
        );
        vm.prank(attacker);
        token.mint(alice, did, SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);
    }

    function test_tokenURI_contains_did_pack_image_host() public {
        string memory did = _did("0000000000000001");
        token.mint(alice, did, SAMPLE_DNA, "0xray-suit", 5, bytes32(0), 0, SAMPLE_SVG);

        string memory uri = token.tokenURI(1);
        assertTrue(_startsWith(uri, "data:application/json;base64,"));

        bytes memory json = _base64Decode(_stripPrefix(uri));
        assertTrue(_contains(json, "did:groover:"));
        assertTrue(_contains(json, "0xray-suit"));
        assertTrue(_contains(
            json,
            "https://registry-production-e2c4.up.railway.app/identity/token-image/"
        ));
        assertTrue(_contains(json, '"trait_type":"Visor","value":"constitution-visor"'));
        assertTrue(_contains(json, '"trait_type":"Colorway","value":"inspect-amber"'));
        assertTrue(_contains(json, '"trait_type":"Chassis","value":"ribbed"'));
        assertTrue(_contains(json, '"trait_type":"Mark","value":"CONSTITUTION"'));
        assertTrue(_contains(json, '"trait_type":"Level","value":"Unknown"'));
        assertTrue(_contains(json, "DNA 0x"));
        assertTrue(_contains(json, "Dynamo none"));
        assertFalse(_contains(json, '"trait_type":"DID"'));
        assertFalse(_contains(json, '"trait_type":"DNA"'));
        assertFalse(_contains(json, '"trait_type":"Dynamo citation"'));
        assertFalse(_contains(json, '"trait_type":"Pack"'));
        assertFalse(_contains(json, '"trait_type":"Variant"'));
    }

    function test_tokenURI_image_traits_identity_pack() public {
        token.mint(alice, _did("0000000000000001"), SAMPLE_DNA, "groover-identity", 9, bytes32(0), 3, SAMPLE_SVG);
        bytes memory json = _base64Decode(_stripPrefix(token.tokenURI(1)));
        assertTrue(_contains(json, '"trait_type":"Visor","value":"job-helm"'));
        assertTrue(_contains(json, '"trait_type":"Colorway","value":"inspect-amber"'));
        assertTrue(_contains(json, '"trait_type":"Chassis","value":"hex-gem"'));
        assertTrue(_contains(json, '"trait_type":"Mark","value":"JOB"'));
        assertTrue(_contains(json, '"trait_type":"Level","value":"Resonant"'));
    }

    function test_mint_level_5_reverts() public {
        vm.expectRevert(abi.encodeWithSelector(GrooverIdentityToken.InvalidLevel.selector, uint8(5)));
        token.mint(alice, _did("0000000000000001"), SAMPLE_DNA, "groover-identity", 0, bytes32(0), 5, SAMPLE_SVG);
    }

    function test_tokenURI_level_names() public {
        token.mint(alice, _did("0000000000000001"), SAMPLE_DNA, "groover-identity", 0, bytes32(0), 4, SAMPLE_SVG);
        bytes memory celestial = _base64Decode(_stripPrefix(token.tokenURI(1)));
        assertTrue(_contains(celestial, '"trait_type":"Level","value":"Celestial"'));

        token.mint(bob, _did("0000000000000002"), SAMPLE_DNA, "groover-identity", 0, bytes32(0), 3, SAMPLE_SVG);
        bytes memory resonant = _base64Decode(_stripPrefix(token.tokenURI(2)));
        assertTrue(_contains(resonant, '"trait_type":"Level","value":"Resonant"'));

        token.mint(alice, _did("0000000000000003"), SAMPLE_DNA, "groover-identity", 0, bytes32(0), 2, SAMPLE_SVG);
        bytes memory unstable = _base64Decode(_stripPrefix(token.tokenURI(3)));
        assertTrue(_contains(unstable, '"trait_type":"Level","value":"Unstable"'));

        token.mint(alice, _did("0000000000000004"), SAMPLE_DNA, "groover-identity", 0, bytes32(0), 1, SAMPLE_SVG);
        bytes memory dissonant = _base64Decode(_stripPrefix(token.tokenURI(4)));
        assertTrue(_contains(dissonant, '"trait_type":"Level","value":"Dissonant"'));
    }

    function test_levelName() public view {
        assertEq(token.levelName(0), "Unknown");
        assertEq(token.levelName(1), "Dissonant");
        assertEq(token.levelName(2), "Unstable");
        assertEq(token.levelName(3), "Resonant");
        assertEq(token.levelName(4), "Celestial");
    }

    function test_tokenByIdentity_roundtrip() public {
        string memory did = _did("0000000000000001");
        token.mint(alice, did, SAMPLE_DNA, "groover-identity", 2, SAMPLE_DNA, 2, SAMPLE_SVG);

        assertEq(token.tokenByIdentity(did, SAMPLE_DNA), 1);
        assertEq(token.tokenByIndex(0), 1);

        GrooverIdentityToken.TokenData memory data = token.getTokenData(1);
        assertEq(data.did, did);
        assertEq(data.dna, SAMPLE_DNA);
        assertEq(data.pack, "groover-identity");
        assertEq(data.variant, 2);
        assertEq(data.dynamoCitation, SAMPLE_DNA);
        assertEq(data.level, 2);
        assertEq(data.mintedAt, block.timestamp);
    }

    function test_supportsInterface_erc721() public {
        assertTrue(token.supportsInterface(type(IERC721).interfaceId));
        assertTrue(token.supportsInterface(type(IERC721Enumerable).interfaceId));
        assertTrue(token.supportsInterface(type(IERC721Metadata).interfaceId));
        assertTrue(token.supportsInterface(type(IAccessControl).interfaceId));
        assertTrue(token.supportsInterface(type(IERC165).interfaceId));
        assertFalse(token.supportsInterface(0xffffffff));
    }

    function test_getTokenData_unknown_token_reverts() public {
        vm.expectRevert(GrooverIdentityToken.TokenDoesNotExist.selector);
        token.getTokenData(999);
    }

    function test_tokenURI_image_is_onchain_svg() public {
        token.mint(alice, _did("0000000000000001"), SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);
        bytes memory json = _base64Decode(_stripPrefix(token.tokenURI(1)));
        assertTrue(_contains(json, "data:image/svg+xml;base64,"));
        assertTrue(_contains(
            json,
            '"external_url":"https://registry-production-e2c4.up.railway.app/identity/token-image/1"'
        ));
    }

    function test_mint_image_too_short_reverts() public {
        bytes memory tooShort = new bytes(31);
        for (uint256 i = 0; i < 31; i++) tooShort[i] = "a";
        vm.expectRevert(GrooverIdentityToken.InvalidImage.selector);
        token.mint(alice, _did("0000000000000001"), SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, string(tooShort));
    }

    function test_mint_image_too_long_reverts() public {
        bytes memory tooLong = new bytes(16385);
        vm.expectRevert(GrooverIdentityToken.InvalidImage.selector);
        token.mint(alice, _did("0000000000000001"), SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, string(tooLong));
    }

    function test_mint_image_control_char_reverts() public {
        vm.expectRevert(GrooverIdentityToken.InvalidImage.selector);
        token.mint(
            alice,
            _did("0000000000000001"),
            SAMPLE_DNA,
            "groover-identity",
            0,
            bytes32(0),
            0,
            string.concat(SAMPLE_SVG, "\n")
        );
    }

    function test_getTokenData_includes_imageSvg() public {
        token.mint(alice, _did("0000000000000001"), SAMPLE_DNA, "groover-identity", 0, bytes32(0), 0, SAMPLE_SVG);
        GrooverIdentityToken.TokenData memory data = token.getTokenData(1);
        assertEq(data.imageSvg, SAMPLE_SVG);
    }

    function _startsWith(string memory s, string memory prefix) internal pure returns (bool) {
        bytes memory b = bytes(s);
        bytes memory p = bytes(prefix);
        if (b.length < p.length) return false;
        for (uint256 i = 0; i < p.length; i++) {
            if (b[i] != p[i]) return false;
        }
        return true;
    }

    function _stripPrefix(string memory s) internal pure returns (bytes memory) {
        bytes memory b = bytes(s);
        bytes memory prefix = bytes("data:application/json;base64,");
        bytes memory out = new bytes(b.length - prefix.length);
        for (uint256 i = 0; i < out.length; i++) out[i] = b[i + prefix.length];
        return out;
    }

    function _base64Decode(bytes memory data) internal pure returns (bytes memory) {
        if (data.length == 0) return new bytes(0);
        uint256 n = data.length;
        uint256 pad = 0;
        if (n % 4 == 0) {
            if (data[n - 1] == "=") pad++;
            if (n >= 2 && data[n - 2] == "=") pad++;
        }
        uint256 outLen = (n / 4) * 3 - pad;
        bytes memory out = new bytes(outLen);
        uint256 o = 0;
        for (uint256 i = 0; i + 3 < n; i += 4) {
            uint32 triple = (uint32(_b64v(data[i])) << 18)
                | (uint32(_b64v(data[i + 1])) << 12)
                | (uint32(_b64v(data[i + 2])) << 6)
                | uint32(_b64v(data[i + 3]));
            out[o++] = bytes1(uint8(triple >> 16));
            if (data[i + 2] != "=") out[o++] = bytes1(uint8((triple >> 8) & 0xff));
            if (data[i + 3] != "=") out[o++] = bytes1(uint8(triple & 0xff));
        }
        return out;
    }

    function _b64v(bytes1 c) internal pure returns (uint256) {
        uint8 u = uint8(c);
        if (u >= uint8(bytes1('A')) && u <= uint8(bytes1('Z'))) return u - uint8(bytes1('A'));
        if (u >= uint8(bytes1('a')) && u <= uint8(bytes1('z'))) return u - uint8(bytes1('a')) + 26;
        if (u >= uint8(bytes1('0')) && u <= uint8(bytes1('9'))) return u - uint8(bytes1('0')) + 52;
        if (c == '+') return 62;
        if (c == '/') return 63;
        return 65;
    }

    function _contains(bytes memory haystack, string memory needle) internal pure returns (bool) {
        bytes memory n = bytes(needle);
        if (n.length == 0) return true;
        if (n.length > haystack.length) return false;
        for (uint256 i = 0; i + n.length <= haystack.length; i++) {
            bool isMatch = true;
            for (uint256 j = 0; j < n.length; j++) {
                if (haystack[i + j] != n[j]) {
                    isMatch = false;
                    break;
                }
            }
            if (isMatch) return true;
        }
        return false;
    }
}

contract ReenteringReceiver is IERC721Receiver {
    GrooverIdentityToken public immutable token;
    bool public sawAlreadyMinted;
    string constant SAMPLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"/>';

    constructor(GrooverIdentityToken t) {
        token = t;
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external override returns (bytes4) {
        try token.mint(
            address(this),
            "did:groover:0000000000000001",
            keccak256("sample-agent-dna"),
            "groover-identity",
            1,
            bytes32(0),
            0,
            SAMPLE_SVG
        ) {
            // unexpected success — leave sawAlreadyMinted false
        } catch (bytes memory err) {
            if (err.length >= 4) {
                bytes4 sel;
                assembly {
                    sel := mload(add(err, 32))
                }
                if (sel == GrooverIdentityToken.AlreadyMinted.selector) {
                    sawAlreadyMinted = true;
                }
            }
        }
        return this.onERC721Received.selector;
    }
}