"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EducationTip } from "@/components/ui/EducationTip";
import { EmptyChartState } from "./PriceChart";
import { hodlVsLpValue } from "@/lib/math/amm";
import { fmtPercent, fmtUsdLike } from "@/lib/format";
import type { PoolHistoryPoint } from "@/lib/hooks/usePoolState";
import type { DepositBaseline } from "@/lib/hooks/useDepositBaseline";
import { CONTRACTS } from "@/lib/contracts/config";

export function ImpermanentLossPanel({
  baseline,
  history,
  currentPrice,
}: {
  baseline: DepositBaseline | null;
  history: PoolHistoryPoint[];
  currentPrice: number;
}) {
  const { data, currentIl, hodlValue, lpValue } = useMemo(() => {
    if (!baseline) return { data: [], currentIl: 0, hodlValue: 0, lpValue: 0 };

    const points = history.length >= 2 ? history : [{ price: currentPrice } as PoolHistoryPoint];

    const chartData = points.map((p, i) => {
      const { hodlValue, lpValue, ilFraction } = hodlVsLpValue({
        depositedA: baseline.depositedA,
        depositedB: baseline.depositedB,
        priceAInBAtDeposit: baseline.priceAInBAtDeposit,
        currentPriceAInB: p.price || currentPrice,
      });
      return { i, hodlValue, lpValue, ilFraction };
    });

    const last = chartData[chartData.length - 1];
    return {
      data: chartData,
      currentIl: last?.ilFraction ?? 0,
      hodlValue: last?.hodlValue ?? 0,
      lpValue: last?.lpValue ?? 0,
    };
  }, [baseline, history, currentPrice]);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display font-semibold flex items-center gap-1.5">
          Impermanent loss
          <EducationTip label="Impermanent loss">
            The gap between what your liquidity position is worth right now
            versus what you&apos;d have if you had simply held your original
            tokens instead of depositing them. It shrinks or grows as the
            price moves, and only becomes &quot;permanent&quot; once you withdraw.
          </EducationTip>
        </h3>
        {baseline && (
          <Badge tone={currentIl < -0.001 ? "danger" : "success"}>
            {fmtPercent(currentIl)}
          </Badge>
        )}
      </div>
      <p className="text-sm text-ink-soft mb-4">
        Your liquidity value versus simply holding {CONTRACTS.tokenA.symbol}{" "}
        and {CONTRACTS.tokenB.symbol} separately.
      </p>

      {!baseline ? (
        <EmptyChartState message="Add liquidity to start tracking impermanent loss against your deposit." />
      ) : data.length < 2 ? (
        <EmptyChartState message="Impermanent loss will update as the pool price moves." />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--line-soft)" vertical={false} />
              <XAxis dataKey="i" hide />
              <YAxis
                width={56}
                tick={{ fontSize: 11, fill: "var(--ink-faint)" }}
                tickFormatter={(v) => fmtUsdLike(Number(v), 0)}
              />
              <Tooltip
                formatter={(value, name) => [
                  fmtUsdLike(Number(value)),
                  name === "hodlValue" ? "If you had held" : "Your LP value",
                ]}
                labelFormatter={() => ""}
                contentStyle={{
                  background: "var(--ink)",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "white",
                }}
              />
              <Legend
                formatter={(value) => (value === "hodlValue" ? "If you had held" : "Your LP value")}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="hodlValue"
                stroke="var(--ink-faint)"
                strokeDasharray="4 4"
                fill="none"
              />
              <Line type="monotone" dataKey="lpValue" stroke="var(--coral)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <div>
              <p className="text-ink-faint text-xs mb-0.5">If you had held</p>
              <p className="font-mono-num font-semibold">{fmtUsdLike(hodlValue)}</p>
            </div>
            <div>
              <p className="text-ink-faint text-xs mb-0.5">Your LP value now</p>
              <p className="font-mono-num font-semibold">{fmtUsdLike(lpValue)}</p>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
