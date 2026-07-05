// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockERC20
/// @notice A simple, mintable ERC-20 used to represent the two sides of a
///         simulated liquidity pool (e.g. "USDC-SIM" and "ETH-SIM"). This
///         token carries no real-world value — it exists purely so the
///         Liquidity Pool Simulator has something concrete to move around.
/// @dev Anyone can call `faucet()` to mint themselves a starter balance so
///      that trying the simulator never requires sourcing real tokens.
///      This is intentional and safe *only* because the token itself is
///      valueless play-money for the simulator; never reuse this pattern
///      for a token that is meant to hold real value.
contract MockERC20 is ERC20, Ownable {
    uint8 private immutable _decimals;

    /// @notice Maximum a single faucet call can mint, to keep the demo sane.
    uint256 public constant FAUCET_AMOUNT = 10_000 ether;

    event Faucet(address indexed to, uint256 amount);

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address initialOwner
    ) ERC20(name_, symbol_) Ownable(initialOwner) {
        _decimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /// @notice Mint a fixed starter balance to the caller. Public and
    ///         unrestricted by design — this is play money for an
    ///         educational simulator, not a real asset.
    function faucet() external {
        _mint(msg.sender, FAUCET_AMOUNT);
        emit Faucet(msg.sender, FAUCET_AMOUNT);
    }

    /// @notice Owner-only mint, useful for seeding scripted demo scenarios.
    function ownerMint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
