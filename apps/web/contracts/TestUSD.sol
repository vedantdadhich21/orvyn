// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * ORVYN test USD. Six decimals, a daily faucet, no owner and no mint path for
 * anyone except the faucet. Testnet only; this token has no value.
 */
contract TestUSD is ERC20 {
    uint256 public constant FAUCET_AMOUNT = 1_000 * 1e6;
    uint256 public constant FAUCET_COOLDOWN = 1 days;

    mapping(address account => uint256 timestamp) public lastClaim;

    event Claimed(address indexed account, uint256 amount);

    error FaucetCooldown(uint256 availableAt);

    constructor() ERC20("ORVYN Test USD", "tUSDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function claim() external {
        uint256 availableAt = lastClaim[msg.sender] + FAUCET_COOLDOWN;
        if (block.timestamp < availableAt) revert FaucetCooldown(availableAt);

        lastClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        emit Claimed(msg.sender, FAUCET_AMOUNT);
    }
}
