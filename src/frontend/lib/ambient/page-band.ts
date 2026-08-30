/**
 * The strip of the DOCUMENT the ambient blocks are allowed to occupy.
 *
 * Blocks used to live in viewport space: a fixed overlay, blocks drifting up
 * the screen and wrapping at its edges. That put them over the header and over
 * the footer, and it meant they were pinned to the glass rather than belonging
 * to the page. They now live in DOCUMENT space instead -- each block owns a
 * `docY` measured from the top of the document, and the frame loop subtracts
 * `scrollY` to place it on screen. The canvas stays viewport-sized, so the
 * rendering cost does not grow with page length; only the coordinate space
 * changed.
 *
 * The band runs from the BOTTOM OF THE HERO down to the TOP OF THE FOOTER.
 * Blocks rise out of the footer, travel up behind the page content, and are
 * retired when they reach the hero. Nothing measured here needs a component to
 * cooperate: `main`, `footer` and `header` are already in the markup on every
 * route the layer runs on (both `home-screen.tsx` and `layout/site-shell.tsx`
 * render that shape), so there are no marker props to keep in sync.
 */

export interface PageBand {
  /** Document Y of the top of the band -- the hero's lower edge. */
  top: number;
  /** Document Y of the bottom of the band -- the footer's upper edge. */
  bottom: number;
  /** Sticky header height, so blocks can be hidden underneath it. */
  header: number;
}

/** Below this the band is not worth populating (a very short page). */
const MIN_BAND = 320;

/**
 * Telling a hero apart from a page that merely starts with a tall block.
 *
 * Height alone does NOT do it, and two rounds of trying proved it. `main`'s
 * first child is the hero on the home page, but on the routes built from
 * `layout/site-shell.tsx` it is a wrapper around the whole screen -- and those
 * wrappers measure anywhere from 0.3 to 4.4 viewports depending on how much
 * content the page has. Any threshold that catches the real hero also catches
 * some of those wrappers, which put the top of the band level with the footer
 * and silently stopped the layer mounting on half the site.
 *
 * So the test is not "is it tall?" but "is there still a page behind it?".
 * A hero has the rest of the document below it; a page wrapper has only the
 * footer. If treating the first child as a hero would leave less than half a
 * viewport of band, it was never a hero and we measure from the top of `main`
 * instead. That is self-correcting and needs no component to declare itself.
 */
const HERO_MIN_VIEWPORTS = 0.7;
const BAND_BEHIND_HERO_VIEWPORTS = 0.5;

export function measurePageBand(): PageBand | null {
  if (typeof document === "undefined") return null;

  const main = document.querySelector("main");
  const footer = document.querySelector("footer");
  if (!main || !footer) return null;

  const scrollY = window.scrollY;
  const header = document.querySelector("header");
  const headerHeight = header?.getBoundingClientRect().height ?? 0;

  // The home page opens on a full-bleed hero; the other public pages start
  // straight into content. Measuring the first child's height tells the two
  // apart without either screen having to declare which it is.
  const bottom = footer.getBoundingClientRect().top + scrollY;

  const hero = main.firstElementChild;
  const mainTop = main.getBoundingClientRect().top + scrollY;
  let top = mainTop;
  if (hero) {
    const rect = hero.getBoundingClientRect();
    const viewports = rect.height / Math.max(1, window.innerHeight);
    const below = bottom - (rect.bottom + scrollY);
    if (
      viewports >= HERO_MIN_VIEWPORTS &&
      below >= window.innerHeight * BAND_BEHIND_HERO_VIEWPORTS
    ) {
      top = rect.bottom + scrollY;
    }
  }
  if (bottom - top < MIN_BAND) return null;

  return { top, bottom, header: headerHeight };
}

/**
 * How many blocks to spread over the band.
 *
 * Scaled by band length rather than fixed, because a fixed count that looks
 * right on the home page leaves a long page nearly empty and a short one
 * crowded. The divisor targets roughly three blocks visible at any scroll
 * position, which is the density the "ambient, never competing with the copy"
 * brief asks for.
 */
export function blockCountFor(band: PageBand, viewportWidth: number, viewportHeight: number): number {
  const perViewport = viewportWidth >= 1200 ? 3.4 : 2.2;
  const spans = (band.bottom - band.top) / Math.max(1, viewportHeight);
  return Math.max(4, Math.min(18, Math.round(spans * perViewport)));
}

/**
 * Is this the same band, geometrically?
 *
 * `measurePageBand()` builds a fresh object on every call, so `setBand(measure())`
 * ALWAYS fails React's `Object.is` check and always re-renders — even when the
 * page has not moved a pixel. Both ambient features observe
 * `document.documentElement`, which fires whenever the document height changes:
 * images decoding, fonts swapping, the countdown's text width ticking every
 * second, a section revealing as you scroll. So the two heaviest subtrees on the
 * page were re-rendering for no reason, repeatedly, during scrolling.
 *
 * Callers pair this with a functional update — `setBand(prev => sameBand(prev,
 * next) ? prev : next)` — so an unchanged measurement keeps the old object
 * identity and React stops there.
 *
 * The tolerance is deliberate. Sub-pixel and few-pixel drift is constant on a
 * live page and moving the wall by 2px is not worth a re-render of ~45 elements.
 */
const BAND_EPSILON = 4;

export function sameBand(a: PageBand | null, b: PageBand | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    Math.abs(a.top - b.top) < BAND_EPSILON &&
    Math.abs(a.bottom - b.bottom) < BAND_EPSILON &&
    Math.abs(a.header - b.header) < BAND_EPSILON
  );
}
