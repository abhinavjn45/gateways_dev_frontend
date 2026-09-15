/**
 * "Has the splash already played this session?"
 *
 * The crest-assembly splash is a first-impression flourish, not a loading gate,
 * so it must play at most once per tab. sessionStorage rather than module state
 * for the same reason as `transition-store.ts`: a full page load (refresh, or
 * typing a URL for another route) throws away all module state, and the splash
 * would replay on every reload.
 *
 * The KEY here is also read by the `beforeInteractive` boot script in the root
 * layout, which hides the overlay before first paint so a repeat load never
 * flashes it. Keep the two in sync — the boot script inlines this string
 * because it runs before any module has loaded.
 */

export const SPLASH_SEEN_KEY = "parallax:splash-seen";

/** True when the splash should play, i.e. it has not run in this tab yet. */
export function shouldPlaySplash(): boolean {
  try {
    return sessionStorage.getItem(SPLASH_SEEN_KEY) !== "true";
  } catch {
    // Private mode with storage disabled. Playing it is the safe failure:
    // an extra 3s flourish is better than a permanently blank overlay.
    return true;
  }
}

/** Fired on `window` the moment the splash stops covering the page. */
const SPLASH_DONE_EVENT = "parallax:splashdone";

/**
 * Set in THIS page load. sessionStorage alone cannot answer "has it finished"
 * where storage is disabled, because `shouldPlaySplash()` then says "play" for
 * the life of the tab — this flag is what closes that gap.
 */
let doneThisLoad = false;

export function markSplashSeen(): void {
  doneThisLoad = true;
  try {
    sessionStorage.setItem(SPLASH_SEEN_KEY, "true");
  } catch {
    // Nothing to do — the splash simply replays on the next load.
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SPLASH_DONE_EVENT));
}

/**
 * Run `callback` once the splash is out of the way — immediately if it already
 * is, or will never play. Returns an unsubscribe.
 *
 * The immediate path is not an optimisation, it is the correctness case. The
 * splash drives itself from `useGSAP`, a LAYOUT effect, and layout effects run
 * before every ordinary effect in the tree. On a repeat visit or with reduced
 * motion the splash finishes in that first pass — before a subscriber's
 * `useEffect` has even run — so a listener alone would wait for an event that
 * has already been and gone.
 */
export function onSplashDone(callback: () => void): () => void {
  if (doneThisLoad || !shouldPlaySplash()) {
    callback();
    return () => {};
  }
  const handler = () => callback();
  window.addEventListener(SPLASH_DONE_EVENT, handler, { once: true });
  return () => window.removeEventListener(SPLASH_DONE_EVENT, handler);
}
