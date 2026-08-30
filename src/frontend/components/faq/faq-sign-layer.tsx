"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { View } from "@react-three/drei";
import type { FaqCategory, FaqEntry } from "@/frontend/lib/chatbot-faq";
import { BEAM_H, BEAM_W, SCALE, STRAP_OVERHANG, TOP_PAD, fitFor } from "@/frontend/lib/sign/sign-motion";
import { FaqSignRow } from "./faq-sign-row";
import { SignDriver } from "./sign-driver";
import { SignStoreContext, createSignStore } from "./sign-store";

export interface SignGroup {
  category: FaqCategory;
  entries: FaqEntry[];
}

/**
 * The enhanced FAQ: every question a hanging sign, all sharing ONE WebGL
 * context.
 *
 * That last part is the constraint the whole design is built around. Every
 * other 3D scene in this app owns its own `<Canvas>`, and `CraftBotScene`
 * already holds a context on this route. Browsers cap out around sixteen, so
 * twenty more canvases would not merely be slow — they would evict the chat
 * bot. drei's `<View>` renders each sign into a scissored rectangle of one
 * shared canvas instead, and skips any whose rectangle is off screen.
 *
 * Loaded through `next/dynamic({ ssr: false })` by `faq-signs.tsx`: three
 * touches WebGL at import time, and pulling it into the server bundle for a
 * page that has a perfectly good HTML accordion would be a poor trade.
 */
export default function FaqSignLayer({
  groups,
  open,
  onToggle,
}: {
  groups: SignGroup[];
  open: ReadonlySet<string>;
  onToggle: (question: string) => void;
}) {
  const [store] = useState(createSignStore);
  const container = useRef<HTMLDivElement>(null);
  const [frameloop, setFrameloop] = useState<"always" | "demand">("demand");
  const idle = useRef(true);

  /**
   * `frameloop` is React state, but it only ever changes on a TRANSITION —
   * guarded by a ref, because `onIdle` is called from inside the frame loop and
   * an unguarded `setState` there would schedule a render sixty times a second
   * to store a value that had not changed.
   */
  const onIdle = useCallback((now: boolean) => {
    if (now === idle.current) return;
    idle.current = now;
    setFrameloop(now ? "demand" : "always");
  }, []);

  /**
   * ONE observer for the whole list, not one per row.
   *
   * A row cannot measure itself: the driver writes its height every frame
   * during a drop, so a `ResizeObserver` on a row would fire every frame and
   * feed its own writes back to itself. The container's width is the only thing
   * any of this actually depends on, and it changes only when the window does.
   */
  useEffect(() => {
    const node = container.current;
    if (!node) return;

    const apply = (width: number) => {
      if (!width) return;
      store.setWidth(width);

      // The beam's box, handed to the row buttons as plain CSS. `rigOffsetY`
      // holds the beam a constant distance below the row's top edge however
      // far the row has grown, which is what lets this be static.
      const fit = fitFor(width) * SCALE;
      const strapH = BEAM_H + STRAP_OVERHANG;
      node.style.setProperty("--sign-beam-top", `${(TOP_PAD - strapH / 2) * fit}px`);
      node.style.setProperty("--sign-beam-h", `${strapH * fit}px`);
      node.style.setProperty("--sign-beam-w", `${BEAM_W * fit}px`);
      store.wake();
    };

    apply(node.clientWidth);
    const ro = new ResizeObserver((entries) => apply(entries[0].contentRect.width));
    ro.observe(node);
    return () => ro.disconnect();
  }, [store]);

  let index = 0;

  return (
    <SignStoreContext.Provider value={store}>
      <div ref={container} className="flex flex-col gap-[calc(var(--mc-unit)*2)]">
        {groups.map((group) => (
          <section key={group.category}>
            <h2 className="font-pixel text-[11px] uppercase text-mc-text-dim">
              {group.category}
            </h2>
            <ul className="mt-[var(--mc-unit)] flex flex-col gap-[calc(var(--mc-unit)*0.5)]">
              {group.entries.map((entry) => (
                <FaqSignRow
                  key={entry.question}
                  entry={entry}
                  index={index++}
                  open={open.has(entry.question)}
                  onToggle={() => onToggle(entry.question)}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <Canvas
        // Orthographic, and not negotiable. drei rewrites an ortho camera's
        // frustum to the view's PIXEL box every frame, which makes one world
        // unit one pixel and keeps the sign a constant on-screen size while its
        // row grows. A perspective camera holds its vertical FOV instead, so
        // the same sign would appear to shrink as its box opened.
        orthographic
        // The camera sits a LONG way back, and the near plane is nowhere near
        // the sign. That is not caution, it is arithmetic: the rig scales sign
        // units to pixels by 96, and that multiplies DEPTH as well as width, so
        // a 0.82-unit beam is 79 world units deep. Turned a few degrees off
        // square, its near corner reaches z ≈ +79 — which sailed straight
        // through a near plane parked at 49.9 and sliced the right-hand third
        // off every sign. Being orthographic, moving the camera back costs
        // nothing: apparent size does not change with distance.
        camera={{ position: [0, 0, 600], zoom: 1, near: 1, far: 2000 }}
        frameloop={frameloop}
        dpr={[1, 1.5]}
        // `flat` = no tone mapping. Every material here is MeshBasicMaterial
        // carrying an exact palette colour, and ACES would quietly desaturate
        // the lot.
        flat
        gl={{
          antialias: false,
          alpha: true,
          stencil: false,
          powerPreference: "low-power",
          // MUST stay false. drei's View sets `autoClear = false` and never
          // clears a visible region, relying on the browser clearing the
          // drawing buffer at composite. Preserve it and every sign ghosts a
          // trail down the page as you scroll.
          preserveDrawingBuffer: false,
        }}
        style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}
      >
        {/* First child on purpose: R3F runs same-priority subscribers in
            subscription order, and the driver installs `store.wake` that the
            views and rows depend on. */}
        <SignDriver onIdle={onIdle} />
        <View.Port />
      </Canvas>
    </SignStoreContext.Provider>
  );
}
