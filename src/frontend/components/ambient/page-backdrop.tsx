"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { isAmbientRoute } from "@/frontend/lib/ambient/ambient-routes";
import { measurePageBand, sameBand, type PageBand } from "@/frontend/lib/ambient/page-band";
import { useReducedMotion } from "@/frontend/lib/animation/use-reduced-motion";
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
 * HOW THE LAYERS MOVE, and why not the obvious way. Each layer registers itself
 * with a parallax speed; one rAF-throttled scroll listener writes
 * `el.style.transform` on each of them directly.
 *
 * The obvious version — write one `--backdrop-y` custom property on this host
 * and let every layer read it through `calc(var(--backdrop-y) * <speed>)` — is
 * what this used to do, and it is a performance trap dressed as elegance. A
 * custom-property write CANNOT be composited: it invalidates style for every
 * descendant that references the variable, so each scroll frame paid a style
 * recalculation across the whole ~45-element subtree and a repaint, which is
 * precisely the work `translate3d` exists to avoid. Writing the transform
 * straight onto each element skips style resolution entirely and lands on the
 * compositor. Same one listener, same arithmetic, no variable.
 *
 * The handler only READS `scrollY` and WRITES transforms — it never touches
 * layout, so it cannot force a reflow.
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
  /**
   * Every moving layer, with the speed it travels at. Populated by ref
   * callbacks, so the set is always exactly what is mounted — including the
   * theme subtree that is currently `display: none`, which costs one wasted
   * transform write per frame and saves re-wiring on every theme toggle.
   */
  const layers = useRef(new Map<HTMLElement, number>());
  const [band, setBand] = useState<PageBand | null>(null);
  const [narrow, setNarrow] = useState(false);

  /** `register(speed)` returns a ref callback. React 19 cleans up on unmount. */
  const register = useCallback(
    (speed: number) => (el: HTMLDivElement | null) => {
      if (!el) return;
      layers.current.set(el, speed);
      return () => {
        layers.current.delete(el);
      };
    },
    [],
  );

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const evaluate = () => {
      if (cancelled) return;
      setNarrow(window.innerWidth < NARROW);
      // Keep the previous object when nothing moved — see `sameBand`. Without
      // this every ResizeObserver fire re-renders the whole backdrop.
      const next = measurePageBand();
      setBand((prev) => (sameBand(prev, next) ? prev : next));
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
      // Negative once you are into the band: as the page scrolls down the wall
      // travels up past the viewport. At scrollY === band.top the wall's own
      // top sits at y=0.
      const y = band.top - window.scrollY;
      for (const [el, speed] of layers.current) {
        el.style.transform = `translate3d(0, ${(y * speed).toFixed(1)}px, 0)`;
      }
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
        DARK THEME ONLY. There was a light-theme counterpart here — an
        above-ground sky-and-hills scene — and it has been removed at the
        designer's request; light mode now shows the plain `html` gradient while
        a different direction is decided. `globals.css` hides this whole host
        under `[data-theme="light"]`, so light mode pays nothing for it: no
        paint, no compositing, no second scene to keep in sync.
      */}
      <div className="absolute inset-0 overflow-hidden">
        <StrataWall
          height={height}
          parallax={parallax}
          oreCount={oreCount}
          register={register}
        />
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
