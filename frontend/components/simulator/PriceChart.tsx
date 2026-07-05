"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card } from "@/components/ui/Card";
import { CONTRACTS } from "@/lib/contracts/config";
import type { PoolHistoryPoint } from "@/lib/hooks/usePoolState";

export function PriceChart({ history }: { history: PoolHistoryPoint[] }) {
  const data = history.map((p, i) => ({ i, price: p.price }));

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Price history</h3>
        <span className="text-xs text-ink-faint">
          1 {CONTRACTS.tokenA.symbol} in {CONTRACTS.tokenB.symbol}
        </span>
      </div>
      {data.length < 2 ? (
        <EmptyChartState message="Price history will appear here after the first trade." />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--line-soft)" vertical={false} />
            <XAxis dataKey="i" hide />
            <YAxis
              width={56}
              tick={{ fontSize: 11, fill: "var(--ink-faint)" }}
              domain={["auto", "auto"]}
              tickFormatter={(v) => Number(v).toFixed(2)}
            />
            <Tooltip
              formatter={(value) => [Number(value).toFixed(4), "Price"]}
              labelFormatter={() => ""}
              contentStyle={{
                background: "var(--ink)",
                border: "none",
                borderRadius: 8,
                fontSize: 12,
                color: "white",
              }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="url(#priceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

export function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="h-[220px] flex items-center justify-center rounded-xl border border-dashed border-line">
      <p className="text-sm text-ink-faint text-center px-6">{message}</p>
    </div>
  );
}
