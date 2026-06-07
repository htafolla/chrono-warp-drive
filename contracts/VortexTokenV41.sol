// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "./TemporalContainer.sol";

contract VortexTokenV41 is ERC721Enumerable, AccessControl {
    using Strings for uint256;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    TemporalContainerRegistry public immutable registry;
    address public treasury;

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

    function mint(
        address to,
        bytes32 containerId,
        ContainerData calldata data
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        return _mintWithData(to, containerId, data);
    }

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
            containerHash: c.containerHash,
            hammerReason: c.hammerReason,
            proposalText: ""
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

    function setTreasury(address _newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_newTreasury != address(0), "Invalid treasury address");
        emit TreasuryUpdated(treasury, _newTreasury);
        treasury = _newTreasury;
    }

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
            containerHash: data.containerHash,
            hammerReason: data.hammerReason,
            proposalText: data.proposalText
        });

        _containerIdToToken[containerId] = tokenId;
        emit VortexMinted(tokenId, containerId, to, data.timestamp, data.verdict);

        return tokenId;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        ContainerData storage c = _containerData[tokenId];

        string memory desc = bytes(c.hammerReason).length > 0
            ? c.hammerReason
            : unicode"A temporal resonance vortex captured by the Dynamo engine.";

        string memory head = string.concat(
            '{"name":"Dynamo Vortex #', tokenId.toString(),
            '","description":"', desc,
            unicode'","image":"https://mcp-production-80e2.up.railway.app/vortex/token-image/',
            tokenId.toString(), '","attributes":['
        );
        string memory traits1 = string.concat(
            '{"trait_type":"Verdict","value":"', c.verdict, '"},',
            '{"trait_type":"7D Composite","value":"', _fmt(c.fullBox7DComposite), '"},',
            '{"trait_type":"TMO Score","value":"', _fmt(c.trinitariumMoralScore), '"},',
            '{"trait_type":"Fusion","value":"', _fmt(c.trinitariumGematriaFusion), '"},',
            '{"trait_type":"Moral Tension","value":"', c.moralTension, '"},',
            '{"trait_type":"Source","value":"', c.source, '"},'
        );
        string memory traits2 = string.concat(
            '{"trait_type":"Wave Proximity","value":"', _fmt(c.waveProximity), '"},',
            '{"trait_type":"Phase Alignment","value":"', _fmt(c.phaseAlignment), '"},',
            '{"trait_type":"Calibrated Vortex","value":"', _fmt(c.calibratedVortex), '"},',
            '{"trait_type":"Calibrated Sync","value":"', _fmt(c.calibratedSync), '"},',
            '{"trait_type":"Neural Proximity","value":"', _fmt(c.neuralProximity), '"},',
            '{"trait_type":"Neural Vortex","value":"', _fmt(c.neuralVortex), '"},'
        );
        string memory traits3 = string.concat(
            '{"trait_type":"Gematria Resonance","value":"', _fmt(c.gematriaResonance), '"},',
            '{"trait_type":"Virtue Alignment","value":"', _fmt(c.virtueAlignment), '"},',
            '{"trait_type":"Moral Safety","value":"', _fmt(c.moralSafety), '"},',
            '{"trait_type":"Intent Alignment","value":"', _fmt(c.intentAlignment), '"},'
        );
        string memory traits4 = string.concat(
            '{"display_type":"date","trait_type":"Minted","value":', (c.timestamp * 1000).toString(), '}'
        );

        string memory proposalAttr = bytes(c.proposalText).length > 0
            ? string.concat(',{"trait_type":"Proposal","value":"', c.proposalText, '"}')
            : "";

        string memory json = string.concat(head, traits1, traits2, traits3, traits4, proposalAttr, '],"external_url":"https://dynamo.rippel.ai"}');

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

    function _fmt(uint256 value) internal pure returns (string memory) {
        return Strings.toString(value / 1e16);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721Enumerable, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    receive() external payable {
        revert("Send ETH via mintForDonation");
    }
}
