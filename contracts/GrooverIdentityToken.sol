// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/// @title GrooverIdentityToken
/// @notice Groover-owned ERC-721 identity collection on Base (L2).
/// @dev 1/1 per (did, dna) identity key. Role-gated minting (MINTER_ROLE),
///      no registry coupling, fully on-chain base64 JSON metadata.
///
///      Pack values (documented string contract, not on-chain enums):
///       - "groover-identity" : any Groover DID, no mill required. DNA is
///                              keccak256(did) or Groover-chosen canonical bytes.
///       - "0xray-suit"       : mill inspect-green attestation required by the
///                              Groover MCP (off-chain). DNA is keccak256 of the
///                              canonical foundry-inventory.json WITHOUT mintedAt.
///      The contract accepts any non-empty pack of <= 64 bytes; the Groover
///      MCP is responsible for whitelisting packs at the application layer.
///      Control bytes (< 0x20) are rejected in pack so the on-chain
///      tokenURI JSON stays valid; did is exactly 28 bytes of prefix + hex.
contract GrooverIdentityToken is ERC721Enumerable, AccessControl {
    using Strings for uint256;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint8 public constant MAX_VARIANT = 16;
    /// @dev 0 Unknown (no Dynamo), 1 Dissonant, 2 Unstable, 3 Resonant, 4 Celestial.
    ///      From Dynamo 7D: ≥0.95 Celestial, ≥0.78 Resonant, ≥0.50 Unstable, else Dissonant.
    uint8 public constant MAX_LEVEL = 5;
    string public constant IMAGE_BASE =
        "https://registry-production-e2c4.up.railway.app/identity/token-image/";

    uint256 private constant _DID_PREFIX_LEN = 12; // "did:groover:"
    uint256 private constant _DID_LEN = 28;        // prefix + 16 hex (Groover canonical)

    struct TokenData {
        string did;             // did:groover:<16 hex>
        bytes32 dna;            // keccak256 of canonical pack DNA
        string pack;            // "0xray-suit" | "groover-identity" | future
        uint8 variant;          // 0 .. MAX_VARIANT-1
        bytes32 dynamoCitation; // optional; bytes32(0) if none
        uint8 level;            // 0 .. MAX_LEVEL-1 (OpenSea "Level")
        string imageSvg;        // compositor SVG; tokenURI inlines as data URI
        uint256 mintedAt;
    }

    uint256 private _nextTokenId; // 1-based
    mapping(uint256 => TokenData) private _data;
    mapping(bytes32 => uint256) private _idToToken; // identityKey => tokenId

    event IdentityMinted(
        uint256 indexed tokenId,
        bytes32 indexed identityKey,
        address indexed to,
        string did,
        string pack,
        uint8 variant
    );

    error AlreadyMinted(bytes32 identityKey);
    error InvalidDid();
    error InvalidPack();
    error InvalidVariant(uint8 variant);
    error InvalidLevel(uint8 level);
    error InvalidImage();
    error ZeroAddress();
    error TokenDoesNotExist();

    constructor(address admin, address minter) ERC721("Groover Identity", "GRVR") {
        if (admin == address(0) || minter == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, minter);
    }

    /// @dev `abi.encode` (not `encodePacked`) so variable-length `did` cannot
    ///      collide with a different (did, dna) pair.
    function identityKey(string calldata did, bytes32 dna) public pure returns (bytes32) {
        return keccak256(abi.encode(did, dna));
    }

    function mint(
        address to,
        string calldata did,
        bytes32 dna,
        string calldata pack,
        uint8 variant,
        bytes32 dynamoCitation,
        uint8 level,
        string calldata imageSvg
    ) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        if (to == address(0)) revert ZeroAddress();
        if (!_hasValidDid(did)) revert InvalidDid();
        if (bytes(pack).length == 0 || bytes(pack).length > 64) revert InvalidPack();
        if (variant >= MAX_VARIANT) revert InvalidVariant(variant);
        if (level >= MAX_LEVEL) revert InvalidLevel(level);
        if (bytes(imageSvg).length < 32 || bytes(imageSvg).length > 16384) revert InvalidImage();
        // tokenURI embeds pack/svg into on-chain JSON: reject control bytes
        // (< 0x20) that would produce invalid JSON. _escape only handles " and \.
        // (did needs no such check: exact-28 + hex validation admits no control bytes.)
        if (_hasControlChars(pack)) revert InvalidPack();
        if (_hasControlChars(imageSvg)) revert InvalidImage();

        bytes32 key = identityKey(did, dna);
        if (_idToToken[key] != 0) revert AlreadyMinted(key);

        tokenId = ++_nextTokenId;

        // Effects before interaction: block re-entrant double-mint of the same key
        // from a malicious ERC721Receiver in _safeMint.
        _data[tokenId] = TokenData({
            did: did,
            dna: dna,
            pack: pack,
            variant: variant,
            dynamoCitation: dynamoCitation,
            level: level,
            imageSvg: imageSvg,
            mintedAt: block.timestamp
        });

        _idToToken[key] = tokenId;
        emit IdentityMinted(tokenId, key, to, did, pack, variant);

        _safeMint(to, tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist();
        TokenData storage d = _data[tokenId];

        string memory didEsc = _escape(d.did);
        string memory packEsc = _escape(d.pack);
        string memory citation = d.dynamoCitation == bytes32(0)
            ? "none"
            : Strings.toHexString(uint256(d.dynamoCitation), 32);

        string memory image = string.concat(
            "data:image/svg+xml;base64,",
            Base64.encode(bytes(d.imageSvg))
        );

        string memory head = string.concat(
            '{"name":"Groover Identity #', tokenId.toString(),
            '","description":"1/1 identity mark for ', didEsc,
            '. Pack ', packEsc, ', variant ', uint256(d.variant).toString(),
            '","image":"', image,
            '","external_url":"', IMAGE_BASE, tokenId.toString(),
            '","attributes":['
        );

        string memory traits1 = string.concat(
            '{"trait_type":"DID","value":"', didEsc, '"},',
            '{"trait_type":"Pack","value":"', packEsc, '"},',
            '{"trait_type":"Variant","value":"', uint256(d.variant).toString(), '"},',
            '{"trait_type":"Level","value":"', _levelName(d.level), '"},'
        );

        string memory traits2 = string.concat(
            '{"trait_type":"DNA","value":"', Strings.toHexString(uint256(d.dna), 32), '"},',
            '{"trait_type":"Dynamo citation","value":"', citation, '"},',
            '{"display_type":"date","trait_type":"Minted","value":',
            (d.mintedAt * 1000).toString(),
            '}]}'
        );

        string memory json = string.concat(head, traits1, traits2);

        return string.concat(
            "data:application/json;base64,",
            Base64.encode(bytes(json))
        );
    }

    function getTokenData(uint256 tokenId) external view returns (TokenData memory) {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist();
        return _data[tokenId];
    }

    function tokenByIdentity(string calldata did, bytes32 dna) external view returns (uint256) {
        // Returns 0 when no token exists for the key; use minted() for existence checks.
        return _idToToken[identityKey(did, dna)];
    }

    function minted(string calldata did, bytes32 dna) external view returns (bool) {
        return _idToToken[identityKey(did, dna)] != 0;
    }

    /// @notice OpenSea Level label for a stored level id.
    function levelName(uint8 level) public pure returns (string memory) {
        if (level >= MAX_LEVEL) revert InvalidLevel(level);
        return _levelName(level);
    }

    function _hasValidDid(string calldata did) internal pure returns (bool) {
        bytes memory b = bytes(did);
        if (b.length != _DID_LEN) return false;
        bytes memory prefix = "did:groover:";
        for (uint256 i = 0; i < _DID_PREFIX_LEN; i++) {
            if (b[i] != prefix[i]) return false;
        }
        for (uint256 i = _DID_PREFIX_LEN; i < _DID_LEN; i++) {
            uint8 c = uint8(b[i]);
            bool hexDigit = (c >= 0x30 && c <= 0x39)
                || (c >= 0x61 && c <= 0x66)
                || (c >= 0x41 && c <= 0x46);
            if (!hexDigit) return false;
        }
        return true;
    }

    function _levelName(uint8 level) internal pure returns (string memory) {
        if (level == 4) return "Celestial";
        if (level == 3) return "Resonant";
        if (level == 2) return "Unstable";
        if (level == 1) return "Dissonant";
        return "Unknown";
    }

    function _hasControlChars(string memory s) internal pure returns (bool) {
        bytes memory b = bytes(s);
        for (uint256 i = 0; i < b.length; i++) {
            if (uint8(b[i]) < 0x20) return true;
        }
        return false;
    }

    function _escape(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        uint256 escapes = 0;
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] == '"' || b[i] == '\\') escapes++;
        }
        if (escapes == 0) return s;

        bytes memory out = new bytes(b.length + escapes);
        uint256 j = 0;
        for (uint256 i = 0; i < b.length; i++) {
            uint8 c = uint8(b[i]);
            if (c == uint8(bytes1('"')) || c == uint8(bytes1('\\'))) out[j++] = '\\';
            out[j++] = bytes1(c);
        }
        return string(out);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721Enumerable, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}