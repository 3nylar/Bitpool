"use client";

import { useEffect, useState } from "react";

/// The signature visual element of the landing page: a live-feeling preview
/// of exactly what the simulator itself looks like -- two liquid "reserves"
/// connected by a flow, with a price readout that gently drifts, the way a
/// real market does. This is illustrative/decorative only (no real contract
/// data on the marketing page), but it sets correct expectations for what
/// using the product actually feels like, which is the point of a hero.
export function PoolPreviewVisual() {
  const [price, setPrice] = useState(2043.12);
  const [levelA, setLevelA] = useState(62);

  useEffect(() => {
    const id = setInterval(() => {
      setPrice((p) => {
        const drift = (Math.random() - 0.5) * 6;
        return Math.max(1900, Math.min(2200, p + drift));
      });
      setLevelA((l) => {
        const drift = (Math.random() - 0.5) * 4;
        return Math.max(40, Math.min(75, l + drift));
      });
    }, 1800);
    return () => clearInterval(id);
  }, []);

  const levelB = 100 - levelA;

  return (
    <div className="relative w-full max-w-md mx-auto select-none" aria-hidden="true">
      {/* Price readout */}
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10 animate-float-gentle">
        <div className="bg-surface border border-line rounded-full shadow-lifted px-4 py-2 flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="font-mono-num text-ink-soft">1 sETH ≈</span>
          <span className="font-mono-num font-semibold text-ink">
            {price.toFixed(2)}
          </span>
          <span className="text-ink-faint">sUSD</span>
        </div>
      </div>

      <div className="pt-8 grid grid-cols-2 gap-5">
        {/* Tank A -- sUSD */}
        <Tank label="sUSD" level={levelA} color="var(--teal)" colorSoft="var(--teal-soft)" />
        {/* Tank B -- sETH */}
        <Tank label="sETH" level={levelB} color="var(--coral)" colorSoft="var(--coral-soft)" />
      </div>

      {/* Connecting flow pipe */}
      <svg
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-10 z-0"
        viewBox="0 0 100 40"
        fill="none"
      >
        <path
          d="M0 20 Q50 0 100 20"
          stroke="var(--line)"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>

      <p className="mt-6 text-center text-xs text-ink-faint font-mono-num">
        x · y = k — illustrative preview, no real funds
      </p>
    </div>
  );
}

function Tank({
  label,
  level,
  color,
  colorSoft,
}: {
  label: string;
  level: number;
  color: string;
  colorSoft: string;
}) {
  return (
    <div className="relative">
      <div className="relative h-56 rounded-2xl border border-line bg-surface overflow-hidden shadow-soft">
        <div
          className="absolute bottom-0 left-0 right-0 transition-[height] duration-[1800ms] ease-in-out"
          style={{ height: `${level}%`, background: colorSoft }}
        >
          <svg
            className="absolute -top-3 left-0 w-[200%] h-4 animate-wave-shift"
            viewBox="0 0 200 20"
            preserveAspectRatio="none"
          >
            <path
              d="M0 10 Q 12.5 0 25 10 T 50 10 T 75 10 T 100 10 T 125 10 T 150 10 T 175 10 T 200 10 V20 H0 Z"
              fill={colorSoft}
            />
          </svg>
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ background: color }}
          />
        </div>
        <div className="absolute inset-0 flex items-end justify-center pb-4">
          <span
            className="text-2xl font-display font-semibold font-mono-num"
            style={{ color }}
          >
            {Math.round(level)}%
          </span>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-center gap-1.5 text-sm font-medium">
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        {label}
      </div>
    </div>
  );
}
