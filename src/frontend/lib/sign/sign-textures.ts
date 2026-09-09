import * as THREE from "three";
import { seededRandom } from "@/frontend/lib/assets/placeholder";
import { BEAM_H, BEAM_TEXT_W, BEAM_W, BOARD_H, BOARD_W } from "./sign-motion";
import { familyFrom, fontsAreReady, fontsReady } from "./sign-fonts";

/**
 * The painted faces of a hanging sign: oak planks with the text already on
 * them.
 *
 * WHY BAKE THE TEXT rather than build it from geometry or overlay it in the
 * DOM: the board swings, and anything tracking it from outside the canvas has
 * to be repositioned every frame from a matrix the GPU already knows. Painting
 * the text into the wood makes the wood and the words the same object, which
 * is also what a real sign is.
 *
 * The cost of that choice is that baked text is invisible to screen readers
 * and to the browser's own find-in-page. It is paid back in `faq-sign.tsx`,
 * which carries the same strings as real DOM text.
 *
 * WHY PROCEDURAL PLANKS rather than `oak_planks.png`: this canvas has to be
 * ready synchronously so the sign never renders as an untextured white slab,
 * and it has to be one image with the text composited into it. Loading a PNG
 * first makes both of those async for no visual gain at this size — the planks
 * are a backdrop for the type, not the subject. Same reasoning, and the same
 * seeded-noise construction, as `lib/assets/textures.ts`.
 */

/** Oak, fixed in both themes. See the theme note at the bottom of this file. */
const PLANK_BASE = "#b18c4c";
const PLANK_SHADES = ["#c5a163", "#a07e42", "#927039", "#bb9758"];
const PLANK_SEAM = "#7d5f30";
const INK = "#2b1c07";
const INK_DIM = "#4a3316";

/**
 * Canvas sizes are DERIVED from the geometry, not chosen.
 *
 * A box face stretches its texture to fill it, so a canvas whose aspect ratio
 * does not match the face it lands on squashes every glyph on the sign. Fixing
 * the width and computing the height off the real proportions makes that class
 * of bug impossible to reintroduce by editing one number.
 */
const BEAM_PX_W = 1024;
const BEAM_PX_H = Math.round((BEAM_PX_W * BEAM_H) / BEAM_W); // 94
const BOARD_PX_W = 1024;
const BOARD_PX_H = Math.round((BOARD_PX_W * BOARD_H) / BOARD_W); // 622

/**
 * How much of the beam canvas the question may use.
 *
 * The straps are opaque and sit in front of the beam, so this is the gap
 * between them expressed in canvas pixels. Wider text is not cramped, it is
 * covered up.
 */
const BEAM_TEXT_PX = Math.round((BEAM_PX_W * BEAM_TEXT_W) / BEAM_W);

/** Art-pixel size, in canvas pixels. Everything lands on this grid. */
const PX = 8;

/**
 * How many board textures may exist at once.
 *
 * Each is 1024×622×4 ≈ 2.5MB of GPU memory, so twenty resident boards would be
 * 50MB to show at most a screenful.
 *
 * The number is not arbitrary: eviction disposes the texture, and disposing one
 * that a visible board is still using would render it blank. `faq-sign-row.tsx`
 * only mounts a sign within 400px of the viewport, so at most six or so hold a
 * reference at any moment — ten leaves headroom above that and still caps this
 * at ~25MB.
 */
const BOARD_BUDGET = 10;

type Cached = { texture: THREE.CanvasTexture; canvas: HTMLCanvasElement };

const beamCache = new Map<string, Cached>();
/** Insertion-ordered, so the first key is the least recently used. */
const boardCache = new Map<string, Cached>();

// ─── Wood ───────────────────────────────────────────────────────────────────

/**
 * Fill a canvas with plank rows.
 *
 * Seeded off the text so two signs are never identically grained, but any one
 * sign grains the same way on every reload — a board that reshuffles its knots
 * between visits reads as a rendering bug.
 */
