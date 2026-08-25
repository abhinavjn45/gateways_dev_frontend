import { seededRandom } from "@/frontend/lib/assets/placeholder";
import { DEEPSLATE_TILE } from "@/frontend/lib/assets/textures";

/**
 * The shape of the underground: which rock sits at which depth, and where the
 * ore is.
 *
 * Pure data and pure functions — no DOM, no React. The component turns this
 * into elements; everything about WHAT the wall looks like is decided here.
 *
 * DEPTH IS A FRACTION OF THE BAND, never a pixel. `measurePageBand()` gives the
 * hero-to-footer strip in document pixels and that number changes with every
 * page and every viewport, so all of this is expressed in 0..1 and resolved
 * against the measured band at render time. 0 is directly under the hero, 1 is
 * the top edge of the footer.
 */

export const blockTextureUrl = (stem: string) => `/art/textures/block/${stem}.png`;

/* ---------------------------------------------------------------------------
   STRATA

   Minecraft's real column, compressed into one page: soil at the surface,
   stone under it, deepslate taking over as you go deep.

   THE FOOTER SEAM, and how it is actually solved. The page ends on grass-capped
   dirt, directly under what is now the deepest rock — grass at the bottom of a
   mineshaft. A lush-cave moss floor was built to bridge it, on the reasoning
   that Lush Caves genuinely generate below y=0. It did not survive: the depth
   wash has to reach ~74% void at the foot of the band for "deeper" to read as
   "darker" at all, and under that much darkening the moss was simply invisible.
   Two passes of lightening it traded away the descent to rescue a detail nobody
   could see.

   What solves it instead is the thing that was already there — the wall fades
   to near-black before the footer starts, so there is no deepslate-meets-turf
   edge to contradict. The footer reads as a lit ground plane at the bottom of a
   dark shaft. One gradient stop, no extra layer, and it is what the screenshots
   actually show working.

   Layers are cross-faded with mask gradients rather than butted together: a
   hard line between stone and deepslate would read as a seam in the page, and
   the game's own transition is a gradual replacement over several chunks.
   --------------------------------------------------------------------------- */

export interface StrataLayer {
  key: string;
  /** A url() value — a real block PNG, or a generated data URI. */
  image: string;
  /** `mask-image` gradient, in band percentages. */
  mask: string;
  /** Multiplied over the tile to shift its tone. Optional. */
  tint?: string;
  opacity: number;
}

export const STRATA_LAYERS: readonly StrataLayer[] = [
  {
    key: "dirt",
    image: blockTextureUrl("dirt"),
    mask: "linear-gradient(to bottom, #000 0%, #000 14%, transparent 30%)",
    opacity: 0.9,
  },
  {
    key: "stone",
    image: blockTextureUrl("stone"),
    mask: "linear-gradient(to bottom, transparent 10%, #000 26%, #000 50%, transparent 68%)",
    opacity: 0.88,
  },
  {
    key: "deepslate",
    image: DEEPSLATE_TILE,
    mask: "linear-gradient(to bottom, transparent 46%, #000 66%, #000 90%, transparent 100%)",
    opacity: 0.92,
  },
];

/** Where stone gives way to deepslate. Ore sprites switch variant here too. */
export const DEEPSLATE_CROSSOVER = 0.55;

/**
 * The base colour ramp behind the tiles — the dominant colour of each real
 * texture at that depth, sampled from the PNGs rather than guessed.
 *
 * These are the RAW texture colours, not dimmed. Dimming happens once, in
 * `DEPTH_WASH`, over the tiles AND the ore together. See the warning there.
 */
export const STRATA_GRADIENT = [
  "linear-gradient(to bottom,",
  "#79553a 0%,", // dirt
  "#7f7f7f 32%,", // stone
  "#515151 62%,", // deepslate
  "#3d3d43 100%)",
].join(" ");

/**
 * ONE wash darkens the whole wall, and it must stay that way.
 *
 * Stone is `#7f7f7f` and dirt is `#79553a` — far too bright for a page whose
 * `--mc-void` is `#0b0710`. They have to come down. The trap is darkening them
 * per-layer: ore sprites are drawn ON a stone or deepslate background, so if
 * the wall and the ore receive even slightly different treatment, every single
 * ore renders as a visible rectangle pasted on the rock.
 *
 * So: tiles and ore both render at near-full strength, and this one element
 * sits above both and dims them identically. It also ramps with depth, which is
 * what makes "deeper" read as "darker". Never add `filter` or `opacity` to an
 * individual strata layer — that is the same bug by another route.
 */
export const DEPTH_WASH = [
  "linear-gradient(to bottom,",
  "color-mix(in srgb, var(--color-mc-void) 46%, transparent) 0%,",
  "color-mix(in srgb, var(--color-mc-void) 60%, transparent) 45%,",
  "color-mix(in srgb, var(--color-mc-void) 74%, transparent) 100%)",
].join(" ");

/* ---------------------------------------------------------------------------
   ORE

   Depths follow Minecraft 1.18+ generation, mapped onto the band. Diamond and
   redstone bottom out just above the footer, copper and coal sit near the
   surface, and everything switches to its `deepslate_` variant below the
   crossover exactly as the game does. Nobody will consciously check this — but
   a player who knows where diamonds are will feel it.
   --------------------------------------------------------------------------- */

