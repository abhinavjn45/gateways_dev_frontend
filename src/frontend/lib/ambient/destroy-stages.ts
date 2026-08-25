import * as THREE from "three";
import { seededRandom } from "@/frontend/lib/assets/placeholder";

/**
 * The ten `destroy_stage_N` crack overlays, generated in code.
 *
 * WHY GENERATED AND NOT SHIPPED: resource packs almost never override the
 * destroy stages, so the pack vendored in `assets/` does not contain them, and
 * there is no Minecraft installation on the build machine to extract them
 * from. Generating them removes an asset-sourcing dependency from the critical
 * path, keeps the crack sequence working on a machine with no pack at all, and
 * sidesteps redistributing ten more Mojang files. It is ~40 lines.
 *
 * The pattern is SEEDED (`seededRandom`, never `Math.random`) for the same
 * reason `lib/assets/textures.ts` is: these are rendered pixels, and an
 * unseeded scatter would reshuffle the cracks on every remount.
 *
 * ACCUMULATION IS THE POINT. Stage N contains every pixel of stage N-1 plus
 * more, because that is what makes the sequence read as one crack widening
 * rather than ten unrelated crack patterns flickering past. We therefore grow
 * a single ordered list of pixels once, and each stage is a prefix of it.
 */

const SIZE = 16;
const STAGES = 10;

/** Crack ink. Vanilla's overlay is near-black at partial alpha. */
const INK = "rgba(10, 8, 12, 0.58)";

/** Grow one ordered list of crack pixels, oldest first. */
function crackPixels(): Array<[number, number]> {
  const rnd = seededRandom("ambient:destroy-stage:v2");
  const seen = new Set<number>();
  const out: Array<[number, number]> = [];

  const push = (x: number, y: number) => {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= SIZE || py >= SIZE) return;
    const key = py * SIZE + px;
    if (seen.has(key)) return;
    seen.add(key);
    out.push([px, py]);
  };

  /**
   * Walk from a point out to the edge of the tile along an angle.
   *
   * Each step MOVES -- an earlier version only advanced with 62% probability
   * per axis, so the walkers milled around the centre and every stage read as
   * a dark blob rather than as a fracture. A crack has to reach the edges of
   * the face or it does not look like the block is failing.
   */
  const fissure = (angle: number, jitter: number) => {
    let x = SIZE / 2 + (rnd() - 0.5) * 2;
    let y = SIZE / 2 + (rnd() - 0.5) * 2;
    let a = angle;
    for (let step = 0; step < SIZE; step++) {
      push(x, y);
      // Occasional second pixel gives the line a varying width. Kept low:
      // uniform two-pixel cracks read as drawn lines, not as splits.
      if (rnd() < 0.18) push(x + 1, y);
      a += (rnd() - 0.5) * jitter;
      x += Math.cos(a);
      y += Math.sin(a);
      if (x < -1 || y < -1 || x > SIZE || y > SIZE) break;
    }
    return { x, y, a };
  };

  // Four primary fissures radiating outward, roughly opposed so the face
  // splits rather than chipping on one side.
  const base = rnd() * Math.PI * 2;
  const ends: Array<{ x: number; y: number; a: number }> = [];
  for (let i = 0; i < 4; i++) {
    ends.push(fissure(base + (i * Math.PI) / 2 + (rnd() - 0.5) * 0.8, 0.55));
  }

  // Short branches hung off the primaries, added last so they appear in the
  // late stages -- the block looks progressively more shattered, not just
  // more scribbled.
  for (const end of ends) {
    let x = (end.x + SIZE / 2) / 2;
    let y = (end.y + SIZE / 2) / 2;
    let a = end.a + (rnd() < 0.5 ? -1 : 1) * (0.7 + rnd() * 0.6);
    for (let step = 0; step < 5; step++) {
      x += Math.cos(a);
      y += Math.sin(a);
      a += (rnd() - 0.5) * 0.7;
      push(x, y);
    }
  }

  return out;
}

let cache: THREE.CanvasTexture[] | null = null;

/**
 * Ten textures, built once on first use. Returns an empty array if there is no
 * 2D canvas available (SSR, or a browser that refuses the context), which the
 * caller reads as "skip the crack phase" rather than as an error.
 */
export function getDestroyStages(): THREE.CanvasTexture[] {
  if (cache) return cache;
  if (typeof document === "undefined") return [];

  const pixels = crackPixels();
  const stages: THREE.CanvasTexture[] = [];

  for (let s = 0; s < STAGES; s++) {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = INK;
    // Stage 0 already shows a hairline; stage 9 shows the whole fracture.
    const upTo = Math.ceil((pixels.length * (s + 1)) / STAGES);
    for (let i = 0; i < upTo; i++) {
      const [x, y] = pixels[i];
      ctx.fillRect(x, y, 1, 1);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    stages.push(tex);
  }

  cache = stages;
  return cache;
}

export const DESTROY_STAGE_COUNT = STAGES;