function paintPlanks(ctx: CanvasRenderingContext2D, w: number, h: number, seed: string): void {
  const rand = seededRandom(`gateways:sign:${seed}`);
  const rowH = PX * 6;

  ctx.fillStyle = PLANK_BASE;
  ctx.fillRect(0, 0, w, h);

  for (let y = 0; y < h; y += rowH) {
    // Grain: short horizontal runs of a neighbouring shade.
    for (let x = 0; x < w; x += PX) {
      if (rand() > 0.72) {
        ctx.fillStyle = PLANK_SHADES[Math.floor(rand() * PLANK_SHADES.length)];
        const run = PX * (1 + Math.floor(rand() * 3));
        const gy = y + PX * Math.floor(rand() * 6);
        ctx.fillRect(x, gy, run, PX);
      }
    }
    // The seam between planks, and the highlight on the board below it.
    ctx.fillStyle = PLANK_SEAM;
    ctx.fillRect(0, y + rowH - PX, w, PX);
  }
}

// ─── Text ───────────────────────────────────────────────────────────────────

/**
 * Break `text` into lines that each fit `maxW` at the current `ctx.font`.
 *
 * Word-wrap, with a character-level fallback for any single word longer than
 * the line — a register number in brackets or a long URL would otherwise run
 * off the edge of the board silently.
 */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = "";

  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxW) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);

    if (ctx.measureText(word).width <= maxW) {
      line = word;
      continue;
    }
    let chunk = "";
    for (const ch of word) {
      if (ctx.measureText(chunk + ch).width > maxW) {
        lines.push(chunk);
        chunk = ch;
      } else {
        chunk += ch;
      }
    }
    line = chunk;
  }

  if (line) lines.push(line);
  return lines;
}

/**
 * The largest size from `sizes` at which `text` fits the given box, with the
 * lines it wrapped to.
 *
 * Questions run to 64 characters and answers to 364, a spread no single font
 * size survives. Rather than pick a size that suits the longest and leaves the
 * short ones looking lost, each sign gets the biggest size its own text allows.
 */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  family: string,
  sizes: number[],
  maxW: number,
  maxH: number,
  lineRatio: number,
): { size: number; lines: string[] } {
  let best = { size: sizes[sizes.length - 1], lines: [text] };

  for (const size of sizes) {
    ctx.font = `${size}px ${family}`;
    const lines = wrap(ctx, text, maxW);
    if (lines.length * size * lineRatio <= maxH) return { size, lines };
    best = { size, lines };
  }
  return best;
}

/**
 * Draw text with a one-pixel drop shadow, the way Minecraft draws every glyph.
 *
 * Not a blur: an offset copy in a darker ink. A blurred shadow on pixel type is
 * the single fastest way to make it stop looking like pixel type.
 */
function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  cx: number,
  top: number,
  step: number,
): void {
  lines.forEach((line, i) => {
    const y = top + i * step;
    ctx.fillStyle = INK_DIM;
    ctx.fillText(line, cx + PX / 2, y + PX / 2);
    ctx.fillStyle = INK;
    ctx.fillText(line, cx, y);
  });
}

// ─── Textures ───────────────────────────────────────────────────────────────

function makeTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  // NOT NearestFilter, and this is a deliberate departure from `applySampling`
  // in lib/ambient/texture-loader.ts. That helper minifies 16px block art,
  // where nearest is right. This canvas is 1024px of TYPE rendered at roughly
  // 1:1, and nearest minification drops whole scanlines out of glyphs — the
  // horizontal bar vanishes from an "e" and the sign becomes unreadable.
  // Linear on the min side is the only correct choice for baked text. Please
  // do not "fix" this back to match the other helper.
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 1;
  tex.needsUpdate = true;
  return tex;
}

/**
 * The beam face, with the question on it.
 *
 * Press Start 2P, uppercase, one or two lines. The pixel face is the right one
 * here for the same reason it is right on every heading in the app: this is a
 * label, and it is short enough that the face's enormous advance width is
 * affordable.
 *
 * `onReady` fires after the text lands, which is a frame or two later than the
 * wood. Callers use it to request a render — with `frameloop="demand"` nothing
 * would repaint otherwise and the beam would stay blank.
 */
