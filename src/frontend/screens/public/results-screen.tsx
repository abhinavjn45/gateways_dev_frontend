"use client";

import { useState } from "react";
import { BackLink, BlockPanel, LoadingBlocks } from "@/frontend/components/mc";
import { cn } from "@/frontend/lib/utils";
import { useAsync } from "@/frontend/hooks/use-async";
import { fetchFestResults, EventResult } from "@/frontend/lib/events";
import { Trophy, Medal, Star } from "lucide-react";

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
  const { data: results, loading } = useAsync(() => fetchFestResults(), []);

  if (loading) {
    return (
      <BlockPanel variant="slot">
        <LoadingBlocks label="Loading event results" />
      </BlockPanel>
    );
  }

  if (!results || results.length === 0) {
    return (
      <BlockPanel variant="slot" className="text-center py-[calc(var(--mc-unit)*6)] flex flex-col items-center justify-center">
        <Trophy size={48} className="text-mc-gold mb-4 opacity-50" />
        <h2 className="font-pixel text-mc-gold text-base md:text-lg uppercase">Updating Soon</h2>
        <p className="mt-4 text-mc-text-dim text-[16px] md:text-[18px] max-w-md mx-auto">
          Event results will be revealed here as they are announced. Stay tuned!
        </p>
      </BlockPanel>
    );
  }

  return (
    <div className="grid gap-[var(--mc-unit)] sm:grid-cols-2 lg:grid-cols-2">
      {results.map((result) => (
        <BlockPanel key={result.slug} variant="panel" padded="sm" className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-pixel text-[12px] uppercase text-mc-gold leading-snug">{result.name}</h3>
              <p className="text-[14px] text-mc-text-dim font-pixel">{result.kind}</p>
            </div>
          </div>
          
          <div className="mt-3 flex flex-col gap-2 border-t-[2px] border-mc-border pt-3">
            {result.firstPosition && (
              <div className="flex items-start gap-2 text-mc-text">
                <Trophy size={16} className="text-mc-gold shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="font-pixel text-[9px] uppercase text-mc-text-dim">1st Place</p>
                  <p className="text-[16px] break-words whitespace-pre-wrap leading-tight">{result.firstPosition}</p>
                </div>
              </div>
            )}
            
            {result.secondPosition && (
              <div className="flex items-start gap-2 text-mc-text">
                <Medal size={16} className="text-[#C0C0C0] shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="font-pixel text-[9px] uppercase text-mc-text-dim">2nd Place</p>
                  <p className="text-[16px] break-words whitespace-pre-wrap leading-tight">{result.secondPosition}</p>
                </div>
              </div>
            )}
            
            {result.thirdPosition && (
              <div className="flex items-start gap-2 text-mc-text">
                <Medal size={16} className="text-[#CD7F32] shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="font-pixel text-[9px] uppercase text-mc-text-dim">3rd Place</p>
                  <p className="text-[16px] break-words whitespace-pre-wrap leading-tight">{result.thirdPosition}</p>
                </div>
              </div>
            )}
            
            {!result.firstPosition && !result.secondPosition && !result.thirdPosition && (
              <p className="text-sm text-mc-text-dim italic">Details not yet updated.</p>
            )}
          </div>
        </BlockPanel>
      ))}
    </div>
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
