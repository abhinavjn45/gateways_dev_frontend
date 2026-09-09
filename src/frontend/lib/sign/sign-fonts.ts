/**
 * Webfont plumbing for the baked sign textures.
 *
 * A separate module from `sign-textures.ts` for one reason: THIS FILE MUST NOT
 * IMPORT THREE. `faq-signs.tsx` decides whether to load the 3D layer at all,
 * and it has to wait for the fonts before doing so — if it reached for the font
 * helpers through the texture module, three would be pulled into the static
 * bundle of every visitor to /faq, including the phones and the reduced-motion
 * readers who will only ever see the accordion. The dynamic import that keeps
 * it out would be doing nothing.
 */


/**
 * `next/font` self-hosts under a GENERATED family name — `Press Start 2P` is
 * not a name the browser knows, and asking for it in `ctx.font` silently gets
 * you Courier New. `--font-pixel` and `--font-body` are the only stable handles
 * on the real names.
 *
 * These resolve to the FULL stack (`__Press_Start_2P_abc123, "Courier New",
 * monospace`), which is exactly what `ctx.font` wants: if the webfont is
 * somehow unavailable the canvas falls back the same way the DOM does.
 */
export function familyFrom(cssVar: "--font-pixel" | "--font-body"): string {
  if (typeof document === "undefined") return "monospace";
  const value = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  return value || "monospace";
}

/** `document.fonts.load()` takes ONE family, not a stack. */
function firstFamily(stack: string): string {
  return stack.split(",")[0].trim();
}

let fontsPromise: Promise<void> | null = null;
let ready = false;

/**
 * Whether the faces are usable RIGHT NOW, without awaiting anything.
 *
 * The mount gate already waits for `fontsReady()` before the signs exist at
 * all, so by the time a texture is baked this is essentially always true. It
 * exists so the bake can draw its text in the same synchronous pass as its
 * wood: deferring to a resolved promise still costs a microtask, and a
 * microtask is a painted frame — one where the beams are blank planks. That
 * flash is small, and it is exactly what "the content shows up after a while"
 * looks like once the slow parts are gone.
 */
export function fontsAreReady(): boolean {
  return ready;
}

/**
 * Resolves once the webfonts are actually usable for canvas drawing.
 *
 * This matters more here than anywhere else in the app: `font-display: swap`
 * repaints DOM text when a font arrives late, but IT CANNOT REPAINT A CANVAS.
 * A texture drawn one frame too early keeps the fallback font forever. So the
 * text pass waits behind this, while the wood is painted immediately — the sign
 * is never a blank white slab, it is just briefly a blank plank.
 *
 * `document.fonts.ready` alone is not enough. It resolves when font loading is
 * idle, which under `display: "swap"` can be BEFORE a face this page has not
 * used yet has been fetched. The explicit `load()` calls force the two faces we
 * are about to draw with, and are what actually makes this correct.
 */
export function fontsReady(): Promise<void> {
  if (fontsPromise) return fontsPromise;
  if (typeof document === "undefined" || !document.fonts) {
    fontsPromise = Promise.resolve();
    return fontsPromise;
  }
  fontsPromise = document.fonts.ready
    .then(() =>
      Promise.all([
        document.fonts.load(`24px ${firstFamily(familyFrom("--font-pixel"))}`),
        document.fonts.load(`40px ${firstFamily(familyFrom("--font-body"))}`),
      ]),
    )
    .then(() => undefined)
    // A decorative layer must never be able to take the page down. A failure
    // here bakes Courier New, which is wrong but legible.
    .catch(() => undefined)
    .then(() => {
      ready = true;
    });
  return fontsPromise;
}

/** Let the mount gate wait for type before it swaps the accordion out. */
export function preloadSignFonts(): Promise<void> {
  return fontsReady();
}
