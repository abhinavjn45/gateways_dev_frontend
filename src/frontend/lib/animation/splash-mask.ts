/**
 * GENERATED FILE — do not edit by hand.
 *
 * Which cells of the splash's assembly grid contain artwork.
 * '#' = a block flies in here, '.' = empty (not rendered at all).
 *
 * 618 of 1444 cells carry a block, sampled against a
 * 152x152 downscale of the crest purely to find occupancy — the blocks
 * themselves render the full-detail artwork, not this downscale.
 *
 * PROVENANCE. This grid was produced by the occupancy step of an earlier
 * `scripts/gen-splash-mask.mjs` (the version in the Gateways-main reference
 * checkout); the generator in this repo has since been repointed at the
 * pixel-art crest and no longer emits it. The grid only changes if the crest
 * artwork changes, so it is carried as data. If that happens, port the grid
 * step back into the generator rather than editing these rows by hand.
 */

/** Assembly cells per side — how many blocks fly in across the crest's width. */
export const SPLASH_GRID = 38;

/** Side length of the occupancy sample, in downscaled pixels. */
export const SPLASH_ART_SIZE = 152;

/** Downscaled pixels per flying block (SPLASH_ART_SIZE / SPLASH_GRID). */
export const SPLASH_ART_PER_TILE = 4;

/** Number of blocks the splash actually animates. */
export const SPLASH_BLOCK_COUNT = 618;

export const SPLASH_MASK: readonly string[] = [
  "......................................",
  ".............###.......##.............",
  "..........#####........#####..........",
  ".........##.##..........#####.........",
  ".........####............####.........",
  ".......######............######.......",
  "......#######............#######......",
  "......#######............#######......",
  "......#######............#######......",
  "......########....##....########......",
  "......####.################.####......",
  "......#.#####..##....##..#####.#......",
  "....####.####################.####....",
  "...#####..##################..#####...",
  "...######..##..########..##..######...",
  "...#######.################.#######...",
  "....#########.####.#####.#########....",
  ".....###.#########.#####.####.###.....",
  "..###############..#################..",
  "....#############..###############....",
  "...##..########################..##...",
  "...##.##########################.##...",
  "..##.####..################..####.##..",
  "..##...##..################..##...##..",
  ".........####################.........",
  ".........####################.........",
  ".........####################.........",
  "..............##########..............",
  ".............############.............",
  "............##############............",
  "............###.######.###............",
  "............##.###########............",
  "............##...####...##............",
  ".................####.................",
  "..................###.................",
  "..................###.................",
  "..................##..................",
  "..................##..................",
];
