import * as THREE from "three";
import { BLOCKS } from "@/frontend/lib/voxel/blocks";
import { AMBIENT_BLOCKS, textureUrl, type AmbientBlockDef } from "./block-textures";
import { getDestroyStages } from "./destroy-stages";

/**
 * Loads the block pack into ready-to-render materials. Memoised at module
 * scope: it runs once per page load no matter how many components ask.
 *
 * THE CONTRACT: this function NEVER REJECTS. A missing texture is a normal
 * outcome, not an error — the pack is optional, and the layer is decorative.
 * Every load goes through `.catch(() => null)` and the result is a report
 * describing what resolved. A decorative overlay must not be able to take a
 * page down, and a 404 must never surface as a magenta cube, a black cube, or
 * a thrown promise inside Suspense.
 *
 * The degradation ladder, in order:
 *   1. One face missing  -> fall back within the block (column blocks reuse
 *      `side` for a missing `top`; grass reuses `dirt` for a missing bottom).
 *   2. All faces missing -> the block becomes a flat-colour cube using
 *      `BLOCKS[def.fallback].color`. It stays in the spawn pool untextured.
 *   3. No pack at all    -> every block is flat-coloured and the feature still
 *      drifts, cracks, shatters and bursts. This is also the dev experience
 *      before anyone drops a pack in.
 *   4. No crack stages   -> `crackMaterials` is empty and the caller skips
 *      straight from click to shatter.
 */

export interface BlockAssets {
  def: AmbientBlockDef;
  /** A single material for uniform blocks (1 draw call), an array for columns. */
  material: THREE.Material | THREE.Material[];
  /** The side face, shared by every shard this block produces. */
  shardMaterial: THREE.Material;
  textured: boolean;
}

export interface AmbientPack {
  blocks: BlockAssets[];
  /** Length 10, or empty when the stages could not be built. */
  crackMaterials: THREE.MeshBasicMaterial[];
  missing: string[];
  anyTextured: boolean;
}

const loader = new THREE.TextureLoader();

/** Minecraft sampling. Every one of these lines is doing work — see below. */
function applySampling(tex: THREE.Texture): THREE.Texture {
  tex.magFilter = THREE.NearestFilter;
  // NOT NearestMipmapNearest, unlike `portal-world.tsx`. Two reasons:
  // (a) these render at ~48 CSS px from a 16px source, which is pure
  //     magnification -- mip levels are never sampled, so building them is
  //     wasted memory and upload time;
  // (b) the shards use UV-cropped geometry, and at a low mip level a 4x4 crop
  //     samples across neighbouring cells and turns every shard into grey mush.
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 1;
  return tex;
}

async function loadOne(stem: string, missing: string[]): Promise<THREE.Texture | null> {
  try {
    const tex = await loader.loadAsync(textureUrl(stem));
    return applySampling(tex);
  } catch {
    missing.push(textureUrl(stem));
    return null;
  }
}

/** Read a texture's pixels back through a 2D canvas. Used only at load time. */
function readPixels(tex: THREE.Texture): ImageData | null {
  const img = tex.image as HTMLImageElement | undefined;
  if (!img?.width) return null;
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  try {
    return ctx.getImageData(0, 0, img.width, img.height);
  } catch {
    return null; // Tainted canvas. Never fatal; we just skip the composite.
  }
}

/**
 * Is the top strip of `grass_block_side.png` already green?
 *
 * Vanilla ships a desaturated side texture plus a separate greyscale overlay
 * that the game tints per biome. Many packs -- including the one vendored in
 * `assets/` -- bake the green straight into the side texture instead.
 * Compositing a tinted overlay onto an already-green base double-tints it into
 * a dark, oversaturated smear, so we look before we composite.
 */
function sideIsPreTinted(data: ImageData): boolean {
  const w = data.width;
  const rows = Math.max(1, Math.floor(data.height / 4));
  let greenish = 0;
  let sampled = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const [r, g, b, a] = [data.data[i], data.data[i + 1], data.data[i + 2], data.data[i + 3]];
      if (a < 8) continue;
      sampled++;
      if (g > r + 14 && g > b + 14) greenish++;
    }
  }
  return sampled > 0 && greenish / sampled > 0.3;
}

