"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { View } from "@react-three/drei";
import type { FaqEntry } from "@/frontend/lib/chatbot-faq";
import { rowHeight } from "@/frontend/lib/sign/sign-motion";
import { HangingSign } from "./hanging-sign";
import { useSignStore } from "./sign-store";

/**
 * One FAQ row: a real disclosure with a hanging sign drawn over it.
 *
 * THE DOM IS THE SOURCE OF TRUTH, and the 3D is decoration on top of it. The
 * button below is a real `<button aria-expanded>` — keyboard, focus order and
 * screen-reader announcement all work because they are not being reimplemented.
 * Nothing in the scene is hit-tested; drei's `<View>` rebinds R3F's event
 * target globally, which twenty views would race over, so pointer events stay
 * switched off across the whole canvas.
 *
 * ALIGNMENT IS INVERTED — the button does not chase the beam, the beam is
 * placed from the button. `rigOffsetY()` keeps the beam a fixed distance below
 * the row's top edge no matter how far the row has grown, so the overlay is
 * plain CSS off three custom properties and there is nothing to drift.
 */
export function FaqSignRow({
  entry,
  index,
  open,
  onToggle,
}: {
  entry: FaqEntry;
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  const store = useSignStore();
  const row = useRef<HTMLLIElement>(null);
  const id = entry.question;

  /**
   * Mount the `<View>` only near the viewport.
   *
   * A mounted View reads `getBoundingClientRect()` on every rendered frame,
   * whether or not it is on screen — drei measures first and decides it is
   * offscreen second. Twenty of those is twenty layout reads a frame to draw
   * the four signs anyone can actually see. An unmounted row is still a
   * correctly-sized box, so nothing shifts when one swaps in.
   *
   * STARTS TRUE, and the observer PRUNES rather than admits. Starting false
   * makes the first paint depend on an IntersectionObserver delivering its
   * initial record, which is not something to bet the whole feature on — miss
   * it and the page renders twenty empty boxes with no sign that anything is
   * wrong. Mounting first costs one or two frames of measuring rows that are
   * about to be dropped, and cannot fail silently.
   */
  const [near, setNear] = useState(true);

  useEffect(() => {
    const node = row.current;
    if (!node) return;

    store.attach(id, { row: node });
    // Adopt whatever the shared open set already says, without animating it.
    store.restore(id, open);

    const io = new IntersectionObserver(
      ([hit]) => {
        setNear(hit.isIntersecting);
        store.wake();
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(node);

    return () => {
      io.disconnect();
      store.detach(id);
    };
    // `open` is read once, on mount, purely to adopt the starting state — it
    // must NOT re-run this effect, or every toggle would tear down the observer
    // and snap the board to its destination instead of animating there.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, id]);

  /**
   * Seed the height before the first paint.
   *
   * The canvas renders on demand, so nothing guarantees the driver has run by
   * the time this row is painted, and a row with no height would collapse the
   * list and then jolt it open. `useLayoutEffect` lands the value before the
   * browser paints, so there is no frame where the wrong height is visible.
   *
   * Note the height is NOT a JSX `style` prop. React re-asserts inline styles
   * whenever their value changes, and this row re-renders on exactly the event
   * that starts an animation — the toggle — so a declared height would snap a
   * retracting sign shut before the driver could animate it. The property has
   * one owner, and it is the driver.
   */
  useLayoutEffect(() => {
    const node = row.current;
    if (!node) return;
    const width = store.widthOf(id) || node.clientWidth;
    node.style.height = `${rowHeight(width, store.progressOf(id))}px`;
    store.wake();
  }, [store, id]);

  return (
    <li ref={row} className="relative list-none overflow-hidden">
      {near ? (
        <View
          className="pointer-events-none absolute inset-0"
          // Decorative: every word on the sign is also in the DOM below.
          aria-hidden="true"
        >
          <HangingSign id={id} question={entry.question} answer={entry.answer} open={open} />
        </View>
      ) : null}

      <h3 className="m-0">
        <button
          type="button"
          id={`faq-q-${index}`}
          aria-expanded={open}
          aria-controls={`faq-a-${index}`}
          onClick={() => {
            store.setOpen(id, !open);
            onToggle();
          }}
          onPointerEnter={() => store.nudge(id)}
          onFocus={() => store.nudge(id)}
          className={
            // Sized to the beam from the container's custom properties, so the
            // hit area is exactly the thing it looks like it is.
            "absolute left-1/2 top-[var(--sign-beam-top)] h-[var(--sign-beam-h)] " +
            "w-[var(--sign-beam-w)] -translate-x-1/2 cursor-pointer appearance-none " +
            "border-0 bg-transparent p-0 " +
            "focus-visible:outline focus-visible:outline-[length:var(--mc-bevel)] " +
            "focus-visible:outline-offset-2 focus-visible:outline-mc-accent"
          }
        >
          {/* The visible question is painted into the beam texture; this is the
              same string as real text, for assistive tech and find-in-page. */}
          <span className="sr-only">{entry.question}</span>
        </button>
      </h3>

      <div id={`faq-a-${index}`} role="region" aria-labelledby={`faq-q-${index}`} hidden={!open}>
        <p className="sr-only">{entry.answer}</p>
      </div>
    </li>
  );
}
