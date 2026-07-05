"use client";

import { useEffect, useState, useCallback } from "react";
import { useReadContracts, useWatchContractEvent, usePublicClient } from "wagmi";
import { CONTRACTS, FEE_BPS } from "@/lib/contracts/config";

export interface PoolState {
  reserveA: bigint;
  reserveB: bigint;
  totalSupply: bigint;
  spotPriceAinB: number; // price of 1 tokenA in tokenB, as a plain float for display/charts
  feeBps: number;
  isLoading: boolean;
  refetch: () => void;
}

/// Reads the pool's core state (reserves, LP total supply) and keeps it
/// live by re-fetching whenever a Swap/LiquidityAdded/LiquidityRemoved
/// event is observed on-chain. This is the single source of truth the rest
/// of the simulator UI derives from -- nothing here is estimated client-side.
export function usePoolState(): PoolState {
  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      { ...CONTRACTS.pool, functionName: "reserveA" },
      { ...CONTRACTS.pool, functionName: "reserveB" },
      { ...CONTRACTS.pool, functionName: "totalSupply" },
    ],
    query: {
      refetchInterval: 15_000, // safety-net poll in case an event is ever missed
    },
  });

  const refetchNow = useCallback(() => {
    refetch();
  }, [refetch]);

  useWatchContractEvent({
    ...CONTRACTS.pool,
    eventName: "Swap",
    onLogs: refetchNow,
  });
  useWatchContractEvent({
    ...CONTRACTS.pool,
    eventName: "LiquidityAdded",
    onLogs: refetchNow,
  });
  useWatchContractEvent({
    ...CONTRACTS.pool,
    eventName: "LiquidityRemoved",
    onLogs: refetchNow,
  });

  const reserveA = (data?.[0]?.result as bigint | undefined) ?? 0n;
  const reserveB = (data?.[1]?.result as bigint | undefined) ?? 0n;
  const totalSupply = (data?.[2]?.result as bigint | undefined) ?? 0n;

  const spotPriceAinB =
    reserveA > 0n ? Number(reserveB) / Number(reserveA) : 0;

  return {
    reserveA,
    reserveB,
    totalSupply,
    spotPriceAinB,
    feeBps: FEE_BPS,
    isLoading,
    refetch: refetchNow,
  };
}

export interface PoolHistoryPoint {
  timestamp: number;
  reserveA: number;
  reserveB: number;
  price: number;
  type: "swap" | "add" | "remove" | "seed";
}

/// Maintains a rolling in-memory price/reserve history for the session by
/// combining a one-time backfill (recent blocks' logs) with live event
/// subscriptions. This powers the price and reserve-composition charts.
/// Charts reset on page reload by design -- this is a live session view,
/// not a permanent historical archive (that would be the off-chain indexer
/// described in the project's PRD for a larger deployment).
export function usePoolHistory(maxPoints = 200) {
  const [history, setHistory] = useState<PoolHistoryPoint[]>([]);
  const publicClient = usePublicClient();

  const pushPoint = useCallback(
    (point: PoolHistoryPoint) => {
      setHistory((prev) => {
        const next = [...prev, point];
        return next.length > maxPoints ? next.slice(next.length - maxPoints) : next;
      });
    },
    [maxPoints]
  );

  // Backfill a short recent window so the chart isn't empty on first load.
  useEffect(() => {
    if (!publicClient || !CONTRACTS.pool.address) return;
    let cancelled = false;

    (async () => {
      try {
        const latestBlock = await publicClient.getBlockNumber();
        const fromBlock = latestBlock > 5000n ? latestBlock - 5000n : 0n;
        const logs = await publicClient.getContractEvents({
          address: CONTRACTS.pool.address,
          abi: CONTRACTS.pool.abi,
          eventName: "Swap",
          fromBlock,
          toBlock: latestBlock,
        });
        if (cancelled) return;
        const points: PoolHistoryPoint[] = logs.slice(-maxPoints).map((log) => {
          const typedLog = log as unknown as {
            args: { newReserveA?: bigint; newReserveB?: bigint };
            blockNumber: bigint;
          };
          const rA = Number(typedLog.args.newReserveA ?? 0n);
          const rB = Number(typedLog.args.newReserveB ?? 0n);
          return {
            timestamp: Number(typedLog.blockNumber) || Date.now(),
            reserveA: rA,
            reserveB: rB,
            price: rA > 0 ? rB / rA : 0,
            type: "swap",
          };
        });
        if (points.length > 0) setHistory(points);
      } catch {
        // Backfill is best-effort only; live events will populate the chart regardless.
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient]);

  useWatchContractEvent({
    ...CONTRACTS.pool,
    eventName: "Swap",
    onLogs: (logs) => {
      for (const log of logs) {
        const typedLog = log as unknown as { args: { newReserveA?: bigint; newReserveB?: bigint } };
        const rA = Number(typedLog.args.newReserveA ?? 0n);
        const rB = Number(typedLog.args.newReserveB ?? 0n);
        pushPoint({
          timestamp: Date.now(),
          reserveA: rA,
          reserveB: rB,
          price: rA > 0 ? rB / rA : 0,
          type: "swap",
        });
      }
    },
  });

  useWatchContractEvent({
    ...CONTRACTS.pool,
    eventName: "LiquidityAdded",
    onLogs: () => {
      // Reserve totals are re-fetched by usePoolState; this just marks the
      // event on the timeline for annotation purposes if needed later.
    },
  });

  return history;
}
