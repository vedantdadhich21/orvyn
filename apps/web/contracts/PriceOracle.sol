// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * Testnet price oracle in the Chainlink shape: USD with eight decimals.
 *
 * This is an explicitly labelled demo feed, not a Chainlink feed. The owner is
 * the launch updater; replacing this with real feeds is a week two task.
 */
contract PriceOracle is Ownable {
    mapping(address asset => uint256 price) public price;
    mapping(address asset => uint256 timestamp) public updatedAt;

    event PriceSet(address indexed asset, uint256 price, uint256 updatedAt);

    error InvalidPrice();
    error NoPrice(address asset);

    constructor() Ownable(msg.sender) {}

    function setPrice(address asset, uint256 usdPrice) public onlyOwner {
        if (usdPrice == 0) revert InvalidPrice();
        price[asset] = usdPrice;
        updatedAt[asset] = block.timestamp;
        emit PriceSet(asset, usdPrice, block.timestamp);
    }

    function setPrices(address[] calldata assets, uint256[] calldata usdPrices) external onlyOwner {
        if (assets.length != usdPrices.length) revert InvalidPrice();
        for (uint256 i = 0; i < assets.length; i++) {
            setPrice(assets[i], usdPrices[i]);
        }
    }

    function getPrice(address asset) external view returns (uint256) {
        uint256 value = price[asset];
        if (value == 0) revert NoPrice(asset);
        return value;
    }
}
