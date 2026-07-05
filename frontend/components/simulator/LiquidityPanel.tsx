"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EducationTip } from "@/components/ui/EducationTip";
import { CONTRACTS } from "@/lib/contracts/config";
import { fmtToken, toUnits } from "@/lib/format";
import { quote } from "@/lib/math/amm";
import { useContractAction } from "@/lib/hooks/useContractAction";
import { useUserPosition } from "@/lib/hooks/useUserPosition";
import { useDepositBaseline } from "@/lib/hooks/useDepositBaseline";
import type { PoolState } from "@/lib/hooks/usePoolState";
import { Loader2 } from "lucide-react";

export function LiquidityPanel({ pool }: { pool: PoolState }) {
  const [tab, setTab] = useState<"add" | "remove">("add");

  return (
    <Card className="p-6">
      <div className="flex gap-1 p-1 bg-canvas-alt rounded-xl mb-5 w-fit">
        <TabButton active={tab === "add"} onClick={() => setTab("add")}>
          Add liquidity
        </TabButton>
        <TabButton active={tab === "remove"} onClick={() => setTab("remove")}>
          Remove liquidity
        </TabButton>
      </div>
      {tab === "add" ? <AddLiquidity pool={pool} /> : <RemoveLiquidity pool={pool} />}
    </Card>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active ? "bg-surface shadow-soft text-ink" : "text-ink-faint hover:text-ink-soft"
      }`}
    >
      {children}
    </button>
  );
}

function AddLiquidity({ pool }: { pool: PoolState }) {
  const { isConnected, address } = useAccount();
  const { balanceA, balanceB, allowanceA, allowanceB, refetch } = useUserPosition();
  const { recordDeposit } = useDepositBaseline();
  const [amountAStr, setAmountAStr] = useState("");
  const approveAAction = useContractAction();
  const approveBAction = useContractAction();
  const addAction = useContractAction();

  const isEmptyPool = pool.reserveA === 0n && pool.reserveB === 0n;
  const amountA = toUnits(amountAStr);
  const amountB = isEmptyPool ? 0n : quote(amountA, pool.reserveA, pool.reserveB);

  const [firstDepositBStr, setFirstDepositBStr] = useState("");
  const effectiveAmountB = isEmptyPool ? toUnits(firstDepositBStr) : amountB;

  const needsApprovalA = amountA > 0n && allowanceA < amountA;
  const needsApprovalB = effectiveAmountB > 0n && allowanceB < effectiveAmountB;
  const insufficient = amountA > balanceA || effectiveAmountB > balanceB;

  async function approve(token: "A" | "B") {
    const action = token === "A" ? approveAAction : approveBAction;
    const contract = token === "A" ? CONTRACTS.tokenA : CONTRACTS.tokenB;
    const amount = token === "A" ? amountA : effectiveAmountB;
    await action.execute({
      address: contract.address,
      abi: contract.abi,
      functionName: "approve",
      args: [CONTRACTS.pool.address, amount],
    });
    refetch();
  }

  async function handleAdd() {
    if (!address) return;
    await addAction.execute({
      address: CONTRACTS.pool.address,
      abi: CONTRACTS.pool.abi,
      functionName: "addLiquidity",
      args: [amountA, effectiveAmountB, 0n, 0n, address, 0n],
    });
    recordDeposit(
      Number(formatUnits(amountA, 18)),
      Number(formatUnits(effectiveAmountB, 18)),
      pool.spotPriceAinB || Number(formatUnits(effectiveAmountB, 18)) / Number(formatUnits(amountA, 18)),
      Number(formatUnits(pool.reserveA, 18)) * Number(formatUnits(pool.reserveB, 18))
    );
    setAmountAStr("");
    setFirstDepositBStr("");
    refetch();
    pool.refetch();
  }

  return (
    <div className="space-y-4">
      <AmountField
        label={`${CONTRACTS.tokenA.symbol} amount`}
        symbol={CONTRACTS.tokenA.symbol}
        value={amountAStr}
        onChange={setAmountAStr}
        balance={balanceA}
        accent="teal"
      />

      {isEmptyPool ? (
        <>
          <AmountField
            label={`${CONTRACTS.tokenB.symbol} amount (sets starting price)`}
            symbol={CONTRACTS.tokenB.symbol}
            value={firstDepositBStr}
            onChange={setFirstDepositBStr}
            balance={balanceB}
            accent="coral"
          />
          <p className="text-xs text-ink-faint flex items-center gap-1">
            This pool is empty, so your deposit sets the initial exchange
            rate.
            <EducationTip label="Setting the initial price">
              The very first deposit into a pool determines its starting
              price ratio. Every deposit after that must match this ratio.
            </EducationTip>
          </p>
        </>
      ) : (
        <div className="rounded-xl border border-line bg-canvas-alt p-4">
          <div className="text-xs text-ink-faint mb-1">
            {CONTRACTS.tokenB.symbol} required (matched to pool ratio)
          </div>
          <p className="font-mono-num text-lg font-semibold">{fmtToken(effectiveAmountB)}</p>
        </div>
      )}

      <div>
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
            Approve {CONTRACTS.tokenA.symbol}
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
            Approve {CONTRACTS.tokenB.symbol}
          </Button>
        ) : (
          <Button
            size="lg"
            className="w-full"
            onClick={handleAdd}
            disabled={
              amountA === 0n ||
              effectiveAmountB === 0n ||
              insufficient ||
              addAction.status === "pending" ||
              addAction.status === "confirming"
            }
          >
            {(addAction.status === "pending" || addAction.status === "confirming") && (
              <Loader2 size={16} className="animate-spin" />
            )}
            {insufficient ? "Insufficient balance" : "Add liquidity"}
          </Button>
        )}
        {(approveAAction.error || approveBAction.error || addAction.error) && (
          <p className="mt-2 text-xs text-danger">
            {approveAAction.error || approveBAction.error || addAction.error}
          </p>
        )}
      </div>
    </div>
  );
}

function RemoveLiquidity({ pool }: { pool: PoolState }) {
  const { isConnected, address } = useAccount();
  const { lpBalance, refetch } = useUserPosition();
  const [pct, setPct] = useState(50);
  const removeAction = useContractAction();

  const liquidity = (lpBalance * BigInt(pct)) / 100n;
  const shareOfPool = pool.totalSupply > 0n ? Number(liquidity) / Number(pool.totalSupply) : 0;
  const outA = BigInt(Math.floor(Number(pool.reserveA) * shareOfPool));
  const outB = BigInt(Math.floor(Number(pool.reserveB) * shareOfPool));

  async function handleRemove() {
    if (!address || liquidity === 0n) return;
    await removeAction.execute({
      address: CONTRACTS.pool.address,
      abi: CONTRACTS.pool.abi,
      functionName: "removeLiquidity",
      args: [liquidity, 0n, 0n, address, 0n],
    });
    refetch();
    pool.refetch();
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-ink-soft">Amount to withdraw</span>
          <span className="font-mono-num font-semibold">{pct}%</span>
        </div>
        <input
          type="range"
          min={1}
          max={100}
          value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          className="w-full accent-[var(--primary)]"
        />
        <div className="flex gap-2 mt-3">
          {[25, 50, 75, 100].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setPct(preset)}
              className="flex-1 py-1.5 text-xs rounded-lg border border-line hover:border-primary/40 hover:bg-primary-soft/40 transition-colors"
            >
              {preset}%
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-line bg-canvas-alt p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-ink-soft">You&apos;ll receive</span>
        </div>
        <div className="flex justify-between font-mono-num">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal" /> {fmtToken(outA)} {CONTRACTS.tokenA.symbol}
          </span>
        </div>
        <div className="flex justify-between font-mono-num">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-coral" /> {fmtToken(outB)} {CONTRACTS.tokenB.symbol}
          </span>
        </div>
      </div>

      {!isConnected ? (
        <Button size="lg" className="w-full" disabled>
          Connect your wallet
        </Button>
      ) : (
        <Button
          size="lg"
          className="w-full"
          onClick={handleRemove}
          disabled={liquidity === 0n || removeAction.status === "pending" || removeAction.status === "confirming"}
        >
          {(removeAction.status === "pending" || removeAction.status === "confirming") && (
            <Loader2 size={16} className="animate-spin" />
          )}
          {lpBalance === 0n ? "No LP position" : "Remove liquidity"}
        </Button>
      )}
      {removeAction.error && <p className="text-xs text-danger">{removeAction.error}</p>}
    </div>
  );
}

function AmountField({
  label,
  symbol,
  value,
  onChange,
  balance,
  accent,
}: {
  label: string;
  symbol: string;
  value: string;
  onChange: (v: string) => void;
  balance: bigint;
  accent: "teal" | "coral";
}) {
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex justify-between text-xs text-ink-faint mb-2">
        <span>{label}</span>
        <button
          type="button"
          className="hover:text-primary transition-colors"
          onClick={() => onChange(formatUnits(balance, 18))}
        >
          Balance: <span className="font-mono-num">{fmtToken(balance)}</span> · Max
        </button>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="number"
          inputMode="decimal"
          placeholder="0.0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-2xl font-mono-num outline-none min-w-0"
        />
        <span
          className="px-3 py-1.5 rounded-lg text-sm font-medium flex-shrink-0"
          style={{
            background: accent === "teal" ? "var(--teal-soft)" : "var(--coral-soft)",
            color: accent === "teal" ? "var(--teal)" : "var(--coral)",
          }}
        >
          {symbol}
        </span>
      </div>
    </div>
  );
}
