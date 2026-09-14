"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BlockButton } from "@/frontend/components/mc";
import { useReducedMotion } from "@/frontend/lib/animation/use-reduced-motion";
import {
  getMutedServerSnapshot,
  markAnnounced,
  readMuted,
  shouldAnnounce,
  subscribeMuted,
  writeMuted,
} from "@/frontend/lib/audio/music-store";
import { MUSIC_TRACK } from "@/frontend/lib/audio/track";
import { cn } from "@/frontend/lib/utils";

/** How long the track name stays out before it rolls back behind the button. */
const ANNOUNCE_MS = 5000;
/** Fade length. Long enough not to click, short enough not to feel broken. */
const FADE_MS = 1200;
const FADE_STEP_MS = 50;

/**
 * The site's background music, and the Minecraft-style toast that announces it.
 *
 * MOUNTED IN THE ROOT LAYOUT, which is the whole trick: the App Router never
 * remounts that layout across a client navigation, so this component — and with
 * it the <audio> element and its playback position — survives every <Link> and
 * every `router.push`, including the portal wipe. Mounting it per route group
 * would restart the track on each navigation.
 *
 * Shape of the widget:
 *
 *   ┌─────┐┌──────────────────────────┐
 *   │  ♫  ││ NOW PLAYING — PARALLAX…  │   ← announced once per visit
 *   └─────┘└──────────────────────────┘
 *   ┌─────┐
 *   │  ♫  │                               ← the resting state, and the toggle
 *   └─────┘
 *
 * The button is always mounted and the label rolls out from behind it. That
 * ordering matters: a visitor who muted last week must still find a control on
 * arrival, so the button can never be conditional on something playing.
 */
