/**
 * The one background track, and everything about it that the UI needs.
 *
 * NOT in `lib/assets/manifest.ts`, despite that file being the no-hardcoded-paths
 * home for every other asset. Each manifest entry is an `AssetSpec` carrying
 * `w`/`h`/`kind` — pixel dimensions, which mean nothing for audio — and
 * `allAssets()` feeds the kitchen-sink audit page, which renders every entry it
 * is given through `<PixelImage>`. An audio entry there would show up as a
 * broken image on the style guide. One constant in its own module keeps the
 * single-source-of-truth rule without bending either file out of shape.
 *
 * SERVED FROM `public/` FOR NOW. The intended home is the assets CDN, beside the
 * heavy homepage renders, because 4.6 MB of music is 4.6 MB in every clone and
 * every deploy of a file that will never change. Moving it is a one-line edit:
 * upload to the assets repo as `audio/parallax-theme.mp3` and swap `src` for
 *
 *   https://cdn.jsdelivr.net/gh/abhinavjn45/gateways2026-assets@main/audio/parallax-theme.mp3
 *
 * Nothing else in the app needs to change — the player treats the two the same.
 *
 * MP3 rather than OGG: Safari and every iOS browser refuse Vorbis, and iOS is a
 * large share of the traffic this site gets on fest days.
 */
export const MUSIC_TRACK = {
  src: "/audio/parallax-theme.mp3",

  /** Shown in the widget. Mirrors Minecraft's "artist — track" toast. */
  label: "Now Playing — Parallax Theme",

  /**
   * Background music at full scale is startling, and this plays without being
   * asked for. 0.35 sits under a video or a call in another tab rather than
   * over it.
   */
  volume: 0.35,
} as const;
