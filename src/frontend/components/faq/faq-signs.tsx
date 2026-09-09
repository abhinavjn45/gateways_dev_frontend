"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useReducedMotion } from "@/frontend/lib/animation/use-reduced-motion";
import { detectWebGL } from "@/frontend/lib/ambient/detect-webgl";
import { preloadSignFonts } from "@/frontend/lib/sign/sign-fonts";
import { FaqAccordion } from "./faq-accordion";
import type { SignGroup } from "./faq-sign-layer";

/**
 * three touches WebGL at import time, so the whole sign layer — the canvas, the
 * views, the geometry — stays out of the server bundle and off the critical
 * path. Same shape as `fest-chat.tsx` and `ambient-blocks.tsx`.
 *
 * `loading` renders NOTHING on purpose, and that is only safe because the gate
 * below refuses to render this component until `loadSignLayer()` has already
 * resolved. Rendering it any earlier is what put a hole in the page: the
 * accordion unmounted the instant the browser was judged capable, and the
 * chunk — three plus the whole scene graph — then took its own sweet time to
 * arrive, leaving bare page background where the FAQ used to be.
 */
const FaqSignLayer = dynamic(() => import("./faq-sign-layer"), {
  ssr: false,
  loading: () => null,
});

/**
 * The same import, awaited rather than rendered.
 *
 * Module imports are idempotent, so this and the `dynamic()` above resolve to
 * one chunk fetched once — this just gives the gate something to wait on.
 */
function loadSignLayer(): Promise<unknown> {
  return import("./faq-sign-layer");
}

/** Below this the board is too small to read a 364-character answer off. */
const MIN_WIDTH = 640;

/**
 * `detectWebGL` creates a real canvas and a real context every call, so it is
 * memoised here rather than run on each render. It is only ever asked once per
 * page load.
 */
let webglProbe: boolean | null = null;
function hasWebGL(): boolean {
  webglProbe ??= detectWebGL();
  return webglProbe;
}

/**
 * Viewport width and WebGL support, as one external store.
 *
 * `useSyncExternalStore` rather than an effect that calls `setState`: the
 * answer is a property of the browser, not of React, and reading it through an
 * effect means rendering the accordion, discovering the browser can do better,
 * and rendering again. The server snapshot is `false`, so the markup React
 * hydrates against is always the accordion.
 */
function subscribeToWidth(onChange: () => void): () => void {
  const query = window.matchMedia(`(min-width: ${MIN_WIDTH}px)`);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function readCapability(): boolean {
  return window.matchMedia(`(min-width: ${MIN_WIDTH}px)`).matches && hasWebGL();
}

/**
 * Chooses between the accordion and the hanging signs, and owns the open set
 * that both of them read.
 *
 * Sharing that state is what makes the switch invisible: resize a window across
 * the breakpoint, or flip the reduced-motion toggle, and whatever was open
 * stays open.
 *
 * EVERY CHECK IS A REASON, not a hedge:
 *  - reduced motion — the entire feature is a 1.15s fall and a three-second
 *    swing; there is nothing left of it to show someone who asked for stillness.
 *  - no WebGL — nothing would render at all.
 *  - narrow — a 5.85-unit board on a 390px screen bakes its answer at around
 *    14px, which is worse than the DOM it replaced.
 *  - fonts — see below.
 */
export function FaqSigns({ groups }: { groups: SignGroup[] }) {
  const reducedMotion = useReducedMotion();
  const capable = useSyncExternalStore(subscribeToWidth, readCapability, () => false);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());

  /**
   * Fetch the chunk and the webfonts TOGETHER, and swap only when both landed.
   *
   * Two separate reasons to wait, and missing either one is visible:
   *
   *  - The chunk, because the accordion is the only FAQ on the page until the
   *    signs can actually draw. Swapping first and loading second replaces a
   *    working page with an empty one for as long as the download takes.
   *  - The fonts, because a canvas cannot be repainted by `font-display: swap`.
   *    A beam baked before Press Start 2P arrives keeps Courier New forever.
   *
   * They run concurrently, so the wait is the slower of the two rather than the
   * sum, and the accordion — a perfectly good FAQ — is on screen throughout.
   *
   * Gated on `capable`, so a phone or a reduced-motion reader never downloads
   * three at all.
   */
  useEffect(() => {
    if (!capable || reducedMotion) return;
    let live = true;
    void Promise.all([preloadSignFonts(), loadSignLayer()])
      .then(() => {
        if (live) setReady(true);
      })
      // Neither can reject in practice; if one ever did, staying on the
      // accordion is the correct outcome, not a blank page.
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [capable, reducedMotion]);

  const onToggle = useCallback((question: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(question)) next.add(question);
      return next;
    });
  }, []);

  const enhanced = capable && ready && !reducedMotion;

  return enhanced ? (
    <FaqSignLayer groups={groups} open={open} onToggle={onToggle} />
  ) : (
    <FaqAccordion groups={groups} open={open} onToggle={onToggle} />
  );
}
