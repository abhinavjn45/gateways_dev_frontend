"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BlockButton,
  BlockPanel,
  ItemIcon,
  LoadingBlocks,
  PixelAvatar,
  showToast,
} from "@/frontend/components/mc";
import { useSession } from "@/frontend/components/auth/session-provider";
import { McWorld } from "@/frontend/components/minecraft/world-loader";
import { EventHubModal } from "@/frontend/components/minecraft/event-hub-modal";
import { AudioControl } from "@/frontend/components/minecraft/audio-control";
import { useAsync } from "@/frontend/hooks/use-async";
import { detectWebGL } from "@/frontend/lib/ambient/detect-webgl";
import { eventTime, fetchFestEvents, type FestEvent } from "@/frontend/lib/events";
import config from "@/frontend/lib/minecraft/config.json";
import { bindEventsToRooms, roomIndexForEvent } from "@/frontend/lib/minecraft/bind-rooms";
import type { EngineHandle, WorldMeta } from "@/frontend/lib/minecraft/engine-types";
import type { ItemName } from "@/frontend/lib/assets/manifest";
import { cn } from "@/frontend/lib/utils";
import { hasBeenWelcomed, markWelcomed } from "@/frontend/lib/welcome-store";

type View = "3d" | "list";
type Support = "checking" | "ready" | "unsupported" | "reduced-motion";

/** Icons cycle across the event cards in the List view. */
const EVENT_ITEMS: ItemName[] = ["pickaxe", "book", "sword", "camera", "craftingTable", "trophy", "chest", "warpOrb"];

