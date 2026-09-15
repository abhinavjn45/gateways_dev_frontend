"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import {
  getMutedServerSnapshot,
  markTrackUnavailable,
  readMuted,
  subscribeMuted,
} from "@/frontend/lib/audio/music-store";
import { MUSIC_TRACK } from "@/frontend/lib/audio/track";

/** Fade length. Long enough not to click, short enough not to feel broken. */
const FADE_MS = 1200;
const FADE_STEP_MS = 50;

/**
 * The site's background music — the playback half.
 *
 * MOUNTED IN THE ROOT LAYOUT, which is the whole trick: the App Router never
 * remounts that layout across a client navigation, so this component — and with
 * it the <audio> element and its playback position — survives every <Link> and
 * every `router.push`, including the portal wipe. Mounting it per route group
 * would restart the track on each navigation.
 *
 * IT RENDERS NO UI. The control is `MusicToggle` in the site nav, and on the
 * dashboard the Music section of Settings. None of them touch this element:
 * they write the mute flag in `music-store`, and the effects below turn that
 * flag into play, pause and the fades between. One path in, however many
 * buttons.
 */
export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
   * track the click is about to stop. The click then writes the flag and the
   * mute effect further down fades it out. The button is authoritative because
   * it acts last, not because it acts first.
   *
   * The listeners stay attached until playback genuinely begins rather than
   * using `{ once: true }`: a first attempt can be rejected for reasons that
   * have nothing to do with the gesture, and burning the listener on it would
   * leave the page permanently silent.
   */
  useEffect(() => {
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
  }, []);

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
    // Audible: fade out, as the old in-widget toggle did, so a mute from the
    // nav never clicks. Not audible (the hydration flip, a paused track): snap.
    // The pause re-checks the flag in case an unmute landed mid-fade.
    if (!el.paused && el.volume > 0) {
      fadeTo(0, () => {
        if (readMuted()) el.pause();
      });
      return;
    }
    if (fadeTimer.current !== null) {
      window.clearInterval(fadeTimer.current);
      fadeTimer.current = null;
    }
    el.volume = 0;
    el.pause();
  }, [muted, fadeTo]);

  /**
   * The mirror of the effect above, and the half that Settings needs.
   *
   * Muting from anywhere is already handled; unmuting was not. `writeMuted`
   * notifies this component, but nothing asked the element to resume, so
   * flipping Music back on from the Settings screen updated the buttons and
   * stayed silent. The click that did it is itself the user activation, so
   * this `play()` is allowed.
   */
  useEffect(() => {
    if (muted) return;
    const el = audioRef.current;
    if (!el || !el.paused) return;
    startedRef.current = true;
    void el.play().catch(() => {});
    fadeTo(MUSIC_TRACK.volume);
  }, [muted, fadeTo]);

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
    },
    [],
  );

  return (
    <audio
      ref={audioRef}
      src={MUSIC_TRACK.src}
      loop
      // "auto" so the track is buffered and ready to start the instant the
      // browser permits it, rather than beginning its download at that moment.
      // Nothing at all is fetched for someone who has muted: a several-megabyte
      // file they will never hear is pure cost, especially on fest-day mobile
      // data.
      preload={muted ? "none" : "auto"}
      aria-hidden="true"
      // Missing or undecodable: the nav control hides itself rather than
      // offering a button that does nothing.
      onError={markTrackUnavailable}
    />
  );
}
