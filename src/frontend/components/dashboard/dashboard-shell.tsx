/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @next/next/no-img-element, react/no-unescaped-entities */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Lock } from "lucide-react";
import {
  BackLink,
  BlockButton,
  BlockPanel,
  PixelAvatar,
  ThemeToggle,
  XpBar,
} from "@/frontend/components/mc";
import { useSession } from "@/frontend/components/auth/session-provider";
import { useAsync } from "@/frontend/hooks/use-async";
import { repo, xpProgress } from "@/lib/data";
import { cn } from "@/frontend/lib/utils";

/**
 * Dashboard chrome (mockup SCREEN 7 sidebar + SCREEN 10 mobile tab bar).
 *
 * The sidebar is a persistent rail on desktop and a Framer AnimatePresence
 * drawer on mobile. The bottom tab bar is mobile-only and holds the four
 * highest-traffic destinations, matching the mockup.
 */

/** The 3D campus row, referenced by the lock rule and the hint below. */
const WORLD_HREF = "/world?view=3d";

const NAV = [
  // Profile leads: it is where participant details are filled in, and that is
  // the one thing here a participant MUST do before they can register.
  { href: "/dashboard/profile", label: "Profile", icon: "◉" },
  { href: "/dashboard/explore", label: "Explore Events", icon: "✦" },
  // The walkable campus: every classroom is an event. Lives outside
  // /dashboard so the sidebar does not eat a third of the 3D view.
  { href: WORLD_HREF, label: "3D World", icon: "◆" },
  { href: "/dashboard/schedule", label: "Schedule", icon: "◷" },
  { href: "/dashboard/events", label: "My Events", icon: "▤" },
  { href: "/dashboard/announcements", label: "Announcements", icon: "◈" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
] as const;

/**
 * Staff-only destinations, appended for organizers and admins.
 *
 * The verification queue is load-bearing: the entry fee is paid before
 * registering, so until someone works this queue nobody can register for
 * anything. It had no link at all, which made that a silent dead end.
 *
 * This capability check only decides whether to show the shortcut. `/admin`
 * and every privileged mutation independently reload staff roles from MySQL.
 */
const TABS = [
  { href: "/world", label: "Home", icon: "⌂" },
  { href: "/events", label: "Events", icon: "▤" },
  { href: "/dashboard/profile", label: "Profile", icon: "◉" },
] as const;

/**
 * Destinations that stay open before the profile is complete and the payment
 * verified. Exploring the campus is harmless — registration is enforced
 * inside the event hub itself — so the 3D world is on the list.
 */
const UNLOCKED = new Set<string>([
  "/dashboard/profile",
  "/dashboard/settings",
  "/dashboard/notifications",
  "/dashboard/schedule",
  "/dashboard/explore",
  "/world?view=3d",
]);

/** Active-state matching ignores the query: `usePathname()` never carries one. */
const navPath = (href: string) => href.split("?")[0];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { character, session, signOut } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  /**
   * Lives HERE, not in SidebarContent: that component is mounted twice (the
   * desktop rail and the mobile drawer). Holding this in the child would let
   * someone dismiss the hint on one and still meet it on the other.
   */
  const [worldHintDismissed, setWorldHintDismissed] = useState(false);

  // Auto-redirect if locked out
  useEffect(() => {
    if (session && (!session.isProfileComplete || !session.isPaymentVerified)) {
      const allowedPaths = [
        "/dashboard/profile",
        "/dashboard/settings",
        "/dashboard/guidelines",
        "/dashboard/faq",
        "/dashboard/terms",
        "/dashboard/privacy",
        "/dashboard/explore",
        "/dashboard/schedule",
        "/dashboard/announcements",
      ];
      if (pathname.startsWith("/dashboard") && !allowedPaths.includes(pathname)) {
        router.replace("/dashboard/profile");
      }
    }
  }, [session, pathname, router]);

  const { data: levels } = useAsync(() => repo.reference.levels(), []);
  const progress =
    character && levels ? xpProgress(character.totalXp, levels) : null;

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    // h-dvh (not flex-1) because nothing above this in the tree gives it a
    // constrained height to grow into — the root layout's <body> is only
    // min-h-full. Without an explicit height, this shell has no scroll
    // container of its own, so the WHOLE PAGE scrolls once content (e.g. the
    // Schedule list) outgrows the viewport, dragging the sidebar up and out of
    // view with it. Pinning the shell to the viewport and letting only <main>
    // scroll (below) is what keeps the sidebar in place.
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Mobile header with the drawer trigger. */}
      <header className="flex shrink-0 items-center justify-between gap-[var(--mc-unit)] border-b-[length:var(--mc-bevel)] border-mc-border px-[calc(var(--mc-unit)*1.5)] pb-[var(--mc-unit)] pt-[max(var(--mc-unit),env(safe-area-inset-top))] md:hidden">
        <BlockButton
          size="sm"
          variant="ghost"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          aria-expanded={drawerOpen}
        >
          ☰
        </BlockButton>
        <div className="flex items-center gap-[calc(var(--mc-unit)*0.75)]">
          <ThemeToggle />
          {character ? (
            <>
              <span className="font-pixel text-[10px] text-mc-text">
                {character.playerName}
              </span>
              <PixelAvatar skinId={character.skinId} size={32} />
            </>
          ) : null}
        </div>
      </header>

      {/* min-h-0 overrides the flex default of min-height:auto, which would
          otherwise let this row grow to fit <main>'s full content height
          instead of clipping it at the space actually available — the same
          fix <main>'s own overflow-y-auto needs to do anything. */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop sidebar. No overflow-y-auto here on purpose: the menu stays
            put and never scrolls, independent of how tall <main> gets. */}
        <aside className="hidden w-[220px] shrink-0 flex-col overflow-hidden border-r-[length:var(--mc-bevel)] border-mc-border p-[var(--mc-unit)] md:flex">
          <SidebarContent
            pathname={pathname}
            onNavigate={() => undefined}
            onSignOut={handleSignOut}
            session={session}
            worldHintDismissed={worldHintDismissed}
            onDismissWorldHint={() => setWorldHintDismissed(true)}
          />
        </aside>

        {/* Mobile drawer. */}
        <AnimatePresence>
          {drawerOpen ? (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDrawerOpen(false)}
                className="fixed inset-0 z-40 bg-black/70 md:hidden"
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
                className="fixed inset-y-0 left-0 z-50 flex w-[min(86vw,320px)] flex-col gap-[var(--mc-unit)] overflow-hidden bg-mc-panel px-[calc(var(--mc-unit)*1.5)] pb-[max(var(--mc-unit),env(safe-area-inset-bottom))] pt-[max(var(--mc-unit),env(safe-area-inset-top))] md:hidden"
              >
                <div className="flex shrink-0 justify-end">
                  <BlockButton
                    size="sm"
                    variant="ghost"
                    onClick={() => setDrawerOpen(false)}
                    aria-label="Close menu"
                  >
                    ✕
                  </BlockButton>
                </div>
                <SidebarContent
                  pathname={pathname}
                  onNavigate={() => setDrawerOpen(false)}
                  onSignOut={handleSignOut}
                  session={session}
                  worldHintDismissed={worldHintDismissed}
                  onDismissWorldHint={() => setWorldHintDismissed(true)}
                />
              </motion.aside>
            </>
          ) : null}
        </AnimatePresence>

        {/* Main content — the only scrollable region in the shell. pb clears
            the mobile tab bar. */}
        <main className="min-w-0 flex-1 overflow-y-auto p-[calc(var(--mc-unit)*1.5)] pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-[calc(var(--mc-unit)*1.5)]">
          {character && progress ? (
            <BlockPanel
              variant="panel"
              padded="sm"
              className="mb-[var(--mc-unit)] flex flex-wrap items-center gap-[calc(var(--mc-unit)*1.5)]"
            >
              <div className="flex items-center gap-[var(--mc-unit)]">
                <PixelAvatar skinId={character.skinId} size={44} />
                <div>
                  <p className="font-pixel text-[11px] text-mc-text">
                    {character.playerName}
                  </p>
                  <p className="text-[18px] text-mc-text-dim">
                    {character.totalXp} XP total
                  </p>
                </div>
              </div>
              <XpBar
                className="min-w-[200px] flex-1"
                current={progress.current}
                required={progress.required}
                level={progress.level}
                title={progress.title}
              />
            </BlockPanel>
          ) : null}

          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar was removed per request. */}
    </div>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
  onSignOut,
  session,
  worldHintDismissed,
  onDismissWorldHint,
}: {
  pathname: string;
  onNavigate: () => void;
  onSignOut: () => void;
  session: any;
  worldHintDismissed: boolean;
  onDismissWorldHint: () => void;
}) {
  /**
   * What each destination needs before it opens.
   *
   * The 3D campus deliberately asks for LESS than the rest: filling in your
   * participant details is enough, and the fee is not. Walking the campus is
   * how someone decides whether the fest is worth paying for, so putting it
   * behind the payment turned the best part of the site into something only
   * people who had already committed could see.
   *
   * Registering for an event still needs a verified payment, because that is a
   * commitment the fest has to be able to honour.
   */
  const ALWAYS_OPEN: readonly string[] = [
    "/dashboard/profile",
    "/dashboard/settings",
    "/dashboard/announcements",
    "/dashboard/schedule",
    "/dashboard/explore",
  ];

  function lockFor(href: string): "profile" | "payment" | null {
    if (!session || ALWAYS_OPEN.includes(href)) return null;
    if (!session.isProfileComplete) return "profile";
    if (href === WORLD_HREF) return null; // details are the whole price of entry
    if (!session.isPaymentVerified) return "payment";
    return null;
  }

  return (
    <>
      <div className="shrink-0 pb-[var(--mc-unit)]">
        <Link
          href="/world"
          onClick={onNavigate}
          className="flex items-center gap-[calc(var(--mc-unit)*0.75)] text-mc-eyebrow hover:text-mc-text transition-transform hover:scale-[1.02] active:scale-[0.98] no-underline group"
        >
          <div className="w-8 shrink-0">
            {/* Light theme: show black logo */}
            <img 
              src="https://cdn.jsdelivr.net/gh/abhinavjn45/gateways2026-assets@main/art/brand/gateways-black.svg" 
              alt="Gateways Logo" 
              className="theme-only-light w-full h-auto opacity-90 group-hover:opacity-100 transition-opacity"
            />
            {/* Dark theme: show white logo */}
            <img 
              src="https://cdn.jsdelivr.net/gh/abhinavjn45/gateways2026-assets@main/art/brand/gateways-white.svg" 
              alt="Gateways Logo" 
              className="theme-only-dark w-full h-auto opacity-90 group-hover:opacity-100 transition-opacity"
            />
          </div>
          <span className="font-pixel text-[11px] mt-1 tracking-wide">
            Gateways '26
          </span>
        </Link>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1 flex flex-col gap-[2px]">
        <nav aria-label="Dashboard" className="flex flex-col gap-[2px]">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const lock = lockFor(item.href);
            const isItemLocked = lock !== null;
            // Only ever on the world row, only while the details are what is
            // missing, and only until it is dismissed.
            const showWorldHint =
              item.href === WORLD_HREF && lock === "profile" && !worldHintDismissed;
            
            return (
              <div key={item.href} className="flex flex-col gap-[2px]">
              <Link
                href={isItemLocked ? "/dashboard/profile" : item.href}
                onClick={(e) => {
                  if (isItemLocked) {
                    e.preventDefault();
                  } else {
                    onNavigate();
                  }
                }}
                aria-disabled={isItemLocked}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-[calc(var(--mc-unit)*0.75)] no-underline",
                  "px-[var(--mc-unit)] py-[calc(var(--mc-unit)*0.65)] min-h-[44px]",
                  "text-[19px]",
                  active
                    ? "bg-mc-panel-light text-mc-text bevel-inset"
                    : "text-mc-text-dim hover:bg-mc-panel-light/50 hover:text-mc-text",
                  isItemLocked && "opacity-50 cursor-not-allowed"
                )}
              >
                <span aria-hidden className="w-[18px] text-center flex items-center justify-center h-full">
                  {isItemLocked ? <Lock size={14} /> : item.icon}
                </span>
                {item.label}
              </Link>

              {/* Sits UNDER the row rather than floating beside it: the sidebar
                  is the full height of a narrow column, and a popover anchored
                  to its right edge would either overlap the page content or be
                  clipped by the drawer's own scroll container on mobile. In a
                  vertical nav, directly beneath reads as "attached to this
                  item" just as well, and it can never be cut off. */}
              {showWorldHint ? (
                <div
                  role="status"
                  className={cn(
                    "relative mx-[calc(var(--mc-unit)*0.5)] mb-[calc(var(--mc-unit)*0.5)]",
                    "border-[length:var(--mc-bevel)] border-solid border-mc-gold bg-mc-panel-dark",
                    "px-[calc(var(--mc-unit)*0.75)] py-[calc(var(--mc-unit)*0.6)]",
                    // Room for the button so a long line never runs under it.
                    "pr-[calc(var(--mc-unit)*2.25)]",
                  )}
                >
                  <button
                    type="button"
                    onClick={onDismissWorldHint}
                    aria-label="Dismiss"
                    title="Dismiss"
                    className={cn(
                      "absolute top-0 right-0 grid place-items-center",
                      "h-[26px] w-[26px] cursor-pointer border-0 bg-transparent",
                      "text-[13px] leading-none text-mc-text-dim hover:text-mc-text",
                    )}
                  >
                    <span aria-hidden>✕</span>
                  </button>
                  <p className="text-[15px] leading-snug text-mc-text-dim">
                    Fill in your details to access the world.
                  </p>
                </div>
              ) : null}
              </div>
            );
          })}
        </nav>

        <div className="mt-1 flex flex-col gap-[2px]">
          <h3 className="font-pixel text-[10px] uppercase text-mc-eyebrow px-[var(--mc-unit)] pb-1 pt-2">
            Important
          </h3>
          {[
            { href: "/dashboard/guidelines", label: "Guidelines", icon: "⚑" },
            { href: "/dashboard/faq", label: "FAQs", icon: "⁇" },
            { href: "/dashboard/terms", label: "Terms", icon: "§" },
            { href: "/dashboard/privacy", label: "Privacy", icon: "◎" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-[calc(var(--mc-unit)*0.75)] no-underline",
                "px-[var(--mc-unit)] py-[calc(var(--mc-unit)*0.5)] min-h-[36px]",
                "text-[16px] text-mc-text-dim hover:bg-mc-panel-light/50 hover:text-mc-text"
              )}
            >
              <span aria-hidden className="w-[18px] text-center flex items-center justify-center h-full">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="shrink-0 mt-auto flex flex-col gap-[var(--mc-unit)] pt-[var(--mc-unit)]">
        {/* preferHistory={false}: this is a persistent "return to the map"
            action shown on every dashboard page, not a one-off retracing of
            how the player arrived — history would make it land wherever the
            player happened to be a moment ago (e.g. Schedule) instead. */}
        <BackLink
          href="/"
          onClick={onNavigate}
          className="w-full"
          preferHistory={false}
        />
        <div className="flex items-center gap-[var(--mc-unit)]">
          <BlockButton
            variant="danger"
            size="sm"
            block
            onClick={onSignOut}
            className="min-w-0"
          >
            Logout
          </BlockButton>
          {/* Also in the mobile header above — this copy is the desktop one,
              where the sidebar is the only persistent chrome. */}
          <ThemeToggle className="shrink-0" />
        </div>
      </div>
    </>
  );
}
