/** Browser stand-in for node-canvas. prismarine-viewer only uses createCanvas
 *  to draw entity nametags, and the DOM canvas API is a drop-in there. */
function createCanvas (width, height) {
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  return c
}
function loadImage (src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
module.exports = { createCanvas, loadImage, Canvas: null, Image: typeof Image !== 'undefined' ? Image : null }
