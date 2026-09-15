"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Music2 } from "lucide-react";
import { BlockButton } from "@/frontend/components/mc";
import { useReducedMotion } from "@/frontend/lib/animation/use-reduced-motion";
import { onSplashDone } from "@/frontend/lib/animation/splash-store";
import {
  getMutedServerSnapshot,
  getTrackAvailableServerSnapshot,
  markAnnounced,
  readMuted,
  readTrackAvailable,
  shouldAnnounce,
  subscribeMuted,
  writeMuted,
} from "@/frontend/lib/audio/music-store";
import { MUSIC_TRACK } from "@/frontend/lib/audio/track";
import { cn } from "@/frontend/lib/utils";

/**
 * How long the track panel stays down, counted from the moment the opening
 * splash clears — not from page load. The splash covers the whole screen for
 * several seconds on a first visit, so a timer started at load would close the
 * panel behind it and nobody would ever see it.
 */
const ANNOUNCE_MS = 5000;

/** Keeps the panel this far inside the viewport's left edge on narrow screens. */
const EDGE_GAP_PX = 8;

/**
 * The music control in the site nav, beside the theme toggle.
 *
 * THIS IS ONLY THE CONTROL. The <audio> element and everything that decides
 * what it plays live in `MusicPlayer`, in the root layout, because the root
 * layout is the one thing that survives a client navigation — mounting audio
 * here would restart the track every time the nav remounted. The two talk only
 * through `music-store`: this writes the mute flag, the player reacts to it.
 * That is the same path the Settings screen already uses.
 *
 * Shape:
 *
 *     [My Account] [🔈] [☀]
 *                  ┌───────────────────────┐
 *                  │ WORKS - AADZY         │   ← drops down once per visit,
 *                  │ Listen to the full …  │     and on hover / focus after
 *                  └───────────────────────┘
 */