export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [available, setAvailable] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [peek, setPeek] = useState(false);
  const [srMessage, setSrMessage] = useState("");

  const reduced = useReducedMotion();

  /**
   * The stored mute preference, read through `useSyncExternalStore` rather than
   * copied into state by an effect. React renders the server snapshot during
   * hydration and the real one immediately after, so there is no mismatch, no
   * cascading render, and muting in one tab is reflected in the others.
   */
  const muted = useSyncExternalStore(subscribeMuted, readMuted, getMutedServerSnapshot);

  /**
   * Mute, mirrored into a ref.
   *
   * The listeners below are attached once and must see the CURRENT value
   * without being torn down and re-attached every time it flips — and one of
   * them races the toggle directly. See `tryPlay`.
   */
  const mutedRef = useRef(false);
  /** Has the track ever actually started? Gates resume-on-tab-focus. */
  const startedRef = useRef(false);
  const fadeTimer = useRef<number | null>(null);
  const collapseTimer = useRef<number | null>(null);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  /** Ramp the volume instead of jumping, in both directions. */
  const fadeTo = useCallback((target: number, onDone?: () => void) => {
    const el = audioRef.current;
    if (!el) return;
    if (fadeTimer.current !== null) window.clearInterval(fadeTimer.current);

    const from = el.volume;
    const steps = Math.max(1, Math.round(FADE_MS / FADE_STEP_MS));
    let step = 0;

    fadeTimer.current = window.setInterval(() => {
      step += 1;
      const t = Math.min(1, step / steps);
      el.volume = Math.min(1, Math.max(0, from + (target - from) * t));
      if (t >= 1) {
        if (fadeTimer.current !== null) window.clearInterval(fadeTimer.current);
        fadeTimer.current = null;
        onDone?.();
      }
    }, FADE_STEP_MS);
  }, []);

  /* Start silent so the first note is the start of a fade, never a blast. */
  useEffect(() => {
    const el = audioRef.current;
    if (el) el.volume = 0;
  }, []);

  /**
   * Arm playback against the autoplay policy.
   *
   * Browsers reject `play()` until the visitor has interacted, so the real
   * start is whatever they touch first — which may well be the mute button
   * itself. `pointerdown` fires before `click`, so for that one gesture this
   * listener runs while the preference still reads "unmuted" and starts the
   * track the click is about to stop. The click handler then pauses it, and
   * the invariant effect further down catches anything that slips past. The
   * button is authoritative because it acts last, not because it acts first.
   *
   * The listeners stay attached until playback genuinely begins rather than
   * using `{ once: true }`: a first attempt can be rejected for reasons that
   * have nothing to do with the gesture, and burning the listener on it would
   * leave the page permanently silent.
   */
  useEffect(() => {
    if (!available) return;
    const el = audioRef.current;
    if (!el) return;

    const events = ["pointerdown", "keydown", "touchstart"] as const;
    const tryPlay = () => {
      // readMuted(), NOT the rendered value or the ref: during hydration this
      // component renders the SERVER snapshot (unmuted), and the effect below
      // runs against it before the real preference arrives. Asking storage
      // directly is the only reading that is never a frame behind.
      if (readMuted()) return;
      startedRef.current = true;
      void el.play().catch(() => {
        /* Still blocked — wait for the next gesture. */
      });
    };

    // Worth one attempt up front: a returning visitor may already have enough
    // media engagement for the browser to allow it with no gesture at all.
    tryPlay();
    events.forEach((name) => window.addEventListener(name, tryPlay));
    return () => events.forEach((name) => window.removeEventListener(name, tryPlay));
  }, [available]);

  /**
   * Announce off the element's own `playing` event, not off the `play()` call.
   * `play()` resolving means the request was accepted; `playing` means sound is
   * actually coming out. Announcing on the former shows the label over silence
   * whenever the network is slow.
   */
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onPlaying = () => {
      if (readMuted()) {
        // Playback that began before the stored preference was known. Stop it
        // where it stands rather than fading up into a muted visitor's ears.
        el.pause();
        return;
      }
      fadeTo(MUSIC_TRACK.volume);
      if (!shouldAnnounce()) return;
      markAnnounced();
      setExpanded(true);
      setSrMessage(MUSIC_TRACK.label);
      collapseTimer.current = window.setTimeout(() => {
        setExpanded(false);
        setSrMessage("");
      }, ANNOUNCE_MS);
    };

    el.addEventListener("playing", onPlaying);
    return () => el.removeEventListener("playing", onPlaying);
  }, [fadeTo]);

  /**
   * Muted means silent, whatever route got us here — the hydration snapshot
   * flipping to the stored value, or another tab muting through the `storage`
   * event. Without this the reload of an already-muted visit starts the track.
   */
  useEffect(() => {
    if (!muted) return;
    const el = audioRef.current;
    if (!el) return;
    if (fadeTimer.current !== null) {
      window.clearInterval(fadeTimer.current);
      fadeTimer.current = null;
    }
    el.volume = 0;
    el.pause();
  }, [muted]);

  /**
   * Silence a backgrounded tab. Music leaking out of a tab someone left twenty
   * minutes ago is the single most common complaint about sites that do this,
   * and by then they have usually forgotten which tab to blame.
   *
   * Resuming is gated on `startedRef` so returning to a tab never STARTS music
   * for someone who never had any.
   */
  useEffect(() => {
    const onVisibility = () => {
      const el = audioRef.current;
      if (!el) return;
      if (document.hidden) {
        el.pause();
      } else if (!mutedRef.current && startedRef.current) {
        void el.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(
    () => () => {
      if (fadeTimer.current !== null) window.clearInterval(fadeTimer.current);
      if (collapseTimer.current !== null) window.clearTimeout(collapseTimer.current);
    },
    [],
  );

  const toggle = useCallback(() => {
    const next = !mutedRef.current;
    // The ref leads the store here on purpose: the window listener armed above
    // runs on the same click (pointerdown fires before click) and must already
    // see the new value, which a re-render cannot guarantee in time.
    mutedRef.current = next;
    writeMuted(next); // notifies the store, which re-renders this component

    const el = audioRef.current;
    if (!el) return;

    if (next) {
      fadeTo(0, () => el.pause());
      return;
    }
    startedRef.current = true;
    void el.play().catch(() => {});
    // Also fade here rather than leaning on `playing`: that event does not fire
    // again if the element was merely faded to zero and never fully paused.
    fadeTo(MUSIC_TRACK.volume);
  }, [fadeTo]);

  const showLabel = expanded || peek;

  return (
    <>
      <audio
        ref={audioRef}
        src={MUSIC_TRACK.src}
        loop
        // Nothing is fetched for someone who has muted: a several-megabyte file
        // they will never hear is pure cost, especially on fest-day mobile data.
        preload={muted ? "none" : "metadata"}
        aria-hidden="true"
        onError={() => setAvailable(false)}
      />

      {/* Missing or undecodable track: no button, no dead control, no error.
          The site simply has no music until the file lands on the CDN. */}
      {available ? (
        <div
          className={cn(
            "fixed bottom-[calc(var(--mc-unit)*1.5)] left-[calc(var(--mc-unit)*1.5)] z-30 flex items-center",
            "sm:bottom-[calc(var(--mc-unit)*2)] sm:left-[calc(var(--mc-unit)*2)]",
          )}
          onMouseEnter={() => setPeek(true)}
          onMouseLeave={() => setPeek(false)}
        >
          <BlockButton
            size="icon"
            variant="ghost"
            onClick={toggle}
            onFocus={() => setPeek(true)}
            onBlur={() => setPeek(false)}
            aria-label={muted ? "Unmute music" : "Mute music"}
            title={muted ? "Unmute music" : "Mute music"}
            aria-pressed={!muted}
            // Above the label, and opaque, so the label rolls out from behind it.
            className={cn("relative z-10", muted && "opacity-60")}
          >
            <span aria-hidden="true">{muted ? "♪̸" : "♪"}</span>
          </BlockButton>

          <AnimatePresence>
            {showLabel ? (
              <motion.div
                // clip-path rather than width: it wipes the panel out from
                // behind the button with no layout work per frame and no
                // measuring of the text, which can be any length.
                initial={{ clipPath: "inset(0 100% 0 0)", opacity: 0 }}
                animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
                exit={{ clipPath: "inset(0 100% 0 0)", opacity: 0 }}
                // The root layout has no <MotionConfig reducedMotion="user">
                // (only the (public) and (realm) layouts do), so this component
                // has to honour the preference itself. The label still appears —
                // it just arrives instead of travelling.
                transition={{
                  duration: reduced ? 0 : 0.45,
                  ease: [0.2, 0.8, 0.2, 1], // --ease-block
                }}
                // Decorative twin of the live region below; announcing both
                // would read the track name to a screen reader twice.
                aria-hidden="true"
                className={cn(
                  "ml-[calc(var(--mc-bevel)*-1)] bg-mc-panel bevel",
                  "border-[length:var(--mc-bevel)] border-solid border-mc-border",
                  "px-[calc(var(--mc-unit)*1.5)] py-[calc(var(--mc-unit)*0.75)]",
                  "font-pixel text-[9px] uppercase tracking-wider text-mc-text",
                  // A long track name must never be able to push the page wide.
                  "max-w-[calc(100vw-var(--mc-unit)*14)] truncate",
                )}
              >
                {MUSIC_TRACK.label}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Always mounted, populated on announce: a live region added to the
              DOM at the same moment as its text is not reliably read out. */}
          <span className="sr-only" aria-live="polite">
            {srMessage}
          </span>
        </div>
      ) : null}
    </>
  );
}
