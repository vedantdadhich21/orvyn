// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

import {PriceOracle} from "./PriceOracle.sol";

interface ITestStock is IERC20 {
    function mint(address to, uint256 amount) external;
    function burn(uint256 amount) external;
}

/**
 * A minimal testnet exchange. tUSDC goes in, stock tokens are minted at the
 * oracle price; selling burns the stock and returns tUSDC from the pool.
 *
 * No owner, no fees, no pause and no upgrade path. Testnet only. The pool is
 * the tUSDC buyers have paid in, so a sell can only pay out what is there.
 */
contract OrvynExchange is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    PriceOracle public immutable oracle;

    event Trade(
        address indexed trader,
        address indexed stock,
        bool indexed isBuy,
        uint256 usdcAmount,
        uint256 stockAmount,
        uint256 price
    );

    error InvalidAmount();
    error Slippage();

    constructor(IERC20 usdc_, PriceOracle oracle_) {
        usdc = usdc_;
        oracle = oracle_;
    }

    /// tUSDC has 6 decimals, stock has 18, the price has 8.
    function previewBuy(address stock, uint256 usdcAmount) public view returns (uint256) {
        uint256 price = oracle.getPrice(stock);
        return Math.mulDiv(usdcAmount, 1e20, price);
    }

    function previewSell(address stock, uint256 stockAmount) public view returns (uint256) {
        uint256 price = oracle.getPrice(stock);
        return Math.mulDiv(stockAmount, price, 1e20);
    }

    function buy(address stock, uint256 usdcAmount, uint256 minStockOut) external nonReentrant {
        if (usdcAmount == 0) revert InvalidAmount();
        uint256 price = oracle.getPrice(stock);
        uint256 stockAmount = Math.mulDiv(usdcAmount, 1e20, price);
        if (stockAmount == 0 || stockAmount < minStockOut) revert Slippage();

        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        ITestStock(stock).mint(msg.sender, stockAmount);

        emit Trade(msg.sender, stock, true, usdcAmount, stockAmount, price);
    }

    function sell(address stock, uint256 stockAmount, uint256 minUsdcOut) external nonReentrant {
        if (stockAmount == 0) revert InvalidAmount();
        uint256 price = oracle.getPrice(stock);
        uint256 usdcAmount = Math.mulDiv(stockAmount, price, 1e20);
        if (usdcAmount == 0 || usdcAmount < minUsdcOut) revert Slippage();

        IERC20 stockToken = IERC20(stock);
        stockToken.safeTransferFrom(msg.sender, address(this), stockAmount);
        ITestStock(stock).burn(stockAmount);
        usdc.safeTransfer(msg.sender, usdcAmount);

        emit Trade(msg.sender, stock, false, usdcAmount, stockAmount, price);
    }
}
