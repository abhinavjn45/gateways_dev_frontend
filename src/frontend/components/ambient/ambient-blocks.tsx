"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { detectWebGL } from "@/frontend/lib/ambient/detect-webgl";
import { isAmbientRoute } from "@/frontend/lib/ambient/ambient-routes";
import { measurePageBand, sameBand, type PageBand } from "@/frontend/lib/ambient/page-band";
import { useReducedMotion } from "@/frontend/lib/animation/use-reduced-motion";

/**
 * Mount gate for the ambient Minecraft block layer.
 *
 * Nothing below this component knows it is optional -- every "should this run
 * at all" decision is made here, and the scene chunk is not even fetched
 * unless all of them pass:
 *
 *  1. ROUTE. An allowlist (`lib/ambient/ambient-routes.ts`), so a future admin
 *     page cannot opt itself in by accident.
 *  2. REDUCED MOTION. Both the OS media query and the in-app toggle, live --
 *     flipping the toggle unmounts the layer immediately rather than at the
 *     next navigation.
 *  3. WEBGL. Probed once with a context that is released straight away.
 *  4. VIEWPORT AND POINTER. Desktop with a fine pointer only. Phones have no
 *     margins to keep blocks clear of the copy, no hover affordance, a second
 *     WebGL context competing with CraftBot on a weaker GPU, and long-press
 *     gestures that would fight the break interaction.
 *  5. A MEASURABLE BAND. The blocks occupy the document between the hero and
 *     the footer (`page-band.ts`). If that strip cannot be measured yet, or is
 *     too short to be worth filling, the layer simply does not mount.
 *
 * When any check fails this renders `null`: no canvas, no context, no
 * placeholder. A decorative layer has no fallback worth showing.
 *
 * WHERE IT SITS IN THE DOM MATTERS. `layout.tsx` renders this as the FIRST
 * child of `<body>`, before `{children}`, and `#ambient-blocks` carries
 * `z-index: 0`. Both halves are load-bearing -- see the comment on the rule in
 * globals.css.
 */

const AmbientBlockScene = dynamic(() => import("./ambient-block-scene"), {
  ssr: false,
  loading: () => null,
});

/** Below this width the layer is off entirely. */
const MIN_WIDTH = 900;

/** How many blocks hang in the viewport at once. */
function countForViewport(): number {
  return window.innerWidth >= 1400 ? 9 : 6;
}
/** Page reflow settles before we re-measure. */
const MEASURE_DEBOUNCE = 200;

type Support = "checking" | "ready" | "unsupported";

export function AmbientBlocks() {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const [support, setSupport] = useState<Support>("checking");
  const [band, setBand] = useState<PageBand | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Probing WebGL and reading the viewport touch browser APIs that do not
    // exist during SSR, so this cannot move into a lazy state initialiser
    // without a hydration mismatch.
    //
    // The WebGL probe runs EXACTLY ONCE and is cached. Re-probing per resize
    // event would create and discard a context on every frame of a window
    // drag -- precisely the context leak `detectWebGL`'s `loseContext()` exists
    // to prevent. Hardware capability does not change when a window resizes.
    let hasWebGL: boolean | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const evaluate = () => {
      if (cancelled) return;
      hasWebGL ??= detectWebGL();
      const wide = window.innerWidth >= MIN_WIDTH;
      const fine = window.matchMedia("(pointer: fine)").matches;
      setSupport(wide && fine && hasWebGL ? "ready" : "unsupported");

      const next = measurePageBand();
      setBand((prev) => (sameBand(prev, next) ? prev : next));
      // The count is fixed from the FIRST usable measurement and then left
      // alone. It keys the scene, so letting it track every reflow would tear
      // down and rebuild the WebGL context as images load.
      // Count is a function of the VIEWPORT, not of page length. It used to be
      // `blockCountFor(band, ...)`, which was right while blocks were anchored
      // to the document and spread over the whole scroll; now that they hang in
      // viewport space, every block is on screen at once, so a long page would
      // have produced a wall of them.
      if (next) setCount((prev) => (prev > 0 ? prev : countForViewport()));
    };

    evaluate();
    // The first measurement runs before fonts and images settle, so the footer
    // is rarely where it will end up. One deferred pass catches the real layout
    // without paying for a permanent observer.
    const settle = setTimeout(evaluate, 600);

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(evaluate, MEASURE_DEBOUNCE);
    };
    window.addEventListener("resize", schedule, { passive: true });
    // Sections reveal on scroll and modals change the document height, both of
    // which move the footer. Observing the root element catches every case.
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

  if (!isAmbientRoute(pathname)) return null;
  if (reducedMotion) return null;
  if (support !== "ready") return null;
  if (!band || count === 0) return null;

  return (
    <div id="ambient-blocks" aria-hidden="true">
      <AmbientBlockScene key={count} count={count} band={band} />
    </div>
  );
}
