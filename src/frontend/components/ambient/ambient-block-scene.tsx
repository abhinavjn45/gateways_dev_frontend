"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import type { PageBand } from "@/frontend/lib/ambient/page-band";
import { FloatingBlocks } from "./floating-blocks";

/**
 * The ambient canvas.
 *
 * NO LIGHTS. Every material is `MeshBasicMaterial` carrying Minecraft's own
 * per-face brightness constants in a vertex-colour attribute (see
 * `lib/ambient/block-geometry.ts`). That is both more authentic than a light
 * rig -- Minecraft shades by face identity, not by angle to a light, so the
 * shading stays put as a block tumbles -- and strictly cheaper.
 *
 * ORTHOGRAPHIC, because it makes world units map to CSS pixels at a fixed
 * rate (`zoom` = pixels per unit). A drifting decoration should be the same
 * size on the left edge as in the middle; perspective would taper it.
 *
 * BUDGET. `chat/craft-bot-scene.tsx` already holds a WebGL context on every
 * public route, so this is the second one on the page. Hence `antialias: false`
 * (which is also correct for pixel art -- Minecraft silhouettes are hard-edged),
 * a 1.5 dpr ceiling matching CraftBot, no shadows, and a frameloop that stops
 * dead when the tab is hidden.
 */

/** World units to CSS pixels. A 0.7-unit block lands at ~45px. */
const PIXELS_PER_UNIT = 64;

export default function AmbientBlockScene({
  count,
  band,
}: {
  count: number;
  band: PageBand;
}) {
  const [active, setActive] = useState(true);

  useEffect(() => {
    const onVisibility = () => setActive(!document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 50], zoom: PIXELS_PER_UNIT, near: 0.1, far: 200 }}
      dpr={[1, 1.5]}
      frameloop={active ? "always" : "never"}
      gl={{
        antialias: false,
        alpha: true,
        powerPreference: "low-power",
        stencil: false,
      }}
      // The canvas must never receive a pointer event. All hit testing happens
      // at the window level in `use-block-pointer.ts`, which is the only way a
      // full-screen overlay can be certain it is not stealing a click.
      style={{ pointerEvents: "none" }}
    >
      <Suspense fallback={null}>
        <FloatingBlocks count={count} band={band} />
      </Suspense>
    </Canvas>
  );
}