interface OreSpec {
  /** Texture stem, without the `deepslate_` prefix. */
  ore: string;
  /** Inclusive band-fraction range this ore generates in. */
  from: number;
  to: number;
  /** Relative frequency. Coal is common, diamond is not. */
  weight: number;
}

const ORES: readonly OreSpec[] = [
  { ore: "coal_ore", from: 0.06, to: 0.34, weight: 3 },
  { ore: "copper_ore", from: 0.1, to: 0.36, weight: 2 },
  { ore: "iron_ore", from: 0.3, to: 0.58, weight: 3 },
  { ore: "lapis_ore", from: 0.48, to: 0.7, weight: 1.4 },
  { ore: "emerald_ore", from: 0.54, to: 0.76, weight: 1.2 },
  { ore: "gold_ore", from: 0.6, to: 0.82, weight: 1.6 },
  { ore: "redstone_ore", from: 0.76, to: 0.95, weight: 1.8 },
  { ore: "diamond_ore", from: 0.82, to: 0.97, weight: 1.1 },
];

export interface OreVein {
  id: number;
  /** Full texture stem, deepslate variant already resolved. */
  stem: string;
  /** Band fraction, 0..1. */
  depth: number;
  /** Which margin. -1 is left, 1 is right. */
  side: -1 | 1;
  /** How far across that margin, 0 (outer edge) .. 1 (content column). */
  across: number;
  /**
   * Size in WHOLE BLOCKS.
   *
   * A block is `--mc-unit * 4` = 32 / 48 / 64px at `--mc-scale` 2 / 3 / 4,
   * i.e. exactly 2x / 3x / 4x a 16px texture. Any other multiple is fractional
   * at some scale — `--mc-unit * 3` is 36px, which is 2.25x, and pixel art at a
   * fractional scale shimmers as it scrolls. Only whole blocks here.
   */
  blocks: 1 | 2;
  /** Quarter turns. Minecraft ore is not oriented, and rotating hides the tile. */
  turns: number;
}

/**
 * Horizontal placement is confined to the OUTER MARGINS — but "margin" here
 * means the REAL one, not a fraction of the viewport.
 *
 * The content column is `max-w-6xl` = 1152px (`home-section.tsx`), so the
 * margin is `(100vw - 1152px) / 2`: 384px at 1920, 144px at 1440, and just
 * 64px at 1280. Placing ore at "20% from the left edge" would put it at 256px
 * on a 1280px screen — underneath the copy. The component therefore positions
 * against a `--margin-w` custom property and hides the whole layer below the
 * width where there is a margin worth using.
 */
export function buildOreVeins(count: number, seed = "gateways:ore-veins"): OreVein[] {
  const rnd = seededRandom(seed);
  const total = ORES.reduce((sum, o) => sum + o.weight, 0);
  const veins: OreVein[] = [];

  for (let i = 0; i < count; i++) {
    let roll = rnd() * total;
    let spec = ORES[0];
    for (const o of ORES) {
      roll -= o.weight;
      if (roll <= 0) {
        spec = o;
        break;
      }
    }

    const depth = spec.from + rnd() * (spec.to - spec.from);

    veins.push({
      id: i,
      stem: depth >= DEEPSLATE_CROSSOVER ? `deepslate_${spec.ore}` : spec.ore,
      depth,
      side: i % 2 === 0 ? -1 : 1,
      // Biased outward, so ore hugs the page edge rather than crowding the copy.
      across: Math.pow(rnd(), 1.6) * 0.72,
      blocks: rnd() < 0.72 ? 1 : 2,
      turns: Math.floor(rnd() * 4),
    });
  }
  return veins;
}

/* ---------------------------------------------------------------------------
   CAVE VOIDS AND GLOW

   Voids are what stop the wall reading as wallpaper — solid rock at a uniform
   density is exactly as flat as the colour it replaced. They sit on a slower
   layer so they feel like openings further back rather than holes in the wall.
   --------------------------------------------------------------------------- */

export interface Blob {
  id: number;
  left: number;
  depth: number;
  /** Radius as a percentage of the container width. */
  size: number;
  opacity: number;
}

export function buildCaveVoids(count: number, seed = "gateways:cave-voids"): Blob[] {
  const rnd = seededRandom(seed);
  return Array.from({ length: count }, (_, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const t = 0.02 + rnd() * 0.24;
    return {
      id: i,
      left: side < 0 ? t * 100 : (1 - t) * 100,
      depth: 0.08 + rnd() * 0.84,
      size: 14 + rnd() * 20,
      opacity: 0.35 + rnd() * 0.3,
    };
  });
}

/** Warm pools near the top, amethyst violet deep, one ember at the floor. */
export const GLOW_POOLS = [
  { key: "torch-a", left: 12, depth: 0.22, size: 26, color: "#f2b233", opacity: 0.1 },
  { key: "torch-b", left: 89, depth: 0.41, size: 22, color: "#f2b233", opacity: 0.085 },
  { key: "amethyst", left: 8, depth: 0.72, size: 30, color: "#a678f1", opacity: 0.12 },
  { key: "torch-c", left: 92, depth: 0.86, size: 24, color: "#ff9d4d", opacity: 0.1 },
  { key: "ember", left: 50, depth: 0.99, size: 46, color: "#d63b2f", opacity: 0.07 },
] as const;
