"use client";

import {
  buildCaveVoids,
  buildOreVeins,
  blockTextureUrl,
  DEPTH_WASH,
  GLOW_POOLS,
  STRATA_GRADIENT,
  STRATA_LAYERS,
} from "@/frontend/lib/ambient/strata";

/**
 * The dark theme's backdrop: a wall of rock you descend past.
 *
 * WHY THERE IS NO SCROLL LISTENER IN HERE. The parent writes a single custom
 * property, `--backdrop-y`, once per animation frame; every layer below reads it
 * through `calc(var(--backdrop-y) * <speed>)`. One property write moves the
 * whole scene, the multiplication happens on the compositor, and this component
 * never re-renders while scrolling. Giving each layer its own listener, or
 * threading a scroll value through props, would put React in the scroll path
 * for no gain.
 *
 * SPEED 1.0 IS NOT PARALLAX. A layer at 1.0 moves exactly with the document, so
 * it behaves like an ordinary background that happens to be positioned by
 * transform. Only the void and glow layers differ, and that difference is the
 * only thing here that reduced motion needs to switch off — which is why the
 * parent can neutralise the effect by passing `parallax={false}` rather than by
 * unmounting anything.
 */

/** Tile edge, in `--mc-unit` multiples. A 16px tile at 4 units lands on whole pixels. */
const TILE_UNITS = 4;

export function StrataWall({
  height,
  parallax,
  oreCount,
}: {
  /** Band height in document pixels — the wall is exactly this tall. */
  height: number;
  parallax: boolean;
  oreCount: number;
}) {
  const veins = buildOreVeins(oreCount);
  const voids = buildCaveVoids(Math.max(4, Math.round(oreCount / 2)));

  // Under reduced motion every layer travels with the page, so nothing moves
  // relative to anything else and the depth cue simply goes away.
  const at = (speed: number) =>
    `translate3d(0, calc(var(--backdrop-y) * ${parallax ? speed : 1}), 0)`;

  const band = { position: "absolute" as const, insetInline: 0, top: 0, height };

  return (
    <>
      {/* Cave voids sit furthest back and travel slowest, so they read as
          openings behind the wall rather than holes punched through it. */}
      <div style={{ ...band, transform: at(0.85) }} aria-hidden>
        {voids.map((v) => (
          <span
            key={v.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${v.left}%`,
              top: `${v.depth * 100}%`,
              width: `${v.size}%`,
              aspectRatio: "1.4 / 1",
              background: `radial-gradient(closest-side, rgb(0 0 0 / ${v.opacity}), transparent 100%)`,
            }}
          />
        ))}
      </div>

      {/* The wall itself. */}
      <div style={{ ...band, transform: at(1), background: STRATA_GRADIENT }} aria-hidden>
        {STRATA_LAYERS.map((layer) => (
          <div
            key={layer.key}
            className="pixelated absolute inset-0"
            style={{
              backgroundImage: `url("${layer.image}")`,
              backgroundRepeat: "repeat",
              // Integer multiples of --mc-unit so a 16px tile lands on whole
              // pixels at every --mc-scale; fractional scaling makes pixel art
              // shimmer as you scroll.
              backgroundSize: `calc(var(--mc-unit) * ${TILE_UNITS}) calc(var(--mc-unit) * ${TILE_UNITS})`,
              opacity: layer.opacity,
              maskImage: layer.mask,
              WebkitMaskImage: layer.mask,
            }}
          />
        ))}

        {veins.map((v) => (
          <span
            key={v.id}
            className="ore-vein pixelated absolute block"
            style={{
              top: `${v.depth * 100}%`,
              // Positioned against the REAL margin, not a percentage of the
              // viewport — see the note on placement in strata.ts. `--margin-w`
              // is pure CSS, so this stays correct through any resize without
              // JS ever measuring it.
              [v.side < 0 ? "left" : "right"]: `calc(var(--margin-w) * ${v.across.toFixed(3)})`,
              width: `calc(var(--mc-unit) * 4 * ${v.blocks})`,
              height: `calc(var(--mc-unit) * 4 * ${v.blocks})`,
              backgroundImage: `url("${blockTextureUrl(v.stem)}")`,
              // One tile per block, so a 2-block vein is two tiles rather than
              // one stretched to 2x -- which would double the pixel size and
              // break the grid the rest of the wall sits on.
              backgroundSize: `calc(var(--mc-unit) * 4) calc(var(--mc-unit) * 4)`,
              backgroundRepeat: "repeat",
              rotate: `${v.turns * 90}deg`,
            }}
          />
        ))}

        {/* The single darkening pass, over the tiles AND the ore. Adding
            per-layer opacity or filter above this line is the one change that
            reliably turns every ore into a visible rectangle. */}
        <div className="absolute inset-0" style={{ background: DEPTH_WASH }} />
      </div>

      {/* Light sources, just ahead of the wall. */}
      <div style={{ ...band, transform: at(0.92) }} aria-hidden>
        {GLOW_POOLS.map((g) => (
          <span
            key={g.key}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${g.left}%`,
              top: `${g.depth * 100}%`,
              width: `${g.size}%`,
              aspectRatio: "1 / 1",
              background: `radial-gradient(closest-side, ${g.color}, transparent 100%)`,
              opacity: g.opacity,
            }}
          />
        ))}
      </div>
    </>
  );
}
