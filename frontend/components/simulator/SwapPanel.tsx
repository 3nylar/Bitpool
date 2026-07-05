"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EducationTip } from "@/components/ui/EducationTip";
import { CONTRACTS } from "@/lib/contracts/config";
import { fmtToken, fmtPercent, toUnits } from "@/lib/format";
import { getAmountOut, priceImpact } from "@/lib/math/amm";
import { useContractAction } from "@/lib/hooks/useContractAction";
import { useUserPosition } from "@/lib/hooks/useUserPosition";
import type { PoolState } from "@/lib/hooks/usePoolState";
import { ArrowDownUp, Loader2, AlertTriangle } from "lucide-react";

const SLIPPAGE_TOLERANCE = 0.005; // 0.5%

export function SwapPanel({ pool }: { pool: PoolState }) {
  const { isConnected, address } = useAccount();
  const { balanceA, balanceB, allowanceA, allowanceB, refetch } = useUserPosition();
  const [direction, setDirection] = useState<"AtoB" | "BtoA">("AtoB");
  const [amountInStr, setAmountInStr] = useState("");
  const approveAction = useContractAction();
  const swapAction = useContractAction();

  const tokenIn = direction === "AtoB" ? CONTRACTS.tokenA : CONTRACTS.tokenB;
  const tokenOut = direction === "AtoB" ? CONTRACTS.tokenB : CONTRACTS.tokenA;
  const reserveIn = direction === "AtoB" ? pool.reserveA : pool.reserveB;
  const reserveOut = direction === "AtoB" ? pool.reserveB : pool.reserveA;
  const balanceIn = direction === "AtoB" ? balanceA : balanceB;
  const allowanceIn = direction === "AtoB" ? allowanceA : allowanceB;

  const amountIn = toUnits(amountInStr);
  const amountOut = useMemo(
    () => getAmountOut(amountIn, reserveIn, reserveOut, BigInt(pool.feeBps)),
    [amountIn, reserveIn, reserveOut, pool.feeBps]
  );
  const impact = useMemo(
    () => priceImpact(amountIn, reserveIn, reserveOut, BigInt(pool.feeBps)),
    [amountIn, reserveIn, reserveOut, pool.feeBps]
  );
  const minAmountOut = useMemo(() => {
    const scaled = (amountOut * BigInt(Math.round((1 - SLIPPAGE_TOLERANCE) * 10_000))) / 10_000n;
    return scaled;
  }, [amountOut]);

  const needsApproval = amountIn > 0n && allowanceIn < amountIn;
  const insufficientBalance = amountIn > 0n && amountIn > balanceIn;
  const highImpact = impact > 0.05;

  function swapDirection() {
    setDirection((d) => (d === "AtoB" ? "BtoA" : "AtoB"));
    setAmountInStr("");
  }

  async function handleApprove() {
    await approveAction.execute({
      address: tokenIn.address,
      abi: tokenIn.abi,
      functionName: "approve",
      args: [CONTRACTS.pool.address, amountIn],
    });
    refetch();
  }

  async function handleSwap() {
    if (!address) return;
    await swapAction.execute({
      address: CONTRACTS.pool.address,
      abi: CONTRACTS.pool.abi,
      functionName: "swap",
      args: [tokenIn.address, amountIn, minAmountOut, address, 0n],
    });
    setAmountInStr("");
    refetch();
    pool.refetch();
  }

  return (
    <Card className="p-6">
      <h3 className="font-display font-semibold text-lg mb-4">Swap</h3>

      <div className="rounded-xl border border-line p-4">
        <div className="flex justify-between text-xs text-ink-faint mb-2">
          <span>You pay</span>
          <span>
            Balance: <span className="font-mono-num">{fmtToken(balanceIn)}</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            inputMode="decimal"
            placeholder="0.0"
            value={amountInStr}
            onChange={(e) => setAmountInStr(e.target.value)}
            className="flex-1 bg-transparent text-2xl font-mono-num outline-none min-w-0"
          />
          <span
            className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 flex-shrink-0"
            style={{
              background: direction === "AtoB" ? "var(--teal-soft)" : "var(--coral-soft)",
              color: direction === "AtoB" ? "var(--teal)" : "var(--coral)",
            }}
          >
            {tokenIn.symbol}
          </span>
        </div>
      </div>

      <div className="flex justify-center -my-2 relative z-10">
        <button
          type="button"
          onClick={swapDirection}
          className="w-9 h-9 rounded-xl bg-surface border border-line shadow-soft flex items-center justify-center hover:bg-canvas-alt transition-colors"
          aria-label="Reverse swap direction"
        >
          <ArrowDownUp size={15} />
        </button>
      </div>

      <div className="rounded-xl border border-line p-4 bg-canvas-alt">
        <div className="text-xs text-ink-faint mb-2">You receive (estimated)</div>
        <div className="flex items-center gap-3">
          <span className="flex-1 text-2xl font-mono-num text-ink-soft min-w-0 truncate">
            {amountIn > 0n ? fmtToken(amountOut) : "0.0"}
          </span>
          <span
            className="px-3 py-1.5 rounded-lg text-sm font-medium flex-shrink-0"
            style={{
              background: direction === "AtoB" ? "var(--coral-soft)" : "var(--teal-soft)",
              color: direction === "AtoB" ? "var(--coral)" : "var(--teal)",
            }}
          >
            {tokenOut.symbol}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between text-ink-soft">
          <span className="flex items-center gap-1">
            Price impact
            <EducationTip label="Price impact">
              How much your trade itself moves the pool&apos;s price. Larger
              trades relative to the pool&apos;s size cause bigger impact.
            </EducationTip>
          </span>
          <span className={highImpact ? "text-danger font-medium" : ""}>
            {fmtPercent(impact)}
          </span>
        </div>
        <div className="flex justify-between text-ink-soft">
          <span className="flex items-center gap-1">
            Slippage tolerance
            <EducationTip label="Slippage tolerance">
              The maximum price movement you&apos;ll accept between when you
              submit a trade and when it&apos;s confirmed on-chain. If the
              price moves more than this, your transaction reverts instead
              of executing at a worse rate.
            </EducationTip>
          </span>
          <span>{fmtPercent(SLIPPAGE_TOLERANCE)}</span>
        </div>
      </div>

      {highImpact && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-soft text-amber text-sm p-3">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <span>This trade will move the price by more than 5%.</span>
        </div>
      )}

      <div className="mt-5">
        {!isConnected ? (
          <Button size="lg" className="w-full" disabled>
            Connect your wallet to swap
          </Button>
        ) : needsApproval ? (
          <Button
            size="lg"
            variant="secondary"
            className="w-full"
            onClick={handleApprove}
            disabled={approveAction.status === "pending" || approveAction.status === "confirming"}
          >
            {(approveAction.status === "pending" || approveAction.status === "confirming") && (
              <Loader2 size={16} className="animate-spin" />
            )}
            Approve {tokenIn.symbol}
          </Button>
        ) : (
          <Button
            size="lg"
            className="w-full"
            onClick={handleSwap}
            disabled={
              amountIn === 0n ||
              insufficientBalance ||
              swapAction.status === "pending" ||
              swapAction.status === "confirming"
            }
          >
            {(swapAction.status === "pending" || swapAction.status === "confirming") && (
              <Loader2 size={16} className="animate-spin" />
            )}
            {insufficientBalance ? "Insufficient balance" : "Swap"}
          </Button>
        )}
        {(approveAction.error || swapAction.error) && (
          <p className="mt-2 text-xs text-danger">{approveAction.error || swapAction.error}</p>
        )}
      </div>
    </Card>
  );
}
