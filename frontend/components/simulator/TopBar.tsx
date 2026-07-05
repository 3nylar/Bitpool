"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Droplets, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { activeChain } from "@/lib/wagmi";

export function TopBar() {
  const { data: session } = useSession();

  return (
    <header className="border-b border-line-soft bg-surface">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-display font-semibold"
        >
          <span className="w-8 h-8 rounded-lg gradient-primary-btn flex items-center justify-center text-white">
            <Droplets size={17} strokeWidth={2.4} />
          </span>
          <span className="hidden sm:inline">Bitpool</span>
        </Link>

        <div className="flex items-center gap-3">
          <Badge tone="neutral" className="hidden sm:inline-flex">
            {activeChain.name}
          </Badge>
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus="address"
          />
          {session && (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-ink-faint hover:text-danger transition-colors p-2 rounded-lg hover:bg-canvas-alt"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={17} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
