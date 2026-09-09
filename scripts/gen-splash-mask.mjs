#!/usr/bin/env node
/**
 * Builds the splash screen's two generated artefacts from the crest artwork:
 *
 *   1. public/art/brand/gateways-crest-pixel.png — the crest redrawn as true
 *      pixel art, downsampled and snapped to the project's gold ramp.
 *   2. public/art/brand/gateways-crest-aperture.png — the crest's filled
 *      silhouette, used as a CSS mask for the closing zoom-through.
 *
 *   node scripts/gen-splash-mask.mjs
 *
 * WHY A SEPARATE PIXEL ASSET: the splash resolves the crest from very coarse
 * blocks into pixel art, and the thing it resolves INTO has to be pixel art
 * itself — landing on the original smooth artwork undoes the whole effect. The
 * component draws this PNG into a canvas at 19, 38, 76 and 152 pixels square,
 * so the palette snapping has to be baked here rather than guessed at runtime.
 *
 * This script previously also emitted `splash-mask.ts`, an occupancy grid for a
 * 639-block assembly animation. That animation is gone — the splash is one
 * canvas now — so the mask is gone with it.
 *
 * Rerun this whenever the source crest changes.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/**
 * THE SAME MARK THE NAV SHOWS, deliberately — `site-nav.tsx` renders
 * `Gateways Coloured.svg`, and the splash resolving into a different drawing of
 * the logo than the one sitting in the header two seconds later is a continuity
 * break the visitor sees directly.
 *
 * It is also the drawing that survives this pipeline. `Gateways_Pixel.png`, the
 * previous source, is the OUTLINE treatment: hairline strokes with hollow
 * centres, which is exactly what vanishes when you downsample to 19px for the
 * coarsest step — the crest arrived as a scatter of unrelated dots rather than a
 * blocky logo. The nav's mark is solid-filled, so every step of the resolve has
 * real area to land on.
 *
 * sharp rasterises the SVG, so `density` below decides the sampling quality
 * rather than any fixed pixel source.
 */
const SOURCE = path.join(ROOT, "public/art/brand/Gateways Coloured.svg");
const ART_OUT = path.join(ROOT, "public/art/brand/gateways-crest-pixel.png");
const MASK_PNG_OUT = path.join(ROOT, "public/art/brand/gateways-crest-aperture.png");

/**
 * Pixel-art resolution. The GATEWAYS wordmark is what sets this floor: at 66 it
 * degrades into an unreadable bar, at 114 the letterforms run together, and at
 * 152 they separate cleanly. Going further (190+) reads no better at the sizes
 * we actually draw, and would force display sizes too wide for a phone — every
 * on-screen size has to be a whole multiple of this number.
 *
 * It also has to divide cleanly by powers of two: the splash resolves through
 * backing stores of ART/8, /4, /2 and /1, and a size that did not divide evenly
 * would put fractional source pixels in the coarse steps. 152 = 8 x 19, so it
 * does.
 */
const ART = 152;

/** Below this the cell is treated as empty rather than faintly tinted. */
const ALPHA_FLOOR = 55;

/**
 * The gold ramp, straight from the @theme tokens in globals.css
 * (--color-mc-gold-light / --color-mc-gold / --color-mc-gold-dark). Snapping to
 * three steps is what makes the result read as deliberate pixel art rather than
 * a blurry downscale — the anti-aliased midtones in the source otherwise turn
 * into muddy noise at this resolution.
 */
const RAMP = [
  { name: "gold-light", rgb: [255, 209, 102] },
  { name: "gold", rgb: [242, 178, 51] },
  { name: "gold-dark", rgb: [171, 118, 20] },
];

const { data, info } = await sharp(SOURCE, { density: 600 })
  .resize(ART, ART, { kernel: "lanczos3" })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

if (info.width !== ART || info.height !== ART) {
  throw new Error(`Expected ${ART}x${ART}, got ${info.width}x${info.height}.`);
}

// --- 1. Quantise into the pixel-art asset -----------------------------------

const out = Buffer.alloc(ART * ART * 4);
/** Per-art-pixel opacity, reused below to decide which grid cells get a block. */
const filled = new Uint8Array(ART * ART);

for (let i = 0; i < ART * ART; i++) {
  const alpha = data[i * 4 + 3];
  if (alpha < ALPHA_FLOOR) continue;

  filled[i] = 1;
  // Weight luminance by coverage so half-covered edge pixels drop to the dark
  // step instead of reading as full-strength gold.
  const lum =
    (data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114) *
    (alpha / 255);
  const [r, g, b] = RAMP[lum > 150 ? 0 : lum > 85 ? 1 : 2].rgb;
  out[i * 4] = r;
  out[i * 4 + 1] = g;
  out[i * 4 + 2] = b;
  out[i * 4 + 3] = 255;
}

await sharp(out, { raw: { width: ART, height: ART, channels: 4 } })
  .png({ palette: true, compressionLevel: 9 })
  .toFile(ART_OUT);

// --- 1b. The aperture silhouette --------------------------------------------

/**
 * The splash ends by zooming into the crest and revealing the page through it,
 * which needs a SOLID shape — the crest is line art, so masking with it directly
 * would open a few hairline slits instead of a window.
 *
 * Flood-fill the transparent space inward from the border: anything the fill
 * cannot reach is enclosed by the artwork, i.e. inside the crest. Union that
 * with the artwork itself and the result is a filled silhouette whose centre is
 * solid enough to cover the viewport once it scales up.
 */
const outside = new Uint8Array(ART * ART);
const queue = [];
const pushIfClear = (x, y) => {
  const i = y * ART + x;
  if (!filled[i] && !outside[i]) {
    outside[i] = 1;
    queue.push(i);
  }
};
for (let x = 0; x < ART; x++) {
  pushIfClear(x, 0);
  pushIfClear(x, ART - 1);
}
for (let y = 0; y < ART; y++) {
  pushIfClear(0, y);
  pushIfClear(ART - 1, y);
}
for (let head = 0; head < queue.length; head++) {
  const i = queue[head];
  const x = i % ART;
  const y = (i / ART) | 0;
  if (x > 0) pushIfClear(x - 1, y);
  if (x < ART - 1) pushIfClear(x + 1, y);
  if (y > 0) pushIfClear(x, y - 1);
  if (y < ART - 1) pushIfClear(x, y + 1);
}

const maskBuf = Buffer.alloc(ART * ART * 4);
let apertureCells = 0;
for (let i = 0; i < ART * ART; i++) {
  if (!filled[i] && outside[i]) continue; // genuinely outside the crest
  apertureCells++;
  // Only alpha is read by CSS masking; the colour is irrelevant.
  maskBuf[i * 4] = 255;
  maskBuf[i * 4 + 1] = 255;
  maskBuf[i * 4 + 2] = 255;
  maskBuf[i * 4 + 3] = 255;
}

await sharp(maskBuf, { raw: { width: ART, height: ART, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(MASK_PNG_OUT);

const artPixels = filled.reduce((n, v) => n + v, 0);

console.log(`Wrote ${path.relative(ROOT, ART_OUT)} — ${ART}x${ART}, ${artPixels} art pixels.`);
console.log(
  `Wrote ${path.relative(ROOT, MASK_PNG_OUT)} — aperture silhouette, ` +
    `${Math.round((apertureCells / (ART * ART)) * 100)}% coverage.`,
);