async function fetchWorldMeta(): Promise<WorldMeta> {
  const res = await fetch("/prismarine/world.meta.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`world.meta.json: HTTP ${res.status}`);
  return (await res.json()) as WorldMeta;
}

/**
 * SCREEN 6 — the campus.
 *
 * Two views of the same thing:
 *
 *  - **3D** — the real voxel campus (prismarine-viewer engine, first person).
 *    Every classroom is one fest event; stand inside and press E for its hub.
 *    Needs WebGL and a ~1.8 MB one-off download, so it is the default only on
 *    desktop-sized screens that can run it.
 *  - **List** — the same classrooms as cards. The screen-reader, no-WebGL and
 *    small-screen path; the hub modal works from here too.
 *
 * The world itself is generated at build time with numbered classroom slots.
 * The live event list is fetched here and bound onto those slots
 * (`bindEventsToRooms`), so the Google Sheet can change without a rebuild.
 */
export function WorldScreen({
  initialView,
  initialEvent,
}: {
  initialView?: View;
  initialEvent?: string;
}) {
  const { character } = useSession();

  const { data: events, error: eventsError, loading: eventsLoading, reload } = useAsync(fetchFestEvents, []);
  const { data: meta, error: metaError } = useAsync(fetchWorldMeta, []);

  // ---- capability -------------------------------------------------------
  const [support, setSupport] = useState<Support>("checking");
  useEffect(() => {
    // Probing WebGL and the motion preference means touching browser APIs that
    // do not exist during SSR, so this cannot move into a lazy state
    // initialiser without a hydration mismatch. It runs exactly once and settles.
    const reduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.dataset.reduceMotion === "true";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupport(reduced ? "reduced-motion" : detectWebGL() ? "ready" : "unsupported");
  }, []);

  // ---- view --------------------------------------------------------------
  const [view, setView] = useState<View>(() => initialView ?? "list");
  // Once the user picks a view, stop auto-selecting for them.
  const userChose = useRef(initialView !== undefined);
  useEffect(() => {
    if (userChose.current) return;
    if (support !== "ready") return;
    if (window.matchMedia("(max-width: 640px)").matches) return;
    // Reacting to the async result of WebGL capability detection; it
    // transitions once, from the pre-detection default to the detected one.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView("3d");
  }, [support]);
  const chooseView = (next: View) => {
    userChose.current = true;
    setView(next);
  };

  // ---- rooms -------------------------------------------------------------
  const { bindings, overflow } = useMemo(
    () =>
      meta
        ? bindEventsToRooms(events ?? [], meta.rooms, {
            spare: config.spare,
            comingSoon: config.comingSoon,
          })
        : { bindings: [], overflow: [] as FestEvent[] },
    [events, meta],
  );
  const eventBySlug = useMemo(() => new Map((events ?? []).map((e) => [e.slug, e])), [events]);
  const roomNameFor = useCallback(
    (slug: string) => {
      const idx = roomIndexForEvent(bindings, slug);
      return idx === null ? null : (meta?.rooms[idx]?.name ?? null);
    },
    [bindings, meta],
  );

  useEffect(() => {
    if (!eventsError) return;
    showToast({
      title: "Events did not load",
      body: "The classrooms are unlabelled for now — retry to fetch the line-up.",
      severity: "critical",
    });
  }, [eventsError]);

  useEffect(() => {
    if (overflow.length && process.env.NODE_ENV !== "production") {
      console.warn(
        `[world] ${overflow.length} event(s) have no classroom — raise world.slots in src/frontend/lib/minecraft/config.json and run npm run mc:assets`,
      );
    }
  }, [overflow]);

  // ---- the hub modal -----------------------------------------------------
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const activeEvent = activeSlug ? (eventBySlug.get(activeSlug) ?? null) : null;
  const engine = useRef<EngineHandle | null>(null);
  useEffect(() => {
    engine.current?.setUiOpen(activeEvent !== null);
  }, [activeEvent]);
  const openHub = useCallback((slug: string) => setActiveSlug(slug), []);
  const closeHub = useCallback(() => setActiveSlug(null), []);

  // ---- where to spawn ----------------------------------------------------
  const [spawnSlug, setSpawnSlug] = useState<string | null>(initialEvent ?? null);
  const spawnRoom = spawnSlug ? (roomIndexForEvent(bindings, spawnSlug) ?? undefined) : undefined;
  const walkTo = (slug: string) => {
    const idx = roomIndexForEvent(bindings, slug);
    if (idx === null) return;
    if (view === "3d" && engine.current) {
      engine.current.teleportToRoom(idx);
      return;
    }
    setSpawnSlug(slug);
    chooseView("3d");
  };

  // ---- welcome toast, once per sign-in -----------------------------------
  const welcomed = useRef(false);
  useEffect(() => {
    if (welcomed.current || !character) return;
    if (hasBeenWelcomed(character.userId)) return;
    welcomed.current = true;
    markWelcomed(character.userId);
    showToast({
      title: `Welcome, ${character.playerName}!`,
      body: "Every classroom is an event. Walk in and press E.",
      severity: "success",
    });
  }, [character]);

  // The engine boots only once the event list has settled (loaded or failed),
  // so the very first frame already has the right names on the doors.
  const worldReady = meta !== null && !eventsLoading;
  const playerName = character?.playerName ?? "Player";

  return (
    <div className="flex flex-1 flex-col gap-[var(--mc-unit)] p-[var(--mc-unit)]">
      <header className="flex flex-wrap items-center justify-between gap-[var(--mc-unit)]">
        {character ? (
          <BlockPanel variant="panel" padded="sm" className="flex items-center gap-[var(--mc-unit)]">
            <PixelAvatar skinId={character.skinId} size={40} />
            <div>
              <p className="font-pixel text-[11px] text-mc-success">Welcome, {character.playerName}!</p>
              <p className="text-[18px] text-mc-text-dim">
                Level {character.level} · {character.title}
              </p>
            </div>
          </BlockPanel>
        ) : (
          <div aria-hidden />
        )}

        <div className="flex items-center gap-[calc(var(--mc-unit)*0.75)]">
          <div role="group" aria-label="Campus view" className="flex gap-[3px]">
            <BlockButton
              size="sm"
              variant={view === "3d" ? "primary" : "ghost"}
              aria-pressed={view === "3d"}
              // Only disabled when WebGL is genuinely unavailable. Under reduced
              // motion it stays selectable — an informed choice, not a lockout.
              disabled={support === "unsupported"}
              title={
                support === "unsupported"
                  ? "3D needs WebGL, which this browser does not provide"
                  : support === "reduced-motion"
                    ? "You have reduced motion enabled — 3D involves camera movement"
                    : undefined
              }
              onClick={() => chooseView("3d")}
            >
              3D
            </BlockButton>
            <BlockButton
              size="sm"
              variant={view === "list" ? "primary" : "ghost"}
              aria-pressed={view === "list"}
              onClick={() => chooseView("list")}
            >
              List
            </BlockButton>
          </div>

          {eventsError ? (
            <BlockButton size="sm" variant="gold" onClick={reload}>
              Retry events
            </BlockButton>
          ) : null}

          <AudioControl />

          {/* A Link styled as a block button, rather than a button wrapping a
              Link: keeps real anchor semantics (middle-click, focus, crawling). */}
          <Link
            href="/dashboard"
            className={cn(
              "inline-flex items-center justify-center no-underline",
              "min-h-[36px] px-[calc(var(--mc-unit)*1.5)]",
              "font-pixel text-[10px] uppercase tracking-wider",
              "bg-mc-emerald text-mc-obsidian bevel",
              "[--bevel-light:var(--color-mc-emerald-light)] [--bevel-dark:var(--color-mc-emerald-dark)]",
              "hover:brightness-110 active:translate-y-[var(--mc-bevel)] active:bevel-pressed",
            )}
          >
            Inventory
          </Link>
        </div>
      </header>

      {metaError ? (
        <BlockPanel variant="slot" padded="md" className="border-mc-danger">
          <p className="font-pixel text-[11px] uppercase text-mc-danger">The campus is not built</p>
          <p className="mt-[calc(var(--mc-unit)*0.5)] text-[18px] text-mc-text-dim">
            <code>/prismarine/world.meta.json</code> is missing. Run <code>npm run mc:assets</code> and
            reload.
          </p>
        </BlockPanel>
      ) : view === "3d" ? (
        <>
          {support === "reduced-motion" ? (
            <BlockPanel variant="slot" padded="sm" className="border-mc-gold">
              <p className="text-[18px] text-mc-text-dim">
                You have reduced motion enabled. The 3D view moves the camera as you walk — switch to{" "}
                <button
                  type="button"
                  onClick={() => chooseView("list")}
                  className="cursor-pointer text-mc-eyebrow underline"
                >
                  List
                </button>{" "}
                if that is uncomfortable.
              </p>
            </BlockPanel>
          ) : null}

          {worldReady && meta ? (
            <McWorld
              playerName={playerName}
              meta={meta}
              bindings={bindings}
              spawnRoom={spawnRoom}
              onOpenEvent={openHub}
              onReady={(h) => {
                engine.current = h;
              }}
              onExit={() => chooseView("list")}
              className="min-h-[560px] flex-1 border-[length:var(--mc-bevel)] border-mc-border bevel-inset"
            />
          ) : (
            <div className="grid min-h-[560px] flex-1 place-items-center bg-mc-obsidian border-[length:var(--mc-bevel)] border-mc-border bevel-inset">
              <LoadingBlocks label="Fetching the events" />
            </div>
          )}
        </>
      ) : (
        <ul className="grid flex-1 content-start gap-[var(--mc-unit)] sm:grid-cols-2 lg:grid-cols-3">
          {eventsLoading ? (
            <li className="sm:col-span-2 lg:col-span-3">
              <div className="grid min-h-[200px] place-items-center">
                <LoadingBlocks label="Fetching the events" />
              </div>
            </li>
          ) : null}
          {[...bindings.filter((b) => b.slug).map((b) => eventBySlug.get(b.slug!)!), ...overflow]
            .filter(Boolean)
            .map((e, i) => {
              const room = roomNameFor(e.slug);
              return (
                <li key={e.slug}>
                  <BlockPanel
                    variant="panel"
                    padded="md"
                    className="flex h-full flex-col gap-[calc(var(--mc-unit)*0.75)]"
                  >
                    <div className="flex items-start gap-[var(--mc-unit)]">
                      <ItemIcon item={EVENT_ITEMS[i % EVENT_ITEMS.length]} size={24} />
                      <div className="min-w-0">
                        <p className="font-pixel text-[11px] uppercase text-mc-accent-strong">{e.name}</p>
                        <p className="mt-[calc(var(--mc-unit)*0.5)] text-[19px] text-mc-text-dim">
                          {[e.kind, e.date, eventTime(e), e.venue].filter(Boolean).join(" · ")}
                        </p>
                        <p className="mt-[calc(var(--mc-unit)*0.25)] font-pixel text-[9px] uppercase text-mc-eyebrow">
                          {room ? `Classroom ${room}` : "No classroom yet"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-auto flex gap-[calc(var(--mc-unit)*0.5)]">
                      <BlockButton size="sm" variant="portal" onClick={() => openHub(e.slug)}>
                        Open hub
                      </BlockButton>
                      {room && support !== "unsupported" ? (
                        <BlockButton size="sm" variant="ghost" onClick={() => walkTo(e.slug)}>
                          Walk there
                        </BlockButton>
                      ) : null}
                    </div>
                  </BlockPanel>
                </li>
              );
            })}
        </ul>
      )}

      <EventHubModal event={activeEvent} onClose={closeHub} />
    </div>
  );
}
