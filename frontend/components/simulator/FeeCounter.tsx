"use client";

import { Card } from "@/components/ui/Card";
import { EducationTip } from "@/components/ui/EducationTip";
import { fmtPercent } from "@/lib/format";
import type { DepositBaseline } from "@/lib/hooks/useDepositBaseline";
import { TrendingUp } from "lucide-react";

export function FeeCounter({
  baseline,
  currentReserveA,
  currentReserveB,
}: {
  baseline: DepositBaseline | null;
  currentReserveA: number;
  currentReserveB: number;
}) {
  if (!baseline || baseline.kAtDeposit <= 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-1.5 mb-1">
          <TrendingUp size={16} className="text-success" />
          <h3 className="font-display font-semibold">Fees earned</h3>
        </div>
        <p className="text-sm text-ink-soft">
          Add liquidity to start earning a share of every trade&apos;s 0.3%
          fee.
        </p>
      </Card>
    );
  }

  const kNow = currentReserveA * currentReserveB;
  const growth = baseline.kAtDeposit > 0 ? kNow / baseline.kAtDeposit - 1 : 0;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-1.5 mb-1">
        <TrendingUp size={16} className="text-success" />
        <h3 className="font-display font-semibold flex items-center gap-1">
          Fees earned
          <EducationTip label="Fee growth proxy">
            Every trade leaves a small fee behind in the pool, which
            permanently grows the pool&apos;s reserves (and therefore its
            &quot;k&quot; value) regardless of price movement. This tracks how much
            the pool has grown from fees alone since you joined — a proxy
            for your earnings, shared proportionally among all LPs.
          </EducationTip>
        </h3>
      </div>
      <p className="font-mono-num text-2xl font-semibold text-success">
        +{fmtPercent(Math.max(0, growth), 4)}
      </p>
      <p className="text-xs text-ink-faint mt-1">
        Pool growth from trading fees since your first deposit.
      </p>
    </Card>
  );
}
