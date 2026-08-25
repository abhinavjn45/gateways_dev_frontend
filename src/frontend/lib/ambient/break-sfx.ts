/**
 * Break sounds — optional, and silent until the files exist.
 *
 * The vendored resource pack ships no audio, so this is written to be correct
 * with an empty directory: the first failed load disables that family
 * permanently and nothing ever throws or logs. Dropping .ogg files into
 * `public/art/sounds/dig/` switches the sound on with no code change.
 *
 * Playback is always triggered by a click, which is a user gesture, so the
 * autoplay policy never blocks it. We still never construct an `Audio` before
 * the first break, so a visitor who never clicks a block pays nothing.
 */

export type SfxFamily = "stone" | "grass" | "wood" | "gravel";

const SOUND_ROOT = "/art/sounds/dig";
/** Vanilla ships four variants per family and picks one at random. */
const VARIANTS = 4;
const VOLUME = 0.18;

const pools = new Map<SfxFamily, HTMLAudioElement[]>();
const disabled = new Set<SfxFamily>();

function pool(family: SfxFamily): HTMLAudioElement[] {
  const existing = pools.get(family);
  if (existing) return existing;

  const built: HTMLAudioElement[] = [];
  for (let i = 1; i <= VARIANTS; i++) {
    const el = new Audio(`${SOUND_ROOT}/${family}${i}.ogg`);
    el.volume = VOLUME;
    el.preload = "none";
    // A missing file is the expected case, not an error worth surfacing.
    el.addEventListener("error", () => disabled.add(family), { once: true });
    built.push(el);
  }
  pools.set(family, built);
  return built;
}

export function playBreakSfx(family: SfxFamily): void {
  if (typeof window === "undefined" || disabled.has(family)) return;
  try {
    const clips = pool(family);
    const clip = clips[Math.floor(Math.random() * clips.length)];
    clip.currentTime = 0;
    // Rejects when the file is missing or the browser declines. Either way the
    // visual break has already happened; audio is not worth a console error.
    void clip.play().catch(() => disabled.add(family));
  } catch {
    disabled.add(family);
  }
}
