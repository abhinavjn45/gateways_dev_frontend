"use client";

import { paintSceneLayer } from "@/frontend/lib/assets/scene-art";

/**
 * The light theme's backdrop: open sky over distant country.
 *
 * A different scene rather than a lighter version of the rock, because the
 * light theme's page gradient already reads sky → haze → meadow
 * (`globals.css:556-564`) and a lit cave under it would fight that horizon. The
 * dark theme descends; the light theme opens out.
 *
 * THE ART IS NOT NEW. `hills-tile` and `clouds-blocky` already exist in
 * `lib/assets/scene-art.ts`, are already horizontally seamless (every sine
 * component completes an integer number of cycles across the tile, see
 * `periodicHeight`), and are already memoised per size. The hero uses the same
 * painters. Authoring a second set of pixel hills would have produced a
 * different-looking horizon on the same site.
 *
 * IT IS DELIBERATELY FAINT, and that is not timidity. `globals.css`'s light
 * theme opens with a stated doctrine: distance desaturates, full-strength sky
 * and soil belong only to the hero and the footer, and "the middle of the page
 * is air". A landscape at the strength of the dark theme's rock wall would
 * overturn that decision. So nothing here exceeds 0.28 opacity: the band reads
 * as haze with things barely visible in it, not as a scene. If this ever needs
 * to be louder, that is a real reversal — change the doctrine comment too,
 * rather than quietly out-weighting it here.
 *
 * There is also NO sky layer. The `html` gradient already IS the sky ramp and is
 * already tuned for atmospheric perspective; repainting over it is exactly the
 * saturated-all-the-way-down regression that comment describes.
 */

/** Source size for the painters. Wide, so the tile repeat is not obvious. */
const ART_W = 1600;
const ART_H = 900;

const HILLS = paintSceneLayer("hills-tile", ART_W, ART_H, "backdrop-hills");
const CLOUDS = paintSceneLayer("clouds-blocky", ART_W, ART_H, "backdrop-clouds");

export function SkyBackdrop({ height, parallax }: { height: number; parallax: boolean }) {
  const at = (speed: number) =>
    `translate3d(0, calc(var(--backdrop-y) * ${parallax ? speed : 1}), 0)`;

  const band = { position: "absolute" as const, insetInline: 0, top: 0, height };

  return (
    <>
      {/* Sun haze, furthest back and almost stationary. */}
      <div style={{ ...band, transform: at(0.1) }} aria-hidden>
        <span
          className="absolute -translate-x-1/2 rounded-full"
          style={{
            left: "72%",
            top: "6%",
            width: "46%",
            aspectRatio: "1 / 1",
            background: "radial-gradient(closest-side, #fff6d8, transparent 100%)",
            opacity: 0.22,
          }}
        />
      </div>

      {CLOUDS ? (
        <div
          className="pixelated"
          style={{
            ...band,
            transform: at(0.2),
            backgroundImage: `url("${CLOUDS}")`,
            backgroundRepeat: "repeat-x",
            backgroundPosition: "center top",
            backgroundSize: "auto 42%",
            opacity: 0.28,
          }}
          aria-hidden
        />
      ) : null}

      {HILLS ? (
        <div
          className="pixelated"
          style={{
            ...band,
            transform: at(0.42),
            backgroundImage: `url("${HILLS}")`,
            backgroundRepeat: "repeat-x",
            // Anchored to the foot of the band so the horizon meets the footer's
            // turf instead of floating in the middle of the page.
            backgroundPosition: "center bottom",
            backgroundSize: "auto 34%",
            opacity: 0.2,
          }}
          aria-hidden
        />
      ) : null}
    </>
  );
}
