/**
 * Canvas text helpers shared by every prop that bakes words into a texture.
 *
 * Lifted out of rooms.js the moment a second prop needed them; the behaviour
 * is unchanged. NearestFilter on magnification is what keeps the pixel font
 * looking like pixels instead of a blur when the camera is close.
 */

export function makeCanvas (w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

export function pixelTexture (THREE, canvas) {
  const tex = new THREE.CanvasTexture(canvas)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Fit `text` into `maxWidth` px by shrinking the font, never below `minPx`. */
export function fitFont (g, text, family, startPx, minPx, maxWidth) {
  let px = startPx
  for (; px > minPx; px -= 1) {
    g.font = `${px}px ${family}`
    if (g.measureText(text).width <= maxWidth) break
  }
  g.font = `${px}px ${family}`
  return px
}
