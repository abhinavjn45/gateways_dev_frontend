import type { BlockType } from "@/frontend/lib/voxel/blocks";

/**
 * The ambient block registry — data only, no `three` import.
 *
 * This is the ONLY place in the codebase where a block texture path is
 * written down. `texture-loader.ts` consumes it, nothing else does. Swapping
 * resource packs is therefore a matter of replacing files on disk; adding a
 * block is one entry here.
 *
 * The file stems are deliberately vanilla Minecraft names
 * (`grass_block_top.png`, not `grass-top.png`) and live under a path that
 * mirrors `assets/minecraft/textures/block/`. That means a user can drag a
 * pack's block folder straight in without renaming anything, and it means the
 * names here can be checked against the wiki.
 *
 * WHY `public/art/` AND NOT `public/textures/`: `.gitignore` line 3 ignores
 * `*.png` globally and line 4 un-ignores `public/art/**\/*.png` only. Textures
 * placed anywhere else are silently dropped from the repo — they work on the
 * machine that added them and render as flat fallback colours in production,
 * with no error anywhere to explain it. Do not move this directory without
 * also adding a matching negation.
 */

export const TEXTURE_ROOT = "/art/textures/block";

/**
 * Which faces a block needs.
 *
 * `uniform` is not just a convenience — a uniform block resolves to a SINGLE
 * material rather than a six-entry array, which is the difference between one
 * draw call and six. Most blocks are uniform, so this matters more than it
 * looks.
 */
export type FaceSet =
  | { kind: "uniform"; all: string }
  | { kind: "column"; top: string; bottom?: string; side: string };

export interface AmbientBlockDef {
  /** Vanilla Minecraft block id, used for diagnostics and as a cache key. */
  id: string;
  label: string;
  faces: FaceSet;
  /**
   * Multiplied into `material.color`. Minecraft ships several textures in
   * GREYSCALE and tints them per-biome at runtime; rendered raw they come out
   * a dead grey. `grass_block_top.png` is the one that bites here — verified
   * greyscale in the shipped pack.
   */
  tint?: { top?: string; side?: string };
  /**
   * Greyscale fringe composited over the side face at load time. In vanilla
   * this is a separate tinted layer over `grass_block_side.png`.
   *
   * NOTE: the pack currently in `assets/` ships a `grass_block_side.png` that
   * is ALREADY green — the fringe is baked in. Compositing on top of that
   * would double-tint it. The loader detects this by sampling the base
   * texture and skips the composite when the base is already coloured, so
   * this field is safe to leave set for either kind of pack.
   */
  sideOverlay?: string;
  /** Flat colour used when this block's textures fail to load. */
  fallback: BlockType;
  /** Hand-authored burst colours. Cheaper and more controllable than a canvas readback. */
  particle: [string, string, string];
  /** Selects the break sound family. Files are optional; missing = silent. */
  sfx: "stone" | "grass" | "wood" | "gravel";
  /** Relative spawn weight. Default 1. */
  weight?: number;
}

/** Vanilla plains-biome foliage tint. */
export const GRASS_TINT = "#79C05A";

export const AMBIENT_BLOCKS: readonly AmbientBlockDef[] = [
  {
    id: "grass_block",
    label: "Grass Block",
    faces: { kind: "column", top: "grass_block_top", bottom: "dirt", side: "grass_block_side" },
    tint: { top: GRASS_TINT },
    sideOverlay: "grass_block_side_overlay",
    fallback: "grass",
    particle: ["#79C05A", "#8b6446", "#6d9f45"],
    sfx: "grass",
    weight: 2,
  },
  {
    id: "dirt",
    label: "Dirt",
    faces: { kind: "uniform", all: "dirt" },
    fallback: "dirt",
    particle: ["#8b6446", "#a27653", "#77563d"],
    sfx: "gravel",
  },
  {
    id: "stone",
    label: "Stone",
    faces: { kind: "uniform", all: "stone" },
    fallback: "stone",
    particle: ["#7f7f7f", "#8b8b8b", "#6e6e6e"],
    sfx: "stone",
  },
  {
    id: "cobblestone",
    label: "Cobblestone",
    faces: { kind: "uniform", all: "cobblestone" },
    fallback: "cobble",
    particle: ["#6b6b6b", "#7e7e7e", "#585858"],
    sfx: "stone",
  },
  {
    id: "oak_planks",
    label: "Oak Planks",
    faces: { kind: "uniform", all: "oak_planks" },
    fallback: "plank",
    particle: ["#9c7f4e", "#b08b57", "#7d6540"],
    sfx: "wood",
  },
  {
    id: "oak_log",
    label: "Oak Log",
    faces: { kind: "column", top: "oak_log_top", side: "oak_log" },
    fallback: "log",
    particle: ["#6d5732", "#9c7f4e", "#4f4126"],
    sfx: "wood",
  },
  {
    id: "diamond_ore",
    label: "Diamond Ore",
    faces: { kind: "uniform", all: "diamond_ore" },
    fallback: "sapphire",
    particle: ["#3ddfe0", "#7f7f7f", "#5decf5"],
    sfx: "stone",
  },
  {
    id: "emerald_ore",
    label: "Emerald Ore",
    faces: { kind: "uniform", all: "emerald_ore" },
    fallback: "emerald",
    particle: ["#17c07b", "#7f7f7f", "#2ee08f"],
    sfx: "stone",
  },
  {
    id: "gold_ore",
    label: "Gold Ore",
    faces: { kind: "uniform", all: "gold_ore" },
    fallback: "gold",
    particle: ["#f2b233", "#7f7f7f", "#ffd166"],
    sfx: "stone",
  },
  {
    id: "obsidian",
    label: "Obsidian",
    faces: { kind: "uniform", all: "obsidian" },
    fallback: "obsidian",
    particle: ["#1a1024", "#3a2450", "#0f0a16"],
    sfx: "stone",
  },
] as const;

/** Every distinct file stem the registry references, for preloading and diagnostics. */
export function collectStems(): string[] {
  const stems = new Set<string>();
  for (const def of AMBIENT_BLOCKS) {
    if (def.faces.kind === "uniform") {
      stems.add(def.faces.all);
    } else {
      stems.add(def.faces.top);
      stems.add(def.faces.side);
      if (def.faces.bottom) stems.add(def.faces.bottom);
    }
    if (def.sideOverlay) stems.add(def.sideOverlay);
  }
  return [...stems];
}

export const textureUrl = (stem: string) => `${TEXTURE_ROOT}/${stem}.png`;