export function getBeamTexture(question: string, onReady?: () => void): THREE.CanvasTexture | null {
  const hit = beamCache.get(question);
  if (hit) return hit.texture;
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = BEAM_PX_W;
  canvas.height = BEAM_PX_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  paintPlanks(ctx, BEAM_PX_W, BEAM_PX_H, question);

  const texture = makeTexture(canvas);
  beamCache.set(question, { texture, canvas });

  const paintQuestion = () => {
    const family = familyFrom("--font-pixel");
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const { size, lines } = fitText(
      ctx,
      question.toUpperCase(),
      family,
      [26, 23, 20, 18, 16, 14],
      BEAM_TEXT_PX,
      BEAM_PX_H - PX * 5,
      1.5,
    );
    ctx.font = `${size}px ${family}`;

    const step = size * 1.5;
    const top = BEAM_PX_H / 2 - ((lines.length - 1) * step) / 2;
    drawLines(ctx, lines, BEAM_PX_W / 2, top, step);
    texture.needsUpdate = true;
  };

  // Same pass as the wood when the faces are already loaded, which after the
  // mount gate they always are. The deferred branch is the honest fallback for
  // a texture requested before the fonts land.
  if (fontsAreReady()) {
    paintQuestion();
  } else {
    void fontsReady().then(() => {
      paintQuestion();
      onReady?.();
    });
  }

  return texture;
}

/**
 * The board face, with the answer on it.
 *
 * VT323, not Press Start 2P. The answers run to 364 characters, and at that
 * length the pixel face either overflows the board or shrinks below the point
 * where its 5×7 glyphs resolve into letters. VT323 is the app's body face and
 * is roughly half the advance width, which buys back the room. The split
 * mirrors the DOM: pixel face for the label, body face for the prose.
 */
export function getBoardTexture(answer: string, onReady?: () => void): THREE.CanvasTexture | null {
  const hit = boardCache.get(answer);
  if (hit) {
    // Re-insert so the LRU order reflects this use.
    boardCache.delete(answer);
    boardCache.set(answer, hit);
    return hit.texture;
  }
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = BOARD_PX_W;
  canvas.height = BOARD_PX_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  paintPlanks(ctx, BOARD_PX_W, BOARD_PX_H, answer);

  const texture = makeTexture(canvas);
  boardCache.set(answer, { texture, canvas });
  evictBoards();

  const paintAnswer = () => {
    const family = familyFrom("--font-body");
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const { size, lines } = fitText(
      ctx,
      answer,
      family,
      [54, 48, 44, 40, 36, 32, 28],
      BOARD_PX_W - PX * 12,
      BOARD_PX_H - PX * 14,
      1.22,
    );
    ctx.font = `${size}px ${family}`;

    const step = size * 1.22;
    const top = BOARD_PX_H / 2 - ((lines.length - 1) * step) / 2;
    drawLines(ctx, lines, BOARD_PX_W / 2, top, step);
    texture.needsUpdate = true;
  };

  if (fontsAreReady()) {
    paintAnswer();
  } else {
    void fontsReady().then(() => {
      paintAnswer();
      onReady?.();
    });
  }

  return texture;
}

/**
 * Drop the least recently used boards once we are over budget.
 *
 * Beams are never evicted — there are only twenty, they are an eighth the size
 * of a board, and every one of them is on screen at some point during a scroll,
 * so an LRU over them would thrash.
 */
function evictBoards(): void {
  while (boardCache.size > BOARD_BUDGET) {
    const oldest = boardCache.keys().next();
    if (oldest.done) return;
    const entry = boardCache.get(oldest.value);
    entry?.texture.dispose();
    boardCache.delete(oldest.value);
  }
}

/**
 * NOTE ON THEMING. These colours are hardcoded oak rather than read from the
 * `--color-mc-*` tokens, and that is the documented exception, not an
 * oversight: type sitting on authored art keeps a fixed palette in both themes
 * (the same call `signpost.tsx` makes for its labels). A real sign is wooden in
 * daylight and wooden at night. Reading the tokens instead would mean
 * regenerating twenty-plus textures on every theme toggle, and would have to
 * contend with `useTheme().resolved` reporting "dark" on the first client pass.
 */
