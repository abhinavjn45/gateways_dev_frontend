"use client";

import { useState } from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { cn } from "@/frontend/lib/utils";
import { blockButton } from "@/frontend/components/mc/block-button";
import { usePathname, useRouter } from "next/navigation";
import { useReducedMotion } from "@/frontend/lib/animation/use-reduced-motion";

function PixelX() {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 8 8"
      shapeRendering="crispEdges"
      fill="currentColor"
      aria-hidden
      focusable="false"
    >
      <path d="M1 1h2v2H1z M3 3h2v2H3z M5 5h2v2H5z" />
      <path d="M5 1h2v2H5z M1 5h2v2H1z" />
    </svg>
  );
}

export function ResultsFab() {
  const pathname = usePathname();
  const router = useRouter();
  const [bubbleDismissed, setBubbleDismissed] = useState(false);
  const reducedMotion = useReducedMotion();

  // Don't show the FAB if we're already on the results page or leaderboard page
  if (pathname === "/results" || pathname === "/leaderboard") {
    return null;
  }

  // Hide it on admin/dashboard screens to avoid cluttering those specific areas
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/world") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/signup"
  ) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-[calc(var(--mc-unit)*1.5)] left-[calc(var(--mc-unit)*1.5)] z-30",
        "sm:bottom-[calc(var(--mc-unit)*2)] sm:left-[calc(var(--mc-unit)*2)]",
        "flex items-center gap-[calc(var(--mc-unit)*1.25)]",
        "transition-[opacity,transform] duration-300 ease-out",
        !reducedMotion && "animate-in fade-in slide-in-from-bottom-4"
      )}
    >
      <Link
        href="/results"
        aria-label="Results & Leaderboard"
        title="Results & Leaderboard"
        className={cn(
          blockButton({ variant: "gold" }),
          "h-[56px] w-[56px] sm:h-[64px] sm:w-[64px] p-0 rounded-none",
          "shadow-[4px_4px_0_rgba(0,0,0,.35)]"
        )}
      >
        <Trophy size={28} className={cn(!reducedMotion && "animate-pulse")} />
      </Link>

      {!bubbleDismissed ? (
        <div className="relative hidden sm:block animate-in fade-in slide-in-from-left-4 duration-500 delay-300 fill-mode-both">
          <Link
            href="/results"
            className={cn(
              "block cursor-pointer appearance-none whitespace-nowrap border-0 no-underline",
              "bg-mc-panel text-mc-text [--bevel-light:var(--color-mc-panel-light)]",
              "[--bevel-dark:var(--color-mc-panel-dark)] bevel",
              "px-[calc(var(--mc-unit)*1.25)] py-[calc(var(--mc-unit)*0.75)]",
              "font-pixel text-[9px] uppercase tracking-[0.12em]",
              "transition-[filter] duration-75 hover:brightness-110",
              "shadow-[4px_4px_0_rgba(0,0,0,.35)]"
            )}
          >
            Check Results
          </Link>

          {/* The tail pointing LEFT to the FAB */}
          <span
            aria-hidden
            className="pointer-events-none absolute -left-[8px] top-1/2 h-[8px] w-[8px] -translate-y-1/2 bg-mc-panel shadow-[-4px_4px_0_rgba(0,0,0,.35)]"
          />

          {/* Dismiss button, on the bubble's right corner. */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setBubbleDismissed(true);
            }}
            aria-label="Dismiss"
            className={cn(
              "absolute -right-[9px] -top-[9px] grid h-[20px] w-[20px] place-items-center",
              "cursor-hand appearance-none border-0",
              "bg-mc-panel-dark text-mc-redstone",
              "border-[length:var(--mc-bevel)] border-mc-border",
              "transition-[filter] duration-75 hover:brightness-125",
              "shadow-[2px_2px_0_rgba(0,0,0,.35)]"
            )}
          >
            <PixelX />
          </button>
        </div>
      ) : null}
    </div>
  );
}
