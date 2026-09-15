/**
 * Two remembered facts about the background music.
 *
 * Same shape as `animation/splash-store.ts` and `theme/theme-store.ts`: a plain
 * module, no React, every access wrapped because storage throws outright in
 * private mode rather than returning null.
 *
 * The two live in DIFFERENT storages on purpose:
 *
 *  - The mute choice is a preference. Someone who turned the music off means it
 *    for good, so it goes in localStorage and survives closing the tab.
 *  - "Already announced" is about this visit only. The label is a greeting; a
 *    greeting on every route change would be noise, and a greeting that never
 *    comes back would make the feature invisible to anyone who returns tomorrow.
 *    sessionStorage draws that line for free — and, like the splash, module
 *    state could not, because a reload throws module state away and the label
 *    would replay on every refresh.
 *
 * The predecessor key `mc-gateways:audio-muted` is deliberately NOT migrated.
 * It is off-convention (everything else here is `parallax:*`), and it cannot
 * hold a real value for anybody: the only component that ever wrote it bailed
 * out before rendering because its audio file was never added to the repo.
 */

export const MUSIC_MUTED_KEY = "parallax:music-muted";
export const MUSIC_ANNOUNCED_KEY = "parallax:music-announced";

/**
 * Subscribers for `useSyncExternalStore`.
 *
 * The `storage` event covers OTHER tabs but never the tab that did the writing,
 * so a local set is needed as well — the same two-source shape
 * `useReducedMotion` uses for its own preference.
 */
const listeners = new Set<() => void>();

/**
 * True when the visitor has muted the music.
 *
 * Defaults to FALSE — music on. Nothing plays until the first click regardless
 * (browsers see to that), so the default decides what happens after that click,
 * and the feature exists to be heard.
 */
export function readMuted(): boolean {
  try {
    return localStorage.getItem(MUSIC_MUTED_KEY) === "1";
  } catch {
    // Storage disabled. Unmuted is the honest default; the toggle still works
    // for this page view, it just will not be remembered.
    return false;
  }
}

export function writeMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUSIC_MUTED_KEY, muted ? "1" : "0");
  } catch {
    /* Nothing to do — the choice simply lasts as long as the tab does. */
  }
  listeners.forEach((notify) => notify());
}

/**
 * `useSyncExternalStore` plumbing, which is what lets the widget read storage
 * WITHOUT a "set state in an effect" dance: React renders the server snapshot
 * during hydration and swaps to the real one immediately after, with no
 * mismatch and no cascading render. Muting in one tab follows in the others.
 */
export function subscribeMuted(notify: () => void): () => void {
  listeners.add(notify);
  window.addEventListener("storage", notify);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", notify);
  };
}

/** The server cannot know the preference; unmuted matches `readMuted`'s default. */
export function getMutedServerSnapshot(): boolean {
  return false;
}

/**
 * Whether the track actually loaded.
 *
 * The <audio> element lives in the root layout and the control lives in the
 * site nav, so "the file is missing or undecodable — show no control" has to
 * cross between them. Module state rather than storage: it describes THIS page
 * load, and a file that 404s now may be fine after a deploy. Read it with the
 * same `subscribeMuted` subscription — every notify re-reads every snapshot.
 */
let trackAvailable = true;

export function readTrackAvailable(): boolean {
  return trackAvailable;
}

export function markTrackUnavailable(): void {
  if (!trackAvailable) return;
  trackAvailable = false;
  listeners.forEach((notify) => notify());
}

/** Assume it loads. A control that vanishes on error beats one that flashes in. */
export function getTrackAvailableServerSnapshot(): boolean {
  return true;
}

/** True when the track name has not been announced yet in this tab. */
export function shouldAnnounce(): boolean {
  try {
    return sessionStorage.getItem(MUSIC_ANNOUNCED_KEY) !== "true";
  } catch {
    // Announcing is the safe failure: a label that shows once too often is a
    // far smaller problem than one that never shows at all.
    return true;
  }
}

export function markAnnounced(): void {
  try {
    sessionStorage.setItem(MUSIC_ANNOUNCED_KEY, "true");
  } catch {
    /* The label reappears on the next load. Harmless. */
  }
}
