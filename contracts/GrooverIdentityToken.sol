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
contract GrooverIdentityToken is ERC721Enumerable, AccessControl {
    using Strings for uint256;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint8 public constant MAX_VARIANT = 16;
    string public constant IMAGE_BASE =
        "https://registry-production-e2c4.up.railway.app/identity/token-image/";

    uint256 private constant _DID_PREFIX_LEN = 12; // "did:groover:" is 12 bytes
    uint256 private constant _DID_MIN_LEN = 25;

    struct TokenData {
        string did;             // did:groover:<16 hex>
        bytes32 dna;            // keccak256 of canonical pack DNA
        string pack;            // "0xray-suit" | "groover-identity" | future
        uint8 variant;          // 0 .. MAX_VARIANT-1
        bytes32 dynamoCitation; // optional; bytes32(0) if none
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
    error ZeroAddress();
    error TokenDoesNotExist();

    constructor(address admin, address minter) ERC721("Groover Identity", "GRVR") {
        if (admin == address(0) || minter == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, minter);
    }

    function identityKey(string calldata did, bytes32 dna) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(did, dna));
    }

    function mint(
        address to,
        string calldata did,
        bytes32 dna,
        string calldata pack,
        uint8 variant,
        bytes32 dynamoCitation
    ) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        if (to == address(0)) revert ZeroAddress();
        if (!_hasValidDid(did)) revert InvalidDid();
        if (bytes(pack).length == 0 || bytes(pack).length > 64) revert InvalidPack();
        if (variant >= MAX_VARIANT) revert InvalidVariant(variant);

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
            mintedAt: block.timestamp
        });

        _idToToken[key] = tokenId;

        _safeMint(to, tokenId);

        emit IdentityMinted(tokenId, key, to, did, pack, variant);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist();
        TokenData storage d = _data[tokenId];

        string memory didEsc = _escape(d.did);
        string memory packEsc = _escape(d.pack);
        string memory citation = d.dynamoCitation == bytes32(0)
            ? "none"
            : Strings.toHexString(uint256(d.dynamoCitation), 32);

        string memory head = string.concat(
            '{"name":"Groover Identity #', tokenId.toString(),
            '","description":"1/1 identity mark for ', didEsc,
            '. Pack ', packEsc, ', variant ', uint256(d.variant).toString(),
            '","image":"', IMAGE_BASE, tokenId.toString(),
            '","external_url":"https://registry-production-e2c4.up.railway.app","attributes":['
        );

        string memory traits1 = string.concat(
            '{"trait_type":"DID","value":"', didEsc, '"},',
            '{"trait_type":"Pack","value":"', packEsc, '"},',
            '{"trait_type":"Variant","value":"', uint256(d.variant).toString(), '"},'
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
        return _idToToken[identityKey(did, dna)];
    }

    function minted(string calldata did, bytes32 dna) external view returns (bool) {
        return _idToToken[identityKey(did, dna)] != 0;
    }

    function _hasValidDid(string calldata did) internal pure returns (bool) {
        bytes memory b = bytes(did);
        if (b.length < _DID_MIN_LEN) return false;
        bytes memory prefix = "did:groover:";
        for (uint256 i = 0; i < _DID_PREFIX_LEN; i++) {
            if (i >= b.length) return false;
            if (b[i] != prefix[i]) return false;
        }
        return true;
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