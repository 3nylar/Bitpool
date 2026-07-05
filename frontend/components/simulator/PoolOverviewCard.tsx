"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BucketVisualizer } from "./BucketVisualizer";
import { EducationTip } from "@/components/ui/EducationTip";
import { CONTRACTS } from "@/lib/contracts/config";
import { fmtToken } from "@/lib/format";
import type { PoolState } from "@/lib/hooks/usePoolState";

export function PoolOverviewCard({ pool }: { pool: PoolState }) {
  const isEmpty = pool.reserveA === 0n && pool.reserveB === 0n;

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="font-display font-semibold text-lg">
            {CONTRACTS.tokenA.symbol} / {CONTRACTS.tokenB.symbol} Pool
          </h2>
          <p className="text-sm text-ink-soft mt-0.5">
            Constant-product AMM · {(pool.feeBps / 100).toFixed(2)}% swap fee
          </p>
        </div>
        <Badge tone="primary">Live on-chain</Badge>
      </div>

      {isEmpty ? (
        <div className="rounded-xl border border-dashed border-line p-8 text-center">
          <p className="text-sm text-ink-soft">
            This pool has no liquidity yet. Be the first to add some and set
            its starting price.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <div className="flex items-center gap-1 text-xs text-ink-faint mb-1">
                Spot price
                <EducationTip label="Spot price">
                  The current exchange rate between the two tokens, derived
                  directly from the ratio of reserves in the pool.
                </EducationTip>
              </div>
              <p className="font-mono-num text-xl font-semibold">
                1 {CONTRACTS.tokenA.symbol} = {pool.spotPriceAinB.toFixed(4)}{" "}
                {CONTRACTS.tokenB.symbol}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs text-ink-faint mb-1">
                Total LP shares
                <EducationTip label="LP shares">
                  The total number of liquidity-provider tokens minted by
                  this pool. Your share of it determines your slice of the
                  reserves.
                </EducationTip>
              </div>
              <p className="font-mono-num text-xl font-semibold">{fmtToken(pool.totalSupply, 18, 2)}</p>
            </div>
          </div>
          <BucketVisualizer reserveA={pool.reserveA} reserveB={pool.reserveB} />
        </>
      )}
    </Card>
  );
}