export function MusicToggle({ className }: { className?: string }) {
  const muted = useSyncExternalStore(subscribeMuted, readMuted, getMutedServerSnapshot);
  const available = useSyncExternalStore(
    subscribeMuted,
    readTrackAvailable,
    getTrackAvailableServerSnapshot,
  );
  const reduced = useReducedMotion();

  const [announcing, setAnnouncing] = useState(false);
  const [peek, setPeek] = useState(false);
  const [srMessage, setSrMessage] = useState("");
  const collapseTimer = useRef<number | null>(null);
  const splashWait = useRef<(() => void) | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /**
   * Announce on arrival, once per visit.
   *
   * `readMuted()`: someone who turned the music off should not be told what is
   * playing, because nothing is. The nav mounts once per page, so the
   * sessionStorage flag — not this component's state — is what stops the panel
   * dropping again on every route change.
   */
  useEffect(() => {
    if (readMuted() || !shouldAnnounce()) return;
    markAnnounced();
    // Reads storage that does not exist on the server, so it cannot be decided
    // during render without a hydration mismatch. It transitions once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnnouncing(true);
    setSrMessage(`Now playing: ${MUSIC_TRACK.label}`);
    splashWait.current = onSplashDone(() => {
      splashWait.current = null;
      collapseTimer.current = window.setTimeout(() => {
        setAnnouncing(false);
        setSrMessage("");
      }, ANNOUNCE_MS);
    });
    return () => {
      if (collapseTimer.current !== null) window.clearTimeout(collapseTimer.current);
      splashWait.current?.();
    };
  }, []);

  const open = available && (announcing || peek);

  /**
   * Keep the panel on screen.
   *
   * It is right-aligned to the button, which on a desktop bar is near the
   * right edge and fine. On a phone the speaker sits left of the account and
   * menu buttons, and a panel hanging leftward from there runs off the left
   * edge. Measured rather than guessed with breakpoints, because how far in the
   * button sits depends on the account state and the viewport. Mutating the
   * style directly — Framer owns this element's transform and opacity, not its
   * `right` — so no state, no second render.
   */
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    panel.style.right = "0px";
    const overflow = EDGE_GAP_PX - panel.getBoundingClientRect().left;
    if (overflow > 0) panel.style.right = `${-overflow}px`;
  }, [open]);

  if (!available) return null;

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={() => setPeek(true)}
      onMouseLeave={() => setPeek(false)}
      onFocus={() => setPeek(true)}
      // Only close when focus leaves the whole control — tabbing from the
      // button into the link inside the panel must not shut the panel.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPeek(false);
      }}
    >
      <BlockButton
        variant="ghost"
        size="icon"
        onClick={() => writeMuted(!muted)}
        aria-label={muted ? "Unmute music" : "Mute music"}
        title={muted ? "Unmute music" : "Mute music"}
        aria-pressed={!muted}
        className={cn(muted && "text-mc-text-dim")}
      >
        <SpeakerIcon muted={muted} />
      </BlockButton>

      <AnimatePresence>
        {open ? (
          <motion.div
            ref={panelRef}
            // Padding, not margin, for the gap under the button: the padding is
            // part of this element, so moving the pointer from the button down
            // into the panel never leaves the hover area and closes it.
            className="absolute right-0 top-full z-50 pt-[calc(var(--mc-unit)*0.75)]"
            // Drops DOWN: a bottom inset of 100% hides everything, and easing it
            // to zero unrolls the panel from its top edge, with a small fall.
            initial={{ opacity: 0, y: reduced ? 0 : -6, clipPath: "inset(0 0 100% 0)" }}
            animate={{ opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)" }}
            exit={{ opacity: 0, y: reduced ? 0 : -6, clipPath: "inset(0 0 100% 0)" }}
            // The root layout has no MotionConfig, and this nav is also rendered
            // on the homepage outside the (public) group, so it honours reduced
            // motion itself.
            transition={{ duration: reduced ? 0 : 0.35, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div
              className={cn(
                "flex w-max max-w-[calc(100vw-var(--mc-unit)*3)] items-center gap-[var(--mc-unit)]",
                "border-[length:var(--mc-bevel)] border-solid border-mc-border bg-mc-panel-dark bevel",
                "px-[var(--mc-unit)] py-[calc(var(--mc-unit)*0.75)]",
              )}
            >
              <div className="flex min-w-0 flex-col gap-[calc(var(--mc-unit)*0.5)]">
                <p className="font-pixel text-[9px] uppercase tracking-wider text-mc-text" aria-hidden>
                  {MUSIC_TRACK.label}
                </p>
                <a
                  href={MUSIC_TRACK.fullVersionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[17px] leading-none text-mc-accent underline underline-offset-2 hover:text-mc-accent-strong"
                >
                  Listen to the full version here
                  <span className="sr-only"> (opens YouTube in a new tab)</span>
                </a>
              </div>
              <FloatingNotes playing={!muted} reduced={reduced} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Always mounted, filled on announce: a live region added to the DOM in
          the same moment as its text is not reliably read out. */}
      <span className="sr-only" aria-live="polite">
        {srMessage}
      </span>
    </div>
  );
}

/** Where each note starts, and how far behind the first it sets off. */
const NOTES = [
  { left: 1, bottom: 3, delay: 0, size: 11 },
  { left: 11, bottom: 9, delay: 0.42, size: 13 },
  { left: 20, bottom: 2, delay: 0.84, size: 11 },
] as const;

/**
 * Three notes drifting up beside the track name — the panel saying "this is
 * playing" without words.
 *
 * SVG icons, not font glyphs: the pixel font does not carry every music symbol,
 * and a missing glyph renders as an empty box. Staggered delays so they rise one
 * after another rather than as a block. Still and dimmed when muted or when the
 * visitor prefers reduced motion — present, but not moving.
 */
function FloatingNotes({ playing, reduced }: { playing: boolean; reduced: boolean }) {
  const moving = playing && !reduced;
  return (
    <span
      aria-hidden
      className={cn(
        "relative block h-[30px] w-[32px] shrink-0 overflow-hidden",
        playing ? "text-mc-accent-strong" : "text-mc-text-dim",
      )}
    >
      {NOTES.map((note, i) => (
        <motion.span
          key={i}
          className="absolute block drop-shadow-[1px_1px_0_rgba(0,0,0,0.55)]"
          style={{ left: note.left, bottom: note.bottom }}
          animate={
            moving
              ? { y: [3, -7, -14], opacity: [0, 1, 0], rotate: [0, -7, 5] }
              : { y: 0, opacity: 1, rotate: 0 }
          }
          transition={
            moving
              ? { duration: 1.7, delay: note.delay, repeat: Infinity, ease: "easeOut", times: [0, 0.28, 1] }
              : { duration: 0 }
          }
        >
          <Music2 style={{ width: note.size, height: note.size }} strokeWidth={3} />
        </motion.span>
      ))}
    </span>
  );
}

/**
 * A speaker, on the same 9×9 crisp-edged grid as the theme toggle's sun and
 * moon, so the two buttons beside each other read as one icon set. Sound waves
 * while playing; an ✕ in their place when muted.
 */
function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      viewBox="0 0 9 9"
      width={18}
      height={18}
      fill="currentColor"
      shapeRendering="crispEdges"
      aria-hidden
      focusable={false}
    >
      {/* body and cone */}
      <rect x="0" y="3" width="2" height="3" />
      <rect x="2" y="2" width="1" height="5" />
      <rect x="3" y="1" width="1" height="7" />
      {muted ? (
        <>
          <rect x="5" y="3" width="1" height="1" />
          <rect x="7" y="3" width="1" height="1" />
          <rect x="6" y="4" width="1" height="1" />
          <rect x="5" y="5" width="1" height="1" />
          <rect x="7" y="5" width="1" height="1" />
        </>
      ) : (
        <>
          <rect x="5" y="3" width="1" height="3" />
          <rect x="6" y="1" width="1" height="1" />
          <rect x="7" y="2" width="1" height="5" />
          <rect x="6" y="7" width="1" height="1" />
        </>
      )}
    </svg>
  );
}
