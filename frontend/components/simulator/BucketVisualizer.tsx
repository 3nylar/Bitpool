"use client";

import { CONTRACTS } from "@/lib/contracts/config";
import { fmtToken } from "@/lib/format";

export function BucketVisualizer({
  reserveA,
  reserveB,
}: {
  reserveA: bigint;
  reserveB: bigint;
}) {
  const total = Number(reserveA) + Number(reserveB);
  const pctA = total > 0 ? (Number(reserveA) / total) * 100 : 50;
  const pctB = 100 - pctA;

  return (
    <div>
      <div className="flex h-10 rounded-xl overflow-hidden border border-line">
        <div
          className="flex items-center justify-center text-xs font-medium text-white transition-[width] duration-700 ease-out"
          style={{ width: `${pctA}%`, background: "var(--teal)" }}
        >
          {pctA > 12 && `${pctA.toFixed(0)}%`}
        </div>
        <div
          className="flex items-center justify-center text-xs font-medium text-white transition-[width] duration-700 ease-out"
          style={{ width: `${pctB}%`, background: "var(--coral)" }}
        >
          {pctB > 12 && `${pctB.toFixed(0)}%`}
        </div>
      </div>
      <div className="mt-3 flex justify-between text-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-teal" />
          <span className="text-ink-soft">{CONTRACTS.tokenA.symbol}</span>
          <span className="font-mono-num font-medium">{fmtToken(reserveA)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono-num font-medium">{fmtToken(reserveB)}</span>
          <span className="text-ink-soft">{CONTRACTS.tokenB.symbol}</span>
          <span className="w-2 h-2 rounded-full bg-coral" />
        </div>
      </div>
    </div>
  );
}
