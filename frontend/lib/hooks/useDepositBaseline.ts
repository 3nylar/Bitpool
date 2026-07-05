"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";

/// Impermanent loss is measured against "what you'd have if you'd just
/// held your original tokens" -- which requires remembering the amounts
/// and price at the moment you deposited. A full production deployment
/// would track this server-side (see the project PRD's off-chain
/// `Positions` table, populated by an event indexer), so it survives
/// across devices and browsers.
///
/// For this simulator, we keep it simple and fully client-side: the
/// deposit snapshot is stored in localStorage, keyed by wallet address.
/// This is a deliberate, documented simplification -- clearing browser
/// storage resets your IL baseline, which is an acceptable tradeoff for an
/// educational tool with no real value at stake.
export interface DepositBaseline {
  depositedA: number;
  depositedB: number;
  priceAInBAtDeposit: number;
  depositedAt: number;
  kAtDeposit: number; // reserveA * reserveB (as plain numbers) at the moment of deposit
}

function storageKey(address: string) {
  return `Bitpool:baseline:${address.toLowerCase()}`;
}

export function useDepositBaseline() {
  const { address } = useAccount();
  const [baseline, setBaseline] = useState<DepositBaseline | null>(null);

  useEffect(() => {
    // Syncing from localStorage (an external store) on address change is
    // exactly the documented use case for this pattern; there is no
    // external subscription API to use useSyncExternalStore with here.
    if (!address) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBaseline(null);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey(address));
      setBaseline(raw ? JSON.parse(raw) : null);
    } catch {
      setBaseline(null);
    }
  }, [address]);

  const recordDeposit = useCallback(
    (
      amountA: number,
      amountB: number,
      priceAInB: number,
      kSnapshot: number,
    ) => {
      if (!address) return;
      setBaseline((prev) => {
        // Blend into a weighted-average baseline if the user already has a
        // position, so repeated top-ups don't fully discard prior history.
        const next: DepositBaseline = prev
          ? {
              depositedA: prev.depositedA + amountA,
              depositedB: prev.depositedB + amountB,
              priceAInBAtDeposit:
                (prev.priceAInBAtDeposit * prev.depositedA +
                  priceAInB * amountA) /
                (prev.depositedA + amountA || 1),
              depositedAt: prev.depositedAt,
              kAtDeposit: prev.kAtDeposit, // keep the earliest k as the fee-growth baseline
            }
          : {
              depositedA: amountA,
              depositedB: amountB,
              priceAInBAtDeposit: priceAInB,
              depositedAt: Date.now(),
              kAtDeposit: kSnapshot,
            };
        localStorage.setItem(storageKey(address), JSON.stringify(next));
        return next;
      });
    },
    [address],
  );

  const clearBaseline = useCallback(() => {
    if (!address) return;
    localStorage.removeItem(storageKey(address));
    setBaseline(null);
  }, [address]);

  return { baseline, recordDeposit, clearBaseline };
}
