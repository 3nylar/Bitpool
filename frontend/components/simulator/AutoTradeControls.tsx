"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EducationTip } from "@/components/ui/EducationTip";
import { CONTRACTS } from "@/lib/contracts/config";
import { useContractAction } from "@/lib/hooks/useContractAction";
import { useUserPosition } from "@/lib/hooks/useUserPosition";
import type { PoolState } from "@/lib/hooks/usePoolState";
import { Shuffle, Loader2 } from "lucide-react";

type Scenario = "calm" | "volatile";

const SCENARIOS: Record<Scenario, { label: string; minPct: number; maxPct: number; legs: number }> = {
  calm: { label: "Calm market", minPct: 0.002, maxPct: 0.01, legs: 4 },
  volatile: { label: "Volatile market", minPct: 0.02, maxPct: 0.08, legs: 5 },
};

/// Lets a signed-in user trigger a burst of realistic, randomized swaps in
/// a single transaction (via the contract's `batchSwap`), so they can watch
/// the pool react to "market activity" without needing to manually place
/// each trade -- and without prompting a separate wallet signature per leg.
export function AutoTradeControls({ pool }: { pool: PoolState }) {
  const { isConnected, address } = useAccount();
  const { balanceA, balanceB, allowanceA, allowanceB, refetch } = useUserPosition();
  const [scenario, setScenario] = useState<Scenario>("calm");
  const approveAAction = useContractAction();
  const approveBAction = useContractAction();
  const simulateAction = useContractAction();

  const config = SCENARIOS[scenario];

  // Rough upper bound on how much of each token this scenario could need,
  // used purely to decide whether an approval is required beforehand.
  const maxPossibleSpend =
    (pool.reserveA * BigInt(Math.round(config.maxPct * 10_000)) * BigInt(config.legs)) / 10_000n;

  const needsApprovalA = allowanceA < maxPossibleSpend;
  const needsApprovalB = allowanceB < maxPossibleSpend;
  const insufficientFunds = balanceA < maxPossibleSpend || balanceB < maxPossibleSpend;

  async function approve(token: "A" | "B") {
    const action = token === "A" ? approveAAction : approveBAction;
    const contract = token === "A" ? CONTRACTS.tokenA : CONTRACTS.tokenB;
    await action.execute({
      address: contract.address,
      abi: contract.abi,
      functionName: "approve",
      args: [CONTRACTS.pool.address, maxPossibleSpend * 10n], // headroom for repeated runs
    });
    refetch();
  }

  async function handleSimulate() {
    if (!address || pool.reserveA === 0n || pool.reserveB === 0n) return;

    const tokenInIsA: boolean[] = [];
    const amountsIn: bigint[] = [];
    const minAmountsOut: bigint[] = [];

    for (let i = 0; i < config.legs; i++) {
      const isA = Math.random() < 0.5;
      const reserve = isA ? pool.reserveA : pool.reserveB;
      const pct = config.minPct + Math.random() * (config.maxPct - config.minPct);
      const amount = (reserve * BigInt(Math.round(pct * 10_000))) / 10_000n;
      if (amount === 0n) continue;
      tokenInIsA.push(isA);
      amountsIn.push(amount);
      minAmountsOut.push(0n); // acceptable here since the user controls and expects this randomized demo trade
    }

    if (tokenInIsA.length === 0) return;

    await simulateAction.execute({
      address: CONTRACTS.pool.address,
      abi: CONTRACTS.pool.abi,
      functionName: "batchSwap",
      args: [tokenInIsA, amountsIn, minAmountsOut],
    });
    refetch();
    pool.refetch();
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-1.5 mb-1">
        <Shuffle size={16} className="text-primary" />
        <h3 className="font-display font-semibold flex items-center gap-1">
          Simulate market activity
          <EducationTip label="Simulate market activity">
            Runs a burst of small, randomized trades against the pool in one
            signed transaction, so you can watch price and impermanent loss
            react without manually placing each trade.
          </EducationTip>
        </h3>
      </div>
      <p className="text-sm text-ink-soft mb-4">
        Trigger a few random trades to see how the pool responds.
      </p>

      <div className="flex gap-2 mb-4">
        {(Object.keys(SCENARIOS) as Scenario[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setScenario(key)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
              scenario === key
                ? "border-primary bg-primary-soft text-primary-dark"
                : "border-line text-ink-soft hover:border-primary/30"
            }`}
          >
            {SCENARIOS[key].label}
          </button>
        ))}
      </div>

      {!isConnected ? (
        <Button size="lg" className="w-full" disabled>
          Connect your wallet
        </Button>
      ) : needsApprovalA ? (
        <Button
          size="lg"
          variant="secondary"
          className="w-full"
          onClick={() => approve("A")}
          disabled={approveAAction.status === "pending" || approveAAction.status === "confirming"}
        >
          {(approveAAction.status === "pending" || approveAAction.status === "confirming") && (
            <Loader2 size={16} className="animate-spin" />
          )}
          Approve {CONTRACTS.tokenA.symbol} for simulation
        </Button>
      ) : needsApprovalB ? (
        <Button
          size="lg"
          variant="secondary"
          className="w-full"
          onClick={() => approve("B")}
          disabled={approveBAction.status === "pending" || approveBAction.status === "confirming"}
        >
          {(approveBAction.status === "pending" || approveBAction.status === "confirming") && (
            <Loader2 size={16} className="animate-spin" />
          )}
          Approve {CONTRACTS.tokenB.symbol} for simulation
        </Button>
      ) : (
        <Button
          size="lg"
          className="w-full"
          onClick={handleSimulate}
          disabled={
            insufficientFunds ||
            pool.reserveA === 0n ||
            simulateAction.status === "pending" ||
            simulateAction.status === "confirming"
          }
        >
          {(simulateAction.status === "pending" || simulateAction.status === "confirming") && (
            <Loader2 size={16} className="animate-spin" />
          )}
          {insufficientFunds ? "Claim more tokens first" : `Run ${config.legs} simulated trades`}
        </Button>
      )}
      {(approveAAction.error || approveBAction.error || simulateAction.error) && (
        <p className="mt-2 text-xs text-danger">
          {approveAAction.error || approveBAction.error || simulateAction.error}
        </p>
      )}
    </Card>
  );
}
