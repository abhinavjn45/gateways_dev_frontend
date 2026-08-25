/**
 * Where the ambient block layer is allowed to appear.
 *
 * An ALLOWLIST, not a deny-list. A deny-list means every route added in future
 * opts itself in silently -- a new admin console would get decorative blocks
 * drifting over a payments table because nobody remembered to exclude it. The
 * cost of the allowlist is one line when a public page is added, which is the
 * right place for that decision to be made consciously.
 *
 * This deliberately does NOT share `fest-chat.tsx`'s list. That one is a
 * deny-list covering dashboards and auth; ours additionally excludes:
 *   - `/world`  -- `village-scene` already owns a heavy WebGL context there,
 *                  and CraftBot owns a second. A third is where it hurts.
 *   - the (portal) group -- `/portal`, `/entering`, `/travelling` are a scripted
 *                  cinematic, and stray floating debris reads as a bug in it.
 */

/** Exact paths, plus prefixes for routes with dynamic segments. */
const EXACT = new Set([
  "/",
  "/about",
  "/contact",
  "/events",
  "/gallery",
  "/leaderboard",
  "/schedule",
  "/sponsors",
]);

const PREFIXES = ["/events/"];

export function isAmbientRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  // Trailing slashes arrive from `skipTrailingSlashRedirect` in next.config.ts.
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (EXACT.has(path)) return true;
  return PREFIXES.some((p) => path.startsWith(p));
}
