"use client";

import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useSignStore } from "./sign-store";

/** A returning background tab hands back a delta in seconds. Clamp it, or a
 *  half-finished drop teleports through the rest of its animation in one step. */
const MAX_STEP = 1 / 20;

/**
 * The one frame loop for every sign on the page.
 *
 * ONE loop, not twenty, and the reason is frame ordering rather than tidiness.
 * R3F sorts `useFrame` subscribers by priority and runs them in that order
 * inside a single rAF. drei's `<View>` container subscribes at priority 1 (its
 * `index`), and the first thing it does is read `getBoundingClientRect()`.
 * Subscribing here at PRIORITY 0 puts every DOM write strictly before every DOM
 * read, so the browser performs exactly ONE forced layout per frame no matter
 * how many signs are moving.
 *
 * Invert that — put a height write inside a per-sign `useFrame`, or read layout
 * from in here — and you get up to twenty layout flushes a frame. It would
 * still look correct, and it would be the reason the page janked.
 *
 * The component renders nothing. It exists to be a subscriber.
 */
export function SignDriver({ onIdle }: { onIdle: (idle: boolean) => void }) {
  const store = useSignStore();
  const invalidate = useThree((s) => s.invalidate);

  // How a click asks for a frame. The canvas runs on demand, so a toggle that
  // only changed a phase would show nothing until something unrelated happened
  // to request a render.
  useEffect(() => {
    store.setWake(invalidate);
    return () => store.setWake(() => {});
  }, [store, invalidate]);

  /**
   * The canvas is `position: fixed` while the rows scroll underneath it. On
   * `frameloop="demand"` nothing repaints during a scroll, so the last
   * presented frame stays welded to the viewport and every sign visibly
   * detaches from its row.
   *
   * This is the single easiest thing in the feature to forget, because in
   * development the loop is usually already running for some other reason.
   */
  useEffect(() => {
    let queued = false;
    const onMove = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        invalidate();
      });
    };
    window.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove);
      window.removeEventListener("resize", onMove);
    };
  }, [invalidate]);

  useFrame((state, delta) => {
    /**
     * CLEAR THE CANVAS OURSELVES, before any view draws into it.
     *
     * R3F turns its own auto-render off as soon as a subscriber registers a
     * priority above zero, and drei's `<View>` registers at 1. So nothing
     * clears the drawing buffer: drei relies on the browser doing it at
     * composite time, which holds only while every rendered frame is actually
     * presented. It is not true when several frames render between composites,
     * and the result is signs from earlier frames left painted underneath the
     * current ones at whatever size they were then.
     *
     * Being the priority-0 subscriber makes this the one place that runs before
     * every view, and a full-canvas clear costs nothing.
     */
    state.gl.setScissorTest(false);
    state.gl.clear(true, true, false);

    onIdle(!store.step(Math.min(delta, MAX_STEP)));
  }, 0);

  return null;
}
