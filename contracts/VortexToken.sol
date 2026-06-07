// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "./TemporalContainer.sol";

/// @title VortexToken
/// @notice ERC-721 minted for each high-threshold temporal container
/// @dev Token metadata is fully on-chain (base64-encoded JSON).
///      Anyone can mint a token for any container by donating ETH (no minimum).
contract VortexToken is ERC721, AccessControl {
    using Strings for uint256;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    TemporalContainerRegistry public immutable registry;

    address public treasury;

    /// Container data stored per token for on-chain metadata
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

    uint256 private _nextTokenId;
    mapping(uint256 => ContainerData) private _containerData;
    mapping(bytes32 => uint256) private _containerIdToToken;

    uint256 public totalDonations;

    event VortexMinted(
        uint256 indexed tokenId,
        bytes32 indexed containerId,
        address indexed to,
        uint256 timestamp,
        string verdict
    );

    event DonationReceived(
        address indexed from,
        uint256 amount,
        bytes32 indexed containerId,
        uint256 indexed tokenId
    );

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    constructor(address _registry, address _treasury) ERC721("Dynamo Vortex", "VRTX") {
        require(_registry != address(0), "Invalid registry address");
        require(_treasury != address(0), "Invalid treasury address");
        registry = TemporalContainerRegistry(_registry);
        treasury = _treasury;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /// @notice Mint a token for a container. Only MINTER_ROLE can call.
    function mint(
        address to,
        bytes32 containerId,
        ContainerData calldata data
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        return _mintWithData(to, containerId, data);
    }

    /// @notice Anyone can mint a token for any verified container by donating ETH.
    ///         No minimum donation — value is whatever you choose.
    function mintForDonation(bytes32 containerId) external payable returns (uint256) {
        require(_containerIdToToken[containerId] == 0, "Vortex already minted for this container");

        TemporalContainerRegistry.TemporalContainer memory c = registry.getContainer(containerId);

        uint256 tokenId = ++_nextTokenId;
        _safeMint(msg.sender, tokenId);

        _containerData[tokenId] = ContainerData({
            containerId: containerId,
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
        });

        _containerIdToToken[containerId] = tokenId;

        totalDonations += msg.value;

        if (msg.value > 0) {
            (bool sent, ) = treasury.call{value: msg.value}("");
            require(sent, "Donation forward failed");
        }

        emit VortexMinted(tokenId, containerId, msg.sender, c.timestamp, c.resonanceProfile.verdict);
        emit DonationReceived(msg.sender, msg.value, containerId, tokenId);

        return tokenId;
    }

    /// @notice Admin can update the treasury address.
    function setTreasury(address _newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_newTreasury != address(0), "Invalid treasury address");
        emit TreasuryUpdated(treasury, _newTreasury);
        treasury = _newTreasury;
    }

    /// @notice Internal mint with full container data
    function _mintWithData(
        address to,
        bytes32 containerId,
        ContainerData calldata data
    ) internal returns (uint256) {
        require(_containerIdToToken[containerId] == 0, "Vortex already minted for this container");

        uint256 tokenId = ++_nextTokenId;
        _safeMint(to, tokenId);

        _containerData[tokenId] = ContainerData({
            containerId: data.containerId,
            timestamp: data.timestamp,
            verdict: data.verdict,
            fullBox7DComposite: data.fullBox7DComposite,
            trinitariumMoralScore: data.trinitariumMoralScore,
            trinitariumGematriaFusion: data.trinitariumGematriaFusion,
            moralTension: data.moralTension,
            waveProximity: data.waveProximity,
            phaseAlignment: data.phaseAlignment,
            calibratedVortex: data.calibratedVortex,
            calibratedSync: data.calibratedSync,
            neuralProximity: data.neuralProximity,
            neuralVortex: data.neuralVortex,
            gematriaResonance: data.gematriaResonance,
            virtueAlignment: data.virtueAlignment,
            moralSafety: data.moralSafety,
            intentAlignment: data.intentAlignment,
            source: data.source,
            containerHash: data.containerHash
        });

        _containerIdToToken[containerId] = tokenId;
        emit VortexMinted(tokenId, containerId, to, data.timestamp, data.verdict);

        return tokenId;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        ContainerData storage c = _containerData[tokenId];

        string memory head = string.concat(
            '{"name":"Dynamo Vortex #', tokenId.toString(),
            unicode'","description":"A temporal resonance vortex captured by the Dynamo engine — a moment when human intention was evaluated against the 7D Full Box and Trinitarium Moral Overlay.","attributes":['
        );
        string memory traits1 = string.concat(
            '{"trait_type":"Verdict","value":"', c.verdict, '"},',
            '{"trait_type":"7D Composite","value":"', _formatScaled(c.fullBox7DComposite), '"},',
            '{"trait_type":"TMO Score","value":"', _formatScaled(c.trinitariumMoralScore), '"},',
            '{"trait_type":"Fusion","value":"', _formatScaled(c.trinitariumGematriaFusion), '"},',
            '{"trait_type":"Moral Tension","value":"', c.moralTension, '"},',
            '{"trait_type":"Source","value":"', c.source, '"},'
        );
        string memory traits2 = string.concat(
            '{"trait_type":"Wave Proximity","value":"', _formatScaled(c.waveProximity), '"},',
            '{"trait_type":"Phase Alignment","value":"', _formatScaled(c.phaseAlignment), '"},',
            '{"trait_type":"Calibrated Vortex","value":"', _formatScaled(c.calibratedVortex), '"},',
            '{"trait_type":"Calibrated Sync","value":"', _formatScaled(c.calibratedSync), '"},',
            '{"trait_type":"Neural Proximity","value":"', _formatScaled(c.neuralProximity), '"},',
            '{"trait_type":"Neural Vortex","value":"', _formatScaled(c.neuralVortex), '"},'
        );
        string memory traits3 = string.concat(
            '{"trait_type":"Gematria Resonance","value":"', _formatScaled(c.gematriaResonance), '"},',
            '{"trait_type":"Virtue Alignment","value":"', _formatScaled(c.virtueAlignment), '"},',
            '{"trait_type":"Moral Safety","value":"', _formatScaled(c.moralSafety), '"},',
            '{"trait_type":"Intent Alignment","value":"', _formatScaled(c.intentAlignment), '"},',
            '{"display_type":"date","trait_type":"Minted","value":', c.timestamp.toString(), '}'
        );
        string memory json = string.concat(head, traits1, traits2, traits3, '],"external_url":"https://dynamo.rippel.ai"}');

        return string.concat(
            "data:application/json;base64,",
            Base64.encode(bytes(json))
        );
    }

    function getContainerData(uint256 tokenId) external view returns (ContainerData memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return _containerData[tokenId];
    }

    function tokenByContainerId(bytes32 containerId) external view returns (uint256) {
        require(_containerIdToToken[containerId] != 0, "No token for this container");
        return _containerIdToToken[containerId];
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    function _formatScaled(uint256 value) internal pure returns (string memory) {
        uint256 integer = value / 1e18;
        uint256 fraction = (value % 1e18) / 1e14;
        return string.concat(integer.toString(), ".", _padZeros(fraction.toString(), 4));
    }

    function _padZeros(string memory s, uint256 desired) internal pure returns (string memory) {
        if (bytes(s).length >= desired) return s;
        bytes memory padded = new bytes(desired);
        bytes memory sBytes = bytes(s);
        uint256 padLen = desired - sBytes.length;
        for (uint256 i = 0; i < desired; i++) {
            padded[i] = i < padLen ? bytes1(0x30) : sBytes[i - padLen];
        }
        return string(padded);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    receive() external payable {
        revert("Send ETH via mintForDonation");
    }
}
