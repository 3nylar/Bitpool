"use client";

import { EducationalBanner } from "@/components/simulator/EducationalBanner";
import { TopBar } from "@/components/simulator/TopBar";
import { PoolOverviewCard } from "@/components/simulator/PoolOverviewCard";
import { PriceChart } from "@/components/simulator/PriceChart";
import { ImpermanentLossPanel } from "@/components/simulator/ImpermanentLossPanel";
import { FeeCounter } from "@/components/simulator/FeeCounter";
import { FaucetCard } from "@/components/simulator/FaucetCard";
import { SwapPanel } from "@/components/simulator/SwapPanel";
import { LiquidityPanel } from "@/components/simulator/LiquidityPanel";
import { AutoTradeControls } from "@/components/simulator/AutoTradeControls";
import { usePoolState, usePoolHistory } from "@/lib/hooks/usePoolState";
import { useDepositBaseline } from "@/lib/hooks/useDepositBaseline";
import { isContractConfigured } from "@/lib/contracts/config";
import { AlertTriangle } from "lucide-react";

export default function SimulatorPage() {
  const pool = usePoolState();
  const history = usePoolHistory();
  const { baseline } = useDepositBaseline();

  if (!isContractConfigured()) {
    return <MissingConfigNotice />;
  }

  return (
    <>
      <EducationalBanner />
      <TopBar />
      <main className="flex-1 bg-canvas">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <PoolOverviewCard pool={pool} />
            <PriceChart history={history} />
            <ImpermanentLossPanel
              baseline={baseline}
              history={history}
              currentPrice={pool.spotPriceAinB}
            />
          </div>
          <div className="space-y-6">
            <FaucetCard />
            <SwapPanel pool={pool} />
            <LiquidityPanel pool={pool} />
            <AutoTradeControls pool={pool} />
            <FeeCounter
              baseline={baseline}
              currentReserveA={Number(pool.reserveA) / 1e18}
              currentReserveB={Number(pool.reserveB) / 1e18}
            />
          </div>
        </div>
      </main>
    </>
  );
}

function MissingConfigNotice() {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-soft text-amber flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={26} />
        </div>
        <h1 className="font-display text-xl font-semibold">Contracts not configured</h1>
        <p className="mt-3 text-sm text-ink-soft leading-relaxed">
          Set <code className="font-mono-num text-xs bg-canvas-alt px-1.5 py-0.5 rounded">
            NEXT_PUBLIC_POOL_ADDRESS
          </code>
          ,{" "}
          <code className="font-mono-num text-xs bg-canvas-alt px-1.5 py-0.5 rounded">
            NEXT_PUBLIC_TOKEN_A_ADDRESS
          </code>
          , and{" "}
          <code className="font-mono-num text-xs bg-canvas-alt px-1.5 py-0.5 rounded">
            NEXT_PUBLIC_TOKEN_B_ADDRESS
          </code>{" "}
          in your environment after deploying the contracts (see the
          project README).
        </p>
      </div>
    </main>
  );
}
