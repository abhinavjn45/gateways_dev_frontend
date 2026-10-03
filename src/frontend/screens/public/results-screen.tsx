"use client";

import { useState } from "react";
import { BackLink, BlockPanel } from "@/frontend/components/mc";
import { cn } from "@/frontend/lib/utils";
import { Trophy, Star } from "lucide-react";

export function ResultsScreen() {
  const [activeTab, setActiveTab] = useState<"results" | "leaderboard">("results");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-[calc(var(--mc-unit)*1.5)] px-[calc(var(--mc-unit)*2)] py-[calc(var(--mc-unit)*1.5)] md:p-[calc(var(--mc-unit)*2)]">
      <BackLink href="/" label="Home" />

      <header>
        <h1 className="text-mc-accent text-base md:text-lg">RESULTS & LEADERBOARD</h1>
        <p className="mt-[calc(var(--mc-unit)*0.5)] text-mc-text-dim">
          Track the overall college championship and view winners of individual events.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-[var(--mc-unit)] border-b-[2px] border-mc-border pb-2">
        <button
          onClick={() => setActiveTab("results")}
          className={cn(
            "font-pixel text-[12px] uppercase tracking-wide px-4 py-2 transition-colors",
            activeTab === "results"
              ? "text-mc-gold border-b-[2px] border-mc-gold"
              : "text-mc-text-dim hover:text-mc-text"
          )}
        >
          Event Results
        </button>
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={cn(
            "font-pixel text-[12px] uppercase tracking-wide px-4 py-2 transition-colors",
            activeTab === "leaderboard"
              ? "text-mc-gold border-b-[2px] border-mc-gold"
              : "text-mc-text-dim hover:text-mc-text"
          )}
        >
          Overall Leaderboard
        </button>
      </div>

      <div className="mt-4">
        {activeTab === "results" && <ResultsTab />}
        {activeTab === "leaderboard" && <LeaderboardTab />}
      </div>
    </div>
  );
}

function ResultsTab() {
  return (
    <BlockPanel variant="slot" className="text-center py-[calc(var(--mc-unit)*6)] flex flex-col items-center justify-center">
      <Trophy size={48} className="text-mc-gold mb-4 opacity-50" />
      <h2 className="font-pixel text-mc-gold text-base md:text-lg uppercase">Updating Soon</h2>
      <p className="mt-4 text-mc-text-dim text-[16px] md:text-[18px] max-w-md mx-auto">
        Event results will be revealed here as the fest progresses. Stay tuned!
      </p>
    </BlockPanel>
  );
}

function LeaderboardTab() {
  return (
    <BlockPanel variant="slot" className="text-center py-[calc(var(--mc-unit)*6)] flex flex-col items-center justify-center">
      <Star size={48} className="text-mc-gold mb-4 opacity-50" />
      <h2 className="font-pixel text-mc-gold text-base md:text-lg uppercase">Updating Soon</h2>
      <p className="mt-4 text-mc-text-dim text-[16px] md:text-[18px] max-w-md mx-auto">
        The live college rankings and XP leaderboard will be activated once the games begin!
      </p>
    </BlockPanel>
  );
}
