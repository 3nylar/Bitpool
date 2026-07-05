import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PoolPreviewVisual } from "./PoolPreviewVisual";
import { ShieldCheck, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden gradient-trust">
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-32 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <Badge tone="primary" className="mb-6">
            <Sparkles size={13} /> Educational · Zero real funds at risk
          </Badge>
          <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight leading-[1.08] text-ink">
            Understand liquidity pools by actually running one.
          </h1>
          <p className="mt-5 text-lg text-ink-soft leading-relaxed max-w-lg">
            Deposit, swap, and watch impermanent loss happen in real time —
            on a real smart contract, with play tokens that are worth
            exactly nothing. The safest way to build real DeFi intuition.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/login">
              <Button size="lg">Start simulating — it&apos;s free</Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="secondary">
                See how it works
              </Button>
            </a>
          </div>
          <div className="mt-10 flex items-center gap-2 text-sm text-ink-faint">
            <ShieldCheck size={16} className="text-success" />
            No real money ever touches this app — every token is a
            simulator-only asset.
          </div>
        </div>

        <PoolPreviewVisual />
      </div>
    </section>
  );
}
