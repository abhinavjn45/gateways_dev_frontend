"use client";

import { ART } from "@/frontend/lib/assets/manifest";
import { DecorLayer, PixelDecor } from "./pixel-decor";

/**
 * The homepage's set dressing, one arrangement per section.
 *
 * Kept here rather than inline at each call site so the whole scheme is visible
 * in one place — decor that is spread across six files drifts into either "the
 * same torch on every section" or "a different idea in each", and both read as
 * an accident.
 *
 * Everything is `hidden xl:block` and offset OUTWARD past the content edge.
 * These live in the page's outer margins, which only exist once the viewport is
 * wider than the 6xl content column — below `xl` there is nowhere for a prop to
 * go that is not on top of the text, so there simply is no decor.
 */

/**
 * Outward offset from the section box.
 *
 * `left`/`right` position a sprite's OUTER edge, so the offset has to exceed the
 * widest prop here (64px) for its inner edge to clear the content column — at
 * 36px the 64px props still overlapped the text by ~10px while the 32px torches
 * looked fine, which is exactly the kind of near-miss that reads as sloppy
 * rather than broken.
 *
 * × 5 was that same near-miss one more time and it shipped. `--mc-unit` is 12px
 * between 768px and 1919px (`--mc-scale: 3`), so × 5 is 60px — FOUR SHORT of the
 * 64px sapling. Its outer edge cleared the column; its inner 4px did not, and
 * because <DecorLayer> clips, that 4px column was the only decor on the page
 * that rendered at all: a grey sliver of placeholder beside the Register
 * section's buttons, on every desktop narrower than 1920px.
 *
 * × 6 is 72px at that scale and 96px at `--mc-scale: 4`, so the widest prop
 * clears at both — and 64px props are the widest the manifest declares.
 */
const OUT_LEFT = "-left-[calc(var(--mc-unit)*6)]";
const OUT_RIGHT = "-right-[calc(var(--mc-unit)*6)]";

/** Two torches flanking the section, as if lighting a hall. */
export function TorchPair() {
  return (
    <DecorLayer>
      <PixelDecor
        asset={ART.decor.torch}
        label="torch"
        scale={2}
        className={`absolute ${OUT_LEFT} top-[calc(var(--mc-unit)*3)] hidden xl:block`}
      />
      <PixelDecor
        asset={ART.decor.torch}
        label="torch"
        scale={2}
        flip
        className={`absolute ${OUT_RIGHT} top-[calc(var(--mc-unit)*3)] hidden xl:block`}
      />
    </DecorLayer>
  );
}

/** Growth and a lantern, for the Register section's "take part" note. */
export function RegisterDecor() {
  return (
    <DecorLayer>
      <PixelDecor
        asset={ART.decor.lantern}
        label="lantern"
        scale={2}
        float
        className={`absolute ${OUT_LEFT} top-[calc(var(--mc-unit)*2)] hidden xl:block`}
      />
      <PixelDecor
        asset={ART.decor.sapling}
        label="sapling"
        scale={2}
        className={`absolute bottom-[calc(var(--mc-unit)*3)] ${OUT_RIGHT} hidden xl:block`}
      />
    </DecorLayer>
  );
}
