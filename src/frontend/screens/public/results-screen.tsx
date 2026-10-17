"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BackLink, BlockPanel, LoadingBlocks } from "@/frontend/components/mc";
import { cn } from "@/frontend/lib/utils";
import { useAsync } from "@/frontend/hooks/use-async";
import { fetchFestResults, EventResult } from "@/frontend/lib/events";
import { Trophy, Medal, Award, Crown, Sparkles, Swords, Star, Zap, RefreshCw, ChevronDown } from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────────
   RESULTS & LEADERBOARD — Minecraft-themed championship tracker
   ──────────────────────────────────────────────────────────────────────────── */

export function ResultsScreen() {
  const [activeTab, setActiveTab] = useState<"results" | "leaderboard">("results");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-[calc(var(--mc-unit)*1.5)] px-[calc(var(--mc-unit)*2)] py-[calc(var(--mc-unit)*1.5)] md:p-[calc(var(--mc-unit)*2)]">
      <BackLink href="/" label="Home" />

      {/* ── Hero header ─────────────────────────────────────────────── */}
      <header className="relative">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Trophy size={32} className="text-mc-gold" />
          </motion.div>
          <div>
            <h1 className="text-mc-accent text-base md:text-lg">
              RESULTS & LEADERBOARD
            </h1>
            <p className="mt-[calc(var(--mc-unit)*0.25)] text-mc-text-dim">
              Track the overall college championship and view winners of
              individual events.
            </p>
          </div>
        </div>
      </header>

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-0 border-b-[2px] border-mc-border">
        <TabButton
          active={activeTab === "results"}
          onClick={() => setActiveTab("results")}
          icon={<Swords size={14} />}
          label="Event Results"
        />
        <TabButton
          active={activeTab === "leaderboard"}
          onClick={() => setActiveTab("leaderboard")}
          icon={<Crown size={14} />}
          label="Overall Leaderboard"
        />
      </div>

      {/* ── Tab content ───────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {activeTab === "results" && <ResultsTab />}
          {activeTab === "leaderboard" && <LeaderboardTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Tab button
   ═══════════════════════════════════════════════════════════════════════════ */

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-2 font-pixel text-[11px] uppercase tracking-wide px-5 py-3 transition-all duration-200",
        active
          ? "text-mc-gold"
          : "text-mc-text-dim hover:text-mc-text hover:bg-mc-panel-dark/50"
      )}
    >
      {icon}
      {label}
      {active && (
        <motion.div
          layoutId="tab-indicator"
          className="absolute bottom-[-2px] left-0 right-0 h-[3px] bg-mc-gold"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Results tab — live-refreshing event results
   ═══════════════════════════════════════════════════════════════════════════ */

function ResultsTab() {
  const { data: allFetchedResults, loading, reload } = useAsync(
    () => fetchFestResults(),
    [],
    { pollMs: 30_000 }  // Auto-refresh every 30 seconds for "live" feel
  );

  const [selectedEventSlug, setSelectedEventSlug] = useState<string>("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <BlockPanel variant="slot">
        <LoadingBlocks label="Mining event results" />
      </BlockPanel>
    );
  }

  const results = allFetchedResults || [];

  if (!results || results.length === 0) {
    return <EmptyResultsState />;
  }

  const displayResults = selectedEventSlug === "all" 
    ? results 
    : results.filter(r => r.slug === selectedEventSlug);

  return (
    <div className="flex flex-col gap-[calc(var(--mc-unit)*1.5)]">
      {/* ── Live indicator ────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mc-emerald opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-mc-emerald" />
          </span>
          <span className="font-pixel text-[9px] uppercase tracking-wider text-mc-success">
            Live — auto-updating
          </span>
        </div>
        <button
          onClick={reload}
          className="flex items-center gap-1.5 font-pixel text-[9px] uppercase text-mc-text-dim hover:text-mc-text transition-colors"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* ── Results count ─────────────────────────────────────── */}
      <BlockPanel variant="stone" padded="sm" className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-mc-gold" />
          <span className="font-pixel text-[10px] uppercase text-mc-text">
            {results.length} Event{results.length !== 1 ? "s" : ""} Announced
          </span>
        </div>
        <span className="text-[16px] text-mc-text-dim hidden md:inline">
          Results are revealed as they happen
        </span>
      </BlockPanel>

      {/* ── Event Selector ────────────────────────────────────── */}
      <div className="w-full relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center justify-between bg-mc-slot border-[length:var(--mc-bevel)] border-mc-border px-[calc(var(--mc-unit)*1.5)] py-[calc(var(--mc-unit)*1.25)] font-pixel text-[11px] text-mc-text uppercase outline-none focus:border-mc-gold cursor-pointer text-left"
        >
          <span>
            {selectedEventSlug === "all" 
              ? "All Events" 
              : results.find(r => r.slug === selectedEventSlug)?.name || "All Events"}
          </span>
          <ChevronDown size={18} className={cn("text-mc-text-dim transition-transform duration-200", dropdownOpen && "rotate-180")} />
        </button>

        <AnimatePresence>
          {dropdownOpen && (
            <motion.ul
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-mc-slot border-[length:var(--mc-bevel)] border-mc-border shadow-xl font-pixel text-[11px] uppercase"
            >
              <li
                className="cursor-pointer px-[calc(var(--mc-unit)*1.5)] py-[calc(var(--mc-unit)*1)] transition-colors text-mc-text hover:bg-mc-portal/40"
                onClick={() => {
                  setSelectedEventSlug("all");
                  setDropdownOpen(false);
                }}
              >
                All Events
              </li>
              {results.map((r) => (
                <li
                  key={r.slug}
                  className="cursor-pointer px-[calc(var(--mc-unit)*1.5)] py-[calc(var(--mc-unit)*1)] transition-colors text-mc-text hover:bg-mc-portal/40"
                  onClick={() => {
                    setSelectedEventSlug(r.slug);
                    setDropdownOpen(false);
                  }}
                >
                  {r.name}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {/* ── Result cards grid ─────────────────────────────────── */}
      <div className="grid gap-[calc(var(--mc-unit)*1)] sm:grid-cols-2">
        {displayResults.map((result, i) => (
          <ResultCard key={result.slug} result={result} index={i} />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Individual result card — enchanted Minecraft panel with podium placements
   ═══════════════════════════════════════════════════════════════════════════ */

function ResultCard({ result, index }: { result: EventResult; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: index * 0.08,
        ease: [0.2, 0.8, 0.2, 1],
      }}
    >
      <BlockPanel
        variant="panel"
        padded="none"
        className="group relative overflow-hidden flex flex-col h-full"
      >
        {/* Enchantment shimmer overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-mc-gold/5 via-transparent to-mc-portal/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* ── Card header ──────────────────────────────────────── */}
        <div className="relative flex items-start justify-between gap-2 px-[calc(var(--mc-unit)*1)] pt-[calc(var(--mc-unit)*1)] pb-[calc(var(--mc-unit)*0.75)]">
          <div className="flex-1 min-w-0">
            <p className="font-pixel text-[9px] uppercase tracking-wider text-mc-eyebrow leading-snug">
              {result.kind}
            </p>
            <h3 className="font-pixel text-[12px] uppercase text-mc-gold leading-snug mt-1">
              {result.name}
            </h3>
          </div>
          <div className="shrink-0 w-8 h-8 flex items-center justify-center bg-mc-gold/10 rounded-sm">
            <Trophy size={18} className="text-mc-gold" />
          </div>
        </div>

        {/* ── Placements ───────────────────────────────────────── */}
        <div className="flex flex-col gap-0 border-t-[2px] border-mc-border mx-0">
          {result.firstPosition && (
            <PlacementRow
              rank={1}
              icon={<Trophy size={16} />}
              color="text-mc-gold"
              bgColor="bg-mc-gold/8"
              borderColor="border-mc-gold/20"
              content={result.firstPosition}
            />
          )}

          {result.secondPosition && (
            <PlacementRow
              rank={2}
              icon={<Medal size={16} />}
              color="text-[#C0C0C0]"
              bgColor="bg-[#C0C0C0]/5"
              borderColor="border-[#C0C0C0]/15"
              content={result.secondPosition}
            />
          )}

          {result.thirdPosition && (
            <PlacementRow
              rank={3}
              icon={<Award size={16} />}
              color="text-[#CD7F32]"
              bgColor="bg-[#CD7F32]/5"
              borderColor="border-[#CD7F32]/15"
              content={result.thirdPosition}
            />
          )}

          {!result.firstPosition &&
            !result.secondPosition &&
            !result.thirdPosition && (
              <div className="px-[calc(var(--mc-unit)*1)] py-[calc(var(--mc-unit)*0.75)]">
                <p className="text-[16px] text-mc-text-dim italic">
                  Placements not yet updated.
                </p>
              </div>
            )}
        </div>
      </BlockPanel>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Placement row — a single 1st/2nd/3rd place entry
   ═══════════════════════════════════════════════════════════════════════════ */

function PlacementRow({
  rank,
  icon,
  color,
  bgColor,
  borderColor,
  content,
}: {
  rank: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  content: string;
}) {
  const ordinal = rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd";

  // Split content into lines — the data often contains team name + college + members
  const lines = content.split("\n").filter(Boolean);
  const teamLine = lines[0] || "";
  const detailLines = lines.slice(1);

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-[calc(var(--mc-unit)*1)] py-[calc(var(--mc-unit)*0.75)]",
        "border-t-[1px]",
        borderColor,
        bgColor,
        "transition-colors duration-200",
      )}
    >
      {/* Rank badge */}
      <div
        className={cn(
          "shrink-0 flex flex-col items-center justify-center gap-0.5 mt-0.5",
          color,
        )}
      >
        {icon}
        <span className="font-pixel text-[7px] uppercase">{ordinal}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[16px] text-mc-text break-words whitespace-pre-wrap leading-snug font-medium">
          {teamLine}
        </p>
        {detailLines.map((line, i) => (
          <p
            key={i}
            className="text-[14px] text-mc-text-dim break-words whitespace-pre-wrap leading-snug mt-0.5"
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Empty state — enchanting "awaiting results" screen
   ═══════════════════════════════════════════════════════════════════════════ */

function EmptyResultsState() {
  return (
    <BlockPanel
      variant="slot"
      className="relative overflow-hidden text-center py-[calc(var(--mc-unit)*6)] flex flex-col items-center justify-center"
    >
      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 bg-mc-gold/30"
            style={{
              left: `${15 + i * 14}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [-8, 8, -8],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Animated trophy */}
      <motion.div
        animate={{ y: [-4, 4, -4] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="mb-4"
      >
        <div className="relative">
          <Trophy size={56} className="text-mc-gold opacity-60" />
          <motion.div
            className="absolute -top-1 -right-1"
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles size={16} className="text-mc-gold" />
          </motion.div>
        </div>
      </motion.div>

      <h2 className="font-pixel text-mc-gold text-base md:text-lg uppercase">
        Awaiting Champions
      </h2>
      <p className="mt-4 text-mc-text-dim text-[16px] md:text-[18px] max-w-md mx-auto">
        Event results will be revealed here as they are announced.
        The battlefield is still active!
      </p>
      <div className="mt-6 flex items-center gap-2 text-mc-text-dim">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mc-emerald opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-mc-emerald" />
        </span>
        <span className="font-pixel text-[9px] uppercase tracking-wider">
          Listening for updates…
        </span>
      </div>
    </BlockPanel>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Leaderboard tab — college XP championship tracker
   ═══════════════════════════════════════════════════════════════════════════ */

function LeaderboardTab() {
  return (
    <div className="flex flex-col gap-[calc(var(--mc-unit)*1.5)]">
      {/* Decorative podium graphic */}
      <BlockPanel
        variant="slot"
        className="relative overflow-hidden text-center py-[calc(var(--mc-unit)*5)] flex flex-col items-center justify-center"
      >
        {/* Ambient floating particles */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-mc-portal/40"
              style={{
                left: `${10 + i * 11}%`,
                top: `${15 + (i % 4) * 20}%`,
              }}
              animate={{
                y: [-10, 10, -10],
                x: [-3, 3, -3],
                opacity: [0.15, 0.5, 0.15],
              }}
              transition={{
                duration: 4 + i * 0.3,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Podium illustration */}
        <div className="flex items-end justify-center gap-3 mb-6" aria-hidden>
          {/* 2nd place block */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <Medal size={20} className="text-[#C0C0C0] mb-1" />
            <div className="w-14 h-12 bg-mc-stone bevel flex items-center justify-center">
              <span className="font-pixel text-[10px] text-mc-text">2nd</span>
            </div>
          </motion.div>

          {/* 1st place block (tallest) */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <motion.div
              animate={{ y: [-2, 2, -2] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Crown size={24} className="text-mc-gold mb-1" />
            </motion.div>
            <div className="w-16 h-20 bg-mc-gold [--bevel-light:var(--color-mc-gold-light)] [--bevel-dark:var(--color-mc-gold-dark)] bevel flex items-center justify-center">
              <span className="font-pixel text-[12px] text-mc-panel-dark">1st</span>
            </div>
          </motion.div>

          {/* 3rd place block */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <Award size={18} className="text-[#CD7F32] mb-1" />
            <div className="w-12 h-9 bg-mc-dirt [--bevel-light:var(--color-mc-dirt-light)] [--bevel-dark:var(--color-mc-dirt-dark)] bevel flex items-center justify-center">
              <span className="font-pixel text-[9px] text-mc-text">3rd</span>
            </div>
          </motion.div>
        </div>

        <h2 className="font-pixel text-mc-gold text-base md:text-lg uppercase">
          Championship Podium
        </h2>
        <p className="mt-4 text-mc-text-dim text-[16px] md:text-[18px] max-w-lg mx-auto">
          The live college rankings and XP leaderboard will be activated once
          the games begin! Colleges earn XP through event victories.
        </p>

        {/* XP progress teaser */}
        <div className="mt-6 w-full max-w-xs mx-auto">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-pixel text-[8px] uppercase text-mc-text-dim flex items-center gap-1">
              <Zap size={10} className="text-mc-emerald" />
              College XP Tracker
            </span>
            <span className="font-pixel text-[8px] uppercase text-mc-text-dim">
              Coming Soon
            </span>
          </div>
          <div className="relative h-[calc(var(--mc-unit)*1)] w-full bg-mc-slot bevel-inset overflow-hidden">
            <motion.div
              className="h-full bg-mc-emerald shadow-[inset_0_var(--mc-bevel)_0_0_var(--color-mc-emerald-light)]"
              initial={{ width: "0%" }}
              animate={{ width: ["0%", "65%", "40%", "65%"] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
              }}
            />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 text-mc-text-dim">
          <Star size={14} className="text-mc-gold opacity-50" />
          <span className="font-pixel text-[8px] uppercase tracking-wider">
            Stay tuned, adventurer
          </span>
          <Star size={14} className="text-mc-gold opacity-50" />
        </div>
      </BlockPanel>
    </div>
  );
}
