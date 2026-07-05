"use client";

import { useAccount } from "wagmi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CONTRACTS } from "@/lib/contracts/config";
import { useContractAction } from "@/lib/hooks/useContractAction";
import { useUserPosition } from "@/lib/hooks/useUserPosition";
import { fmtToken } from "@/lib/format";
import { Droplet, Loader2 } from "lucide-react";

export function FaucetCard() {
  const { isConnected } = useAccount();
  const { balanceA, balanceB, refetch } = useUserPosition();
  const claimA = useContractAction();
  const claimB = useContractAction();

  if (!isConnected) return null;

  async function claim(token: "A" | "B") {
    const action = token === "A" ? claimA : claimB;
    const contract = token === "A" ? CONTRACTS.tokenA : CONTRACTS.tokenB;
    await action.execute({
      address: contract.address,
      abi: contract.abi,
      functionName: "faucet",
    });
    refetch();
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <Droplet size={16} className="text-primary" />
        <h3 className="font-display font-semibold">Get simulator tokens</h3>
      </div>
      <p className="text-sm text-ink-soft mb-4">
        Free, valueless tokens for trying out the pool. Claim once, or as
        often as you like.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-line p-3">
          <div className="flex items-center gap-1.5 text-xs text-ink-faint mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal" /> {CONTRACTS.tokenA.symbol}
          </div>
          <p className="font-mono-num font-semibold mb-2">{fmtToken(balanceA)}</p>
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => claim("A")}
            disabled={claimA.status === "pending" || claimA.status === "confirming"}
          >
            {(claimA.status === "pending" || claimA.status === "confirming") && (
              <Loader2 size={14} className="animate-spin" />
            )}
            Claim {CONTRACTS.tokenA.symbol}
          </Button>
        </div>
        <div className="rounded-xl border border-line p-3">
          <div className="flex items-center gap-1.5 text-xs text-ink-faint mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-coral" /> {CONTRACTS.tokenB.symbol}
          </div>
          <p className="font-mono-num font-semibold mb-2">{fmtToken(balanceB)}</p>
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => claim("B")}
            disabled={claimB.status === "pending" || claimB.status === "confirming"}
          >
            {(claimB.status === "pending" || claimB.status === "confirming") && (
              <Loader2 size={14} className="animate-spin" />
            )}
            Claim {CONTRACTS.tokenB.symbol}
          </Button>
        </div>
      </div>
      {(claimA.error || claimB.error) && (
        <p className="mt-3 text-xs text-danger">{claimA.error || claimB.error}</p>
      )}
    </Card>
  );
}
