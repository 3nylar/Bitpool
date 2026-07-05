// Pure math helpers that mirror LiquidityPoolAMM.sol exactly, so the
// frontend can show instant "you will receive ~X" / impermanent-loss
// previews without waiting on a round-trip contract read for every
// keystroke. The actual transaction always re-derives the real output
// on-chain -- these are previews only, never a source of truth for a
// state-changing action.

const BPS_DENOMINATOR = 10_000n;

/** Constant-product swap output, replicating LiquidityPoolAMM.getAmountOut. */
export function getAmountOut(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  feeBps: bigint
): bigint {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) return 0n;
  const amountInWithFee = amountIn * (BPS_DENOMINATOR - feeBps);
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * BPS_DENOMINATOR + amountInWithFee;
  return numerator / denominator;
}

/** Price impact of a hypothetical trade, as a fraction (0.05 = 5%). */
export function priceImpact(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  feeBps: bigint
): number {
  if (reserveIn <= 0n || reserveOut <= 0n || amountIn <= 0n) return 0;
  const spotPriceBefore = Number(reserveOut) / Number(reserveIn);
  const amountOut = getAmountOut(amountIn, reserveIn, reserveOut, feeBps);
  const effectivePrice = Number(amountOut) / Number(amountIn);
  if (spotPriceBefore === 0) return 0;
  return Math.max(0, 1 - effectivePrice / spotPriceBefore);
}

/** Matches LiquidityPoolAMM.quote: proportional amount of the paired token. */
export function quote(amountA: bigint, reserveA: bigint, reserveB: bigint): bigint {
  if (amountA <= 0n || reserveA <= 0n || reserveB <= 0n) return 0n;
  return (amountA * reserveB) / reserveA;
}

/**
 * Closed-form impermanent loss as a function of the price ratio (new price /
 * price at deposit time), matching the standard AMM reference formula:
 *   IL(r) = 2*sqrt(r) / (1 + r) - 1
 * Returns a negative fraction (e.g. -0.057 = -5.7%) representing the LP's
 * value shortfall versus simply holding the original tokens.
 */
export function impermanentLoss(priceRatio: number): number {
  if (priceRatio <= 0) return 0;
  return (2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1;
}

/**
 * Given a user's deposit snapshot (amounts + price at time of deposit) and
 * the current price, returns both the "if you had just held" value and the
 * actual current LP value, in terms of tokenB (the quote asset) -- the pair
 * the impermanent-loss chart plots against each other.
 */
export function hodlVsLpValue(params: {
  depositedA: number;
  depositedB: number;
  priceAInBAtDeposit: number;
  currentPriceAInB: number;
}): { hodlValue: number; lpValue: number; ilFraction: number } {
  const { depositedA, depositedB, priceAInBAtDeposit, currentPriceAInB } = params;
  const priceRatio = priceAInBAtDeposit > 0 ? currentPriceAInB / priceAInBAtDeposit : 1;

  const hodlValue = depositedA * currentPriceAInB + depositedB;

  const ilFraction = impermanentLoss(priceRatio);
  // LP value = HODL value scaled by (1 + IL fraction), since IL is defined
  // relative to the HODL baseline.
  const lpValue = hodlValue * (1 + ilFraction);

  return { hodlValue, lpValue, ilFraction };
}
