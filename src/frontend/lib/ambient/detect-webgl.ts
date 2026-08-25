/**
 * Shared WebGL capability probe.
 *
 * This used to live inside `voxel-world.tsx`. It was lifted here because the
 * ambient block layer needs the same check, and importing it from the voxel
 * module would have dragged `village-scene` — and with it the whole ~600kB
 * three/terrain graph — into the bundle of every page that merely wanted to
 * ask "does this browser do WebGL?". A twelve-line probe should not cost a
 * scene graph.
 *
 * The immediate `loseContext()` is the load-bearing line. Browsers cap the
 * number of simultaneous WebGL contexts (~16 in Chrome, fewer on mobile), and
 * the probe context counts against that cap until it is garbage collected.
 * Leaking one per probe is how you get a real canvas that silently fails to
 * initialise later — which is exactly the bug this function exists to prevent.
 */
export function detectWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");
    if (!gl) return false;
    const lose = (gl as WebGLRenderingContext).getExtension("WEBGL_lose_context");
    lose?.loseContext();
    return true;
  } catch {
    return false;
  }
}
