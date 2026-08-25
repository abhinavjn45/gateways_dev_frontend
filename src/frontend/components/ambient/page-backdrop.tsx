"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isAmbientRoute } from "@/frontend/lib/ambient/ambient-routes";
import { measurePageBand, type PageBand } from "@/frontend/lib/ambient/page-band";
import { useReducedMotion } from "@/frontend/lib/animation/use-reduced-motion";
import { SkyBackdrop } from "./sky-backdrop";
import { StrataWall } from "./strata-wall";

/**
 * The page's mid-section backdrop — the rock you descend past between the hero
 * and the footer.
 *
 * WHY THIS EXISTS. `body` used to carry `bg-mc-void`, an opaque fill spanning
 * the whole document, which covered the two-theme gradient `globals.css` had
 * already authored on `html` and left ~3,000px of page as one flat colour. That
 * class is gone (see `layout.tsx`); this component is what now occupies the
 * space it was wasting.
 *
 * ONE PROPERTY DRIVES EVERYTHING. A single rAF-throttled scroll listener writes
 * `--backdrop-y` on this container; every layer positions itself with
 * `calc(var(--backdrop-y) * <speed>)`. React is never in the scroll path, the
 * multiplication is the compositor's problem, and adding a layer costs one line
 * rather than another subscription. The handler only ever READS `scrollY` and
 * WRITES a custom property — it never touches layout, so it cannot thrash.
 *
 * STACKING. Rendered as the first child of `<body>`, before `<AmbientBlocks />`,
 * at `z-index: 0` (`globals.css`). Both are z-index 0, so DOM order decides:
 * backdrop, then the floating blocks, then all page content. Deliberately NOT
 * `z-index: -1` — that was impossible while body had a fill, and depending on
 * negative-z semantics would break again the moment anyone reinstates one.
 */

/** Page reflow settles before we re-measure. Matches `ambient-blocks.tsx`. */
const MEASURE_DEBOUNCE = 200;
/** Ore sprites at full width; halved on narrow viewports. */
const ORE_COUNT = 22;
const ORE_COUNT_NARROW = 11;
const NARROW = 1024;

export function PageBackdrop() {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const hostRef = useRef<HTMLDivElement>(null);
  const [band, setBand] = useState<PageBand | null>(null);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const evaluate = () => {
      if (cancelled) return;
      setNarrow(window.innerWidth < NARROW);
      setBand(measurePageBand());
    };

    evaluate();
    // The first measurement lands before fonts and images settle, so the footer
    // is rarely where it will end up. One deferred pass catches the real layout.
    const settle = setTimeout(evaluate, 600);

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(evaluate, MEASURE_DEBOUNCE);
    };
    window.addEventListener("resize", schedule, { passive: true });
    // Sections reveal on scroll and modals change the document height, both of
    // which move the footer and therefore the foot of the wall.
    const observer = new ResizeObserver(schedule);
    observer.observe(document.documentElement);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(settle);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [pathname]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !band) return;

    let raf = 0;
    const write = () => {
      raf = 0;
      // Negative: as the page scrolls down, the wall travels up past the
      // viewport. At scrollY === band.top the wall's own top sits at y=0.
      host.style.setProperty("--backdrop-y", `${band.top - window.scrollY}px`);
    };

    // Write once immediately rather than waiting for the first scroll event.
    // Browsers restore scroll position on reload, so without this the wall
    // would render at the top of the band for one frame and then snap.
    write();

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(write);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [band]);

  if (!isAmbientRoute(pathname)) return null;
  if (!band) return null;

  const height = band.bottom - band.top;
  const parallax = !reducedMotion;
  const oreCount = narrow ? ORE_COUNT_NARROW : ORE_COUNT;

  return (
    <div id="page-backdrop" ref={hostRef} aria-hidden="true">
      {/*
        The theme swap is CSS, not JS, and that is load-bearing. `data-theme` is
        stamped on <html> before first paint by THEME_BOOT in layout.tsx, so
        `.theme-only-*` (globals.css) resolves on the very first frame. Reading
        the theme in an effect — the way `BiomeScene`'s `lightScene` prop does —
        flashes one dark frame, which is tolerable below the fold and very much
        not for a full-page backdrop.
      */}
      <div className="theme-only-dark absolute inset-0 overflow-hidden">
        <StrataWall height={height} parallax={parallax} oreCount={oreCount} />
      </div>
      <div className="theme-only-light absolute inset-0 overflow-hidden">
        <SkyBackdrop height={height} parallax={parallax} />
      </div>

      {/*
        Content scrim. Never transformed, so contrast is identical at every
        scroll position. The horizontal pass protects the centre column where
        the copy lives; the vertical pass dissolves the wall into the hero above
        and the footer below instead of butting against them.

        `color-mix(... var(--color-mc-void) N%, transparent)` is the idiom
        `.splash-veil` uses: the token flips with the theme, so one rule is
        correct in both.
      */}
      <div className="backdrop-scrim absolute inset-0" />
    </div>
  );
}