/** Composite a greyscale overlay, tinted, over a base texture. */
function compositeOverlay(
  base: THREE.Texture,
  overlay: THREE.Texture,
  tint: string,
): THREE.Texture | null {
  const baseImg = base.image as HTMLImageElement | undefined;
  const overImg = overlay.image as HTMLImageElement | undefined;
  if (!baseImg?.width || !overImg?.width) return null;

  const canvas = document.createElement("canvas");
  canvas.width = baseImg.width;
  canvas.height = baseImg.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(baseImg, 0, 0);

  // Tint the overlay on its own scratch canvas first: multiply for the colour,
  // then destination-in to restore the overlay's alpha, which multiply drops.
  const scratch = document.createElement("canvas");
  scratch.width = overImg.width;
  scratch.height = overImg.height;
  const sctx = scratch.getContext("2d");
  if (!sctx) return null;
  sctx.imageSmoothingEnabled = false;
  sctx.drawImage(overImg, 0, 0);
  sctx.globalCompositeOperation = "multiply";
  sctx.fillStyle = tint;
  sctx.fillRect(0, 0, scratch.width, scratch.height);
  sctx.globalCompositeOperation = "destination-in";
  sctx.drawImage(overImg, 0, 0);

  ctx.drawImage(scratch, 0, 0, canvas.width, canvas.height);

  const tex = new THREE.CanvasTexture(canvas);
  applySampling(tex);
  tex.needsUpdate = true;
  return tex;
}

function basicMaterial(map: THREE.Texture | null, color?: string): THREE.MeshBasicMaterial {
  // `vertexColors` carries Minecraft's per-face shading (see block-geometry.ts),
  // which leaves `color` free for the biome tint. Never assign a null `map` --
  // three keys its shader program on whether the uniform exists.
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true });
  if (map) mat.map = map;
  if (color) mat.color = new THREE.Color(color);
  return mat;
}

let pending: Promise<AmbientPack> | null = null;

export function loadAmbientPack(): Promise<AmbientPack> {
  if (pending) return pending;

  pending = (async (): Promise<AmbientPack> => {
    const missing: string[] = [];

    // Load every distinct stem once, in parallel, so eight blocks sharing
    // dirt.png cause exactly one request and one GPU upload.
    const stems = new Set<string>();
    for (const def of AMBIENT_BLOCKS) {
      if (def.faces.kind === "uniform") stems.add(def.faces.all);
      else {
        stems.add(def.faces.top);
        stems.add(def.faces.side);
        if (def.faces.bottom) stems.add(def.faces.bottom);
      }
      if (def.sideOverlay) stems.add(def.sideOverlay);
    }

    const entries = await Promise.all(
      [...stems].map(async (s) => [s, await loadOne(s, missing)] as const),
    );
    const byStem = new Map<string, THREE.Texture | null>(entries);

    const blocks: BlockAssets[] = AMBIENT_BLOCKS.map((def) => {
      const fallbackColor = BLOCKS[def.fallback].color;
      const get = (stem: string) => byStem.get(stem) ?? null;

      if (def.faces.kind === "uniform") {
        const map = get(def.faces.all);
        const mat = basicMaterial(map, map ? undefined : fallbackColor);
        return { def, material: mat, shardMaterial: mat, textured: Boolean(map) };
      }

      const topRaw = get(def.faces.top);
      let side = get(def.faces.side);
      const bottom = (def.faces.bottom ? get(def.faces.bottom) : null) ?? topRaw ?? side;

      // Grass: composite the tinted fringe only if the pack has not baked it in.
      if (side && def.sideOverlay) {
        const overlay = get(def.sideOverlay);
        const px = readPixels(side);
        if (overlay && px && !sideIsPreTinted(px)) {
          side = compositeOverlay(side, overlay, def.tint?.side ?? "#79C05A") ?? side;
        }
      }

      const top = topRaw ?? side;
      const textured = Boolean(top ?? side ?? bottom);

      const sideMat = basicMaterial(side, side ? def.tint?.side : fallbackColor);
      // `tint.top` is what rescues the greyscale grass top from rendering grey.
      const topMat = basicMaterial(top, top ? def.tint?.top : fallbackColor);
      const bottomMat = basicMaterial(bottom, bottom ? undefined : fallbackColor);

      return {
        def,
        material: [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat],
        shardMaterial: sideMat,
        textured,
      };
    });

    const stages = getDestroyStages();
    const crackMaterials = stages.map(
      (map) =>
        new THREE.MeshBasicMaterial({
          map,
          transparent: true,
          // REJECTED -- MultiplyBlending. It is the intuitive match for
          // Minecraft's crumbling layer, but three's multiply is
          // (src: Zero, dst: SrcColour) and IGNORES ALPHA in the RGB maths, so
          // every transparent texel of the overlay (RGB 0) would multiply the
          // face to black. Normal blending plus alphaTest renders the crack
          // lines correctly, and NearestFilter means no dark bleed at the edges.
          alphaTest: 0.05,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -4,
          polygonOffsetUnits: -4,
          vertexColors: false,
        }),
    );

    if (process.env.NODE_ENV !== "production" && missing.length) {
      console.warn(
        `[ambient-blocks] ${missing.length} texture(s) missing; those blocks fall back to flat colour:\n  ` +
          missing.join("\n  "),
      );
    }

    return {
      blocks,
      crackMaterials,
      missing,
      anyTextured: blocks.some((b) => b.textured),
    };
  })();

  return pending;
}
