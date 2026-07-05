// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title LiquidityPoolAMM
/// @notice An educational, Uniswap-V2-style constant-product (x * y = k)
///         automated market maker for exactly two ERC-20 tokens. Liquidity
///         providers deposit both tokens and receive LP tokens (this
///         contract is itself the LP token) representing their share of
///         the pool; traders swap one token for the other, paying a small
///         fee that stays in the pool and is shared by all LPs.
///
/// @dev    THIS CONTRACT IS FOR EDUCATIONAL / LOCAL-CHAIN / TESTNET USE
///         ONLY. It has not been professionally audited and must never be
///         deployed with, or used to custody, real mainnet funds. Its
///         purpose is to let people safely learn how constant-product AMMs,
///         liquidity provision, swap fees, and impermanent loss actually
///         behave, by watching real (if valueless) on-chain state change.
///
///         Design notes for reviewers:
///          - Reserves are tracked explicitly (not via balanceOf sync) for
///            pedagogical clarity: every state change is a simple, readable
///            arithmetic step rather than an implicit balance diff.
///          - The classic "first depositor" share-price manipulation attack
///            (mint a tiny amount of LP tokens, then donate tokens directly
///            to inflate the exchange rate and steal from the next
///            depositor via rounding) is mitigated exactly as Uniswap V2
///            does: a MINIMUM_LIQUIDITY amount of LP tokens is permanently
///            locked (minted to a burn address) on the very first deposit,
///            which makes the attack economically unprofitable.
///          - All value-moving functions follow checks-effects-interactions
///            and are additionally guarded with ReentrancyGuard.
contract LiquidityPoolAMM is ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice The two tokens held by this pool. Immutable once deployed.
    IERC20 public immutable tokenA;
    IERC20 public immutable tokenB;

    /// @notice Swap fee in basis points (1 bps = 0.01%). Default 30 = 0.3%,
    ///         matching the industry-standard Uniswap V2 fee.
    uint256 public immutable feeBps;
    uint256 private constant BPS_DENOMINATOR = 10_000;

    /// @notice Internally tracked reserves — the pool's single source of
    ///         truth for pricing and payout math.
    uint256 public reserveA;
    uint256 public reserveB;

    /// @notice A small amount of LP tokens permanently locked on first
    ///         deposit to neutralize the first-depositor manipulation
    ///         attack. Sent to a conventional "burn" address rather than
    ///         address(0), since OpenZeppelin's ERC20 rejects minting to
    ///         the zero address.
    uint256 public constant MINIMUM_LIQUIDITY = 1000;
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    event LiquidityAdded(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 lpMinted
    );
    event LiquidityRemoved(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 lpBurned
    );
    event Swap(
        address indexed trader,
        address indexed tokenIn,
        uint256 amountIn,
        uint256 amountOut,
        uint256 newReserveA,
        uint256 newReserveB
    );

    error IdenticalTokens();
    error ZeroAddress();
    error InsufficientInputAmount();
    error InsufficientLiquidityMinted();
    error InsufficientLiquidityBurned();
    error InsufficientAAmount();
    error InsufficientBAmount();
    error InsufficientOutputAmount();
    error InvalidToken();
    error InsufficientLiquidity();
    error Expired();

    /// @param _tokenA First pool token.
    /// @param _tokenB Second pool token.
    /// @param _feeBps Swap fee in basis points (e.g. 30 for 0.3%).
    /// @param _name LP token name, e.g. "LP SIM-USDC/SIM-ETH".
    /// @param _symbol LP token symbol, e.g. "LP-SIMPOOL".
    constructor(
        address _tokenA,
        address _tokenB,
        uint256 _feeBps,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) {
        if (_tokenA == address(0) || _tokenB == address(0)) revert ZeroAddress();
        if (_tokenA == _tokenB) revert IdenticalTokens();
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
        feeBps = _feeBps;
    }

    modifier notExpired(uint256 deadline) {
        if (deadline != 0 && block.timestamp > deadline) revert Expired();
        _;
    }

    // ---------------------------------------------------------------
    // Liquidity provision
    // ---------------------------------------------------------------

    /// @notice Deposit both tokens and receive LP tokens representing your
    ///         share of the pool. On the very first deposit you set the
    ///         pool's initial price ratio; every deposit after that must
    ///         (approximately) match the current ratio — the contract
    ///         automatically uses the largest amounts that fit that ratio
    ///         within what you offered, so you never lose funds to a
    ///         mismatched ratio, you simply may deposit slightly less than
    ///         your "Desired" amounts.
    /// @param amountADesired Maximum amount of tokenA you're willing to add.
    /// @param amountBDesired Maximum amount of tokenB you're willing to add.
    /// @param amountAMin Minimum acceptable amount of tokenA actually used (slippage guard).
    /// @param amountBMin Minimum acceptable amount of tokenB actually used (slippage guard).
    /// @param to Address to receive the minted LP tokens.
    /// @param deadline Unix timestamp after which this call reverts (0 = no deadline).
    function addLiquidity(
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        nonReentrant
        notExpired(deadline)
        returns (uint256 amountA, uint256 amountB, uint256 liquidity)
    {
        if (to == address(0)) revert ZeroAddress();

        (amountA, amountB) = _computeLiquidityAmounts(
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin
        );

        uint256 supply = totalSupply();
        if (supply == 0) {
            // First deposit: sets the initial price ratio.
            liquidity = _sqrt(amountA * amountB) - MINIMUM_LIQUIDITY;
            _mint(BURN_ADDRESS, MINIMUM_LIQUIDITY);
        } else {
            liquidity = _min(
                (amountA * supply) / reserveA,
                (amountB * supply) / reserveB
            );
        }
        if (liquidity == 0) revert InsufficientLiquidityMinted();

        tokenA.safeTransferFrom(msg.sender, address(this), amountA);
        tokenB.safeTransferFrom(msg.sender, address(this), amountB);

        reserveA += amountA;
        reserveB += amountB;
        _mint(to, liquidity);

        emit LiquidityAdded(to, amountA, amountB, liquidity);
    }

    /// @notice Burn LP tokens to withdraw your proportional share of both
    ///         reserves — including any trading fees accrued since you
    ///         deposited, since fees grow the reserves without minting new
    ///         LP tokens.
    /// @param liquidity Amount of LP tokens to burn.
    /// @param amountAMin Minimum acceptable tokenA payout (slippage guard).
    /// @param amountBMin Minimum acceptable tokenB payout (slippage guard).
    /// @param to Address to receive the withdrawn tokens.
    /// @param deadline Unix timestamp after which this call reverts (0 = no deadline).
    function removeLiquidity(
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external nonReentrant notExpired(deadline) returns (uint256 amountA, uint256 amountB) {
        if (to == address(0)) revert ZeroAddress();
        if (liquidity == 0) revert InsufficientLiquidityBurned();

        uint256 supply = totalSupply();
        amountA = (liquidity * reserveA) / supply;
        amountB = (liquidity * reserveB) / supply;
        if (amountA == 0 || amountB == 0) revert InsufficientLiquidityBurned();
        if (amountA < amountAMin) revert InsufficientAAmount();
        if (amountB < amountBMin) revert InsufficientBAmount();

        _burn(msg.sender, liquidity);
        reserveA -= amountA;
        reserveB -= amountB;

        tokenA.safeTransfer(to, amountA);
        tokenB.safeTransfer(to, amountB);

        emit LiquidityRemoved(msg.sender, amountA, amountB, liquidity);
    }

    // ---------------------------------------------------------------
    // Swapping
    // ---------------------------------------------------------------

    /// @notice Swap an exact input amount of one pool token for the other,
    ///         at the price implied by the constant-product formula at the
    ///         moment this transaction executes.
    /// @param tokenIn Address of the token you're sending in (must be tokenA or tokenB).
    /// @param amountIn Amount of tokenIn to swap.
    /// @param minAmountOut Minimum acceptable output amount (slippage guard) — reverts otherwise.
    /// @param to Address to receive the output tokens.
    /// @param deadline Unix timestamp after which this call reverts (0 = no deadline).
    function swap(
        address tokenIn,
        uint256 amountIn,
        uint256 minAmountOut,
        address to,
        uint256 deadline
    ) external nonReentrant notExpired(deadline) returns (uint256 amountOut) {
        if (to == address(0)) revert ZeroAddress();
        if (amountIn == 0) revert InsufficientInputAmount();
        if (tokenIn != address(tokenA) && tokenIn != address(tokenB)) revert InvalidToken();
        if (reserveA == 0 || reserveB == 0) revert InsufficientLiquidity();

        bool inputIsA = tokenIn == address(tokenA);
        (uint256 reserveIn, uint256 reserveOut) = inputIsA
            ? (reserveA, reserveB)
            : (reserveB, reserveA);

        amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        if (amountOut < minAmountOut) revert InsufficientOutputAmount();
        if (amountOut == 0) revert InsufficientOutputAmount();

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        if (inputIsA) {
            reserveA += amountIn;
            reserveB -= amountOut;
            tokenB.safeTransfer(to, amountOut);
        } else {
            reserveB += amountIn;
            reserveA -= amountOut;
            tokenA.safeTransfer(to, amountOut);
        }

        emit Swap(msg.sender, tokenIn, amountIn, amountOut, reserveA, reserveB);
    }

    /// @notice Execute several swaps back-to-back in a single transaction,
    ///         alternating/varying direction and size as instructed by the
    ///         caller. This exists purely so the frontend's "simulate market
    ///         activity" feature can move the pool price around realistically
    ///         with a single wallet signature, instead of prompting the user
    ///         to approve one popup per trade. Each leg is subject to the
    ///         exact same constant-product math, fee, and slippage guard as
    ///         a standalone `swap` call.
    /// @param tokenInIsA For each leg, true = swap tokenA into tokenB, false = the reverse.
    /// @param amountsIn Input amount for each corresponding leg.
    /// @param minAmountsOut Minimum acceptable output for each corresponding leg.
    function batchSwap(
        bool[] calldata tokenInIsA,
        uint256[] calldata amountsIn,
        uint256[] calldata minAmountsOut
    ) external nonReentrant returns (uint256[] memory amountsOut) {
        uint256 len = tokenInIsA.length;
        if (len == 0 || len != amountsIn.length || len != minAmountsOut.length) {
            revert InsufficientInputAmount();
        }
        amountsOut = new uint256[](len);

        for (uint256 i = 0; i < len; i++) {
            uint256 amountIn = amountsIn[i];
            if (amountIn == 0) revert InsufficientInputAmount();
            if (reserveA == 0 || reserveB == 0) revert InsufficientLiquidity();

            address tokenIn = tokenInIsA[i] ? address(tokenA) : address(tokenB);
            (uint256 reserveIn, uint256 reserveOut) = tokenInIsA[i]
                ? (reserveA, reserveB)
                : (reserveB, reserveA);

            uint256 amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
            if (amountOut == 0 || amountOut < minAmountsOut[i]) revert InsufficientOutputAmount();

            IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

            if (tokenInIsA[i]) {
                reserveA += amountIn;
                reserveB -= amountOut;
                tokenB.safeTransfer(msg.sender, amountOut);
            } else {
                reserveB += amountIn;
                reserveA -= amountOut;
                tokenA.safeTransfer(msg.sender, amountOut);
            }

            amountsOut[i] = amountOut;
            emit Swap(msg.sender, tokenIn, amountIn, amountOut, reserveA, reserveB);
        }
    }

    // ---------------------------------------------------------------
    // View / quote helpers (used by the frontend for live previews)
    // ---------------------------------------------------------------

    /// @notice Current reserves of both tokens.
    function getReserves() external view returns (uint256, uint256) {
        return (reserveA, reserveB);
    }

    /// @notice Spot price of tokenA denominated in tokenB, scaled by 1e18.
    ///         e.g. a return value of 2e18 means "1 tokenA = 2 tokenB".
    function getSpotPriceAinB() external view returns (uint256) {
        if (reserveA == 0) return 0;
        return (reserveB * 1e18) / reserveA;
    }

    /// @notice Given an exact input amount and the relevant reserves,
    ///         returns the output amount the pool would pay out, after fees,
    ///         under the constant-product formula. Pure math — no state
    ///         change — so the frontend can call this (or replicate it) to
    ///         show a live "you will receive ~X" preview before a trade.
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public view returns (uint256) {
        if (amountIn == 0) return 0;
        if (reserveIn == 0 || reserveOut == 0) return 0;
        uint256 amountInWithFee = amountIn * (BPS_DENOMINATOR - feeBps);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * BPS_DENOMINATOR) + amountInWithFee;
        return numerator / denominator;
    }

    /// @notice Given a desired amount of one token, returns the amount of
    ///         the other token needed to match the current pool ratio.
    ///         Used by the frontend to auto-fill the paired deposit amount.
    function quote(
        uint256 amountA,
        uint256 _reserveA,
        uint256 _reserveB
    ) public pure returns (uint256 amountB) {
        if (amountA == 0) revert InsufficientInputAmount();
        if (_reserveA == 0 || _reserveB == 0) revert InsufficientLiquidity();
        amountB = (amountA * _reserveB) / _reserveA;
    }

    // ---------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------

    function _computeLiquidityAmounts(
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal view returns (uint256 amountA, uint256 amountB) {
        if (reserveA == 0 && reserveB == 0) {
            return (amountADesired, amountBDesired);
        }
        uint256 amountBOptimal = quote(amountADesired, reserveA, reserveB);
        if (amountBOptimal <= amountBDesired) {
            if (amountBOptimal < amountBMin) revert InsufficientBAmount();
            return (amountADesired, amountBOptimal);
        }
        uint256 amountAOptimal = quote(amountBDesired, reserveB, reserveA);
        // amountAOptimal <= amountADesired is guaranteed by the ratio math above.
        if (amountAOptimal < amountAMin) revert InsufficientAAmount();
        return (amountAOptimal, amountBDesired);
    }

    /// @dev Babylonian method integer square root, standard in AMM math
    ///      for computing the geometric mean used in initial LP minting.
    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
