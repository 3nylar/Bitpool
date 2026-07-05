"use client";

import { useAccount, useReadContracts } from "wagmi";
import { CONTRACTS } from "@/lib/contracts/config";

/// Reads the connected wallet's balances of both pool tokens and its LP
/// token balance in a single batched multicall, refetched on every new
/// block for a genuinely live "your position" view.
export function useUserPosition() {
  const { address } = useAccount();

  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      { ...CONTRACTS.tokenA, functionName: "balanceOf", args: [address ?? "0x0"] },
      { ...CONTRACTS.tokenB, functionName: "balanceOf", args: [address ?? "0x0"] },
      { ...CONTRACTS.pool, functionName: "balanceOf", args: [address ?? "0x0"] },
      { ...CONTRACTS.tokenA, functionName: "allowance", args: [address ?? "0x0", CONTRACTS.pool.address] },
      { ...CONTRACTS.tokenB, functionName: "allowance", args: [address ?? "0x0", CONTRACTS.pool.address] },
    ],
    query: {
      enabled: Boolean(address),
      refetchInterval: 8_000,
    },
  });

  return {
    balanceA: (data?.[0]?.result as bigint | undefined) ?? 0n,
    balanceB: (data?.[1]?.result as bigint | undefined) ?? 0n,
    lpBalance: (data?.[2]?.result as bigint | undefined) ?? 0n,
    allowanceA: (data?.[3]?.result as bigint | undefined) ?? 0n,
    allowanceB: (data?.[4]?.result as bigint | undefined) ?? 0n,
    isLoading,
    refetch,
  };
}
