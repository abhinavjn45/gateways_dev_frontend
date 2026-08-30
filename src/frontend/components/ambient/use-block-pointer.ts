"use client";

import { useEffect, useRef } from "react";

/**
 * Window-level pointer plumbing for a canvas that cannot receive events.
 *
 * The ambient canvas is `pointer-events: none` and stays that way, because a
 * full-screen overlay that captures events over a site with a sticky nav,
 * Radix dialogs and a chat launcher WILL eventually eat a click that mattered.
 * So we do the hit testing ourselves and consume an event only when we are
 * certain it belongs to a block.
 *
 * Three decisions here are non-obvious and each fixes a real bug:
 *
 * 1. WE SWALLOW AT `click`, NOT AT `pointerdown`.
 *    `preventDefault()` on `pointerdown` suppresses the compatibility mouse
 *    events and the focus/selection defaults, but the browser STILL synthesises
 *    a `click` from the down/up pair. Cancelling the pointerdown and stopping
 *    there would break the block and then also activate the button underneath
 *    it. The listener is on `window` in the CAPTURE phase, which runs before
 *    React's root-container delegation and before Radix's document listeners.
 *
 * 2. WE NEVER BLANKET-BLOCK `pointerdown`.
 *    `stopImmediatePropagation` there would stop Radix Dialog's outside-click
 *    detection from ever seeing the event, so clicking the scrim would no
 *    longer close a modal, and it would kill text-selection drags anywhere a
 *    block happened to float. Move and down stay `{ passive: true }`; we do not
 *    interfere until a tap is confirmed.
 *
 * 3. THE REAL GATE IS `document.elementFromPoint`, NOT EVENT SWALLOWING.
 *    Because the canvas is inert to pointers, `elementFromPoint` returns the
 *    PAGE element under the cursor. A block only counts as clickable when what
 *    is underneath it is inert background. That resolves "the click hits both
 *    the block and the button" by construction -- it becomes impossible to hit
 *    both -- and it is also what keeps the decoration from ever fighting the
 *    site's copy or CTAs.
 */

/** Anything here means the pixel under the pointer belongs to the page, not to us. */
const INTERACTIVE = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "summary",
  "label",
  "[role='button']",
  "[role='dialog']",
  "[role='menu']",
  "[role='listbox']",
  "[contenteditable='true']",
  // The FestChat bot is its own canvas; blocks must not be clickable over it.
  "canvas",
  "[data-mc-no-blocks]",
].join(",");

/** Movement past this many pixels turns a tap into a drag. */
const DRAG_SLOP = 6;
/** A press longer than this is a long-press, not a tap. */
const TAP_MS = 600;
/** Safety valve: the swallow flag can never strand a later, legitimate click. */
const SWALLOW_TTL = 400;

export interface BlockPointerHandlers {
  /** Resolve the block id under these client coordinates, or null. */
  hitTest: (clientX: number, clientY: number) => number | null;
  onHover: (blockId: number | null) => void;
  onPress: (blockId: number) => void;
  onCancel: (blockId: number) => void;
  /** Whether the layer is currently interactive at all. */
  enabled: boolean;
}

/** Is a Radix dialog open? If so the page is modal and blocks are inert. */
function modalOpen(): boolean {
  return Boolean(document.querySelector('[role="dialog"][data-state="open"]'));
}

export function useBlockPointer(handlers: BlockPointerHandlers): void {
  // The handlers change identity every render; a ref keeps the listeners stable
  // so we attach them exactly once instead of on every parent re-render. The
  // sync happens in an effect rather than during render because a render pass
  // must stay free of side effects for the React compiler to reason about it.
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  }, [handlers]);

  useEffect(() => {
    let rafId = 0;
    let pendingX = 0;
    let pendingY = 0;
    let hovered: number | null = null;

    let pressed: { id: number; x: number; y: number; t: number } | null = null;
    let swallowClick = false;
    let swallowTimer: ReturnType<typeof setTimeout> | undefined;

    /** A block is clickable here only if the page beneath is inert. */
    const pageIsInert = (x: number, y: number): boolean => {
      if (modalOpen()) return false;
      const under = document.elementFromPoint(x, y);
      if (!under) return true;
      return !under.closest(INTERACTIVE);
    };

    /**
     * Order matters here, and it is the opposite of the obvious one.
     *
     * `pageIsInert` calls `document.elementFromPoint`, which forces a synchronous
     * style and layout flush of the whole document, plus a `querySelector` for an
     * open dialog. Running that first meant paying a forced reflow on EVERY
     * pointer frame — including while scrolling, which is when it hurts most.
     *
     * The raycast is pure maths against a handful of meshes and touches no DOM.
     * Doing it first means the expensive check only runs when the cursor is
     * genuinely over a block, which is rare: blocks are small and live in the
     * page margins. Same answer, a tiny fraction of the cost.
     */
    const resolve = (x: number, y: number): number | null => {
      if (!ref.current.enabled) return null;
      const hit = ref.current.hitTest(x, y);
      if (hit === null) return null;
      return pageIsInert(x, y) ? hit : null;
    };

    const flushMove = () => {
      rafId = 0;
      const hit = resolve(pendingX, pendingY);
      if (hit !== hovered) {
        hovered = hit;
        ref.current.onHover(hit);
      }
      // A drag past the slop cancels an in-flight break and, crucially, clears
      // the swallow flag -- the user was selecting text, not mining.
      if (pressed) {
        const dx = pendingX - pressed.x;
        const dy = pendingY - pressed.y;
        if (dx * dx + dy * dy > DRAG_SLOP * DRAG_SLOP) {
          ref.current.onCancel(pressed.id);
          pressed = null;
          swallowClick = false;
        }
      }
    };

    const onMove = (e: PointerEvent) => {
      pendingX = e.clientX;
      pendingY = e.clientY;
      // rAF coalescing: a high-rate pointer can fire many times per frame, and
      // raycasting on each one is pure waste. Same shape as the hero parallax
      // listener in `scene/animated-background.tsx`.
      if (!rafId) rafId = requestAnimationFrame(flushMove);
    };

    const onDown = (e: PointerEvent) => {
      // Primary button / primary touch only. Right-click keeps the context menu.
      if (e.button !== 0) return;
      const hit = resolve(e.clientX, e.clientY);
      if (hit === null) return;

      pressed = { id: hit, x: e.clientX, y: e.clientY, t: e.timeStamp };
      // Feedback starts on press, so the block responds to the finger going
      // down rather than to it coming up.
      ref.current.onPress(hit);

      swallowClick = true;
      clearTimeout(swallowTimer);
      swallowTimer = setTimeout(() => {
        swallowClick = false;
      }, SWALLOW_TTL);
    };

    const onUp = (e: PointerEvent) => {
      if (!pressed) return;
      const held = e.timeStamp - pressed.t;
      if (held > TAP_MS) {
        // A long press is a context gesture on touch, not a mine.
        ref.current.onCancel(pressed.id);
        swallowClick = false;
      }
      pressed = null;
    };

    const onClickCapture = (e: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      clearTimeout(swallowTimer);
      e.stopImmediatePropagation();
      e.preventDefault();
    };

    const onLeave = () => {
      if (hovered !== null) {
        hovered = null;
        ref.current.onHover(null);
      }
    };

    // `passive: true` on move and down is what preserves scrolling and text
    // selection. Only the click listener is allowed to cancel anything.
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    window.addEventListener("click", onClickCapture, { capture: true });
    document.addEventListener("pointerleave", onLeave, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(swallowTimer);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("click", onClickCapture, { capture: true });
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);
}
