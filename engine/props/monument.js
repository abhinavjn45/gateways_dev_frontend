/**
 * The courtyard sign.
 *
 * The fountain in the middle of the courtyard already has a lit column — three
 * sea lanterns and a glowstone cap, placed by build-world.mjs. This sits on top
 * of that column: a stone block carrying "Gateways 2026" on its two long faces,
 * corner stones, and a glowstone cube with a warm light. It is the one piece of
 * the campus that names the fest, and it is visible from every archway.
 *
 * A prop rather than voxels because the text has to be crisp at any distance,
 * and because it must react to night mode (the glow brightens) without a
 * world rebuild.
 *
 * NO TEXT ON THE NARROW ENDS. The block is 6.6 wide and 1.05 deep; a title
 * plane on a 0.97-wide end face would be a tenth of a block tall at the
 * texture's aspect, or squashed to nothing at the reference design's. The ends
 * keep the frame, the dark inset and the gold diamond, and read as the back
 * of a signboard — which is what they are.
 */

import { fitFont, makeCanvas, pixelTexture } from './text.js'

const BODY = { w: 6.6, h: 2.05, d: 1.05 }
const PANEL_H = 1.5
const TITLE = 'Gateways 2026'
/** Fountain column above the floor: three sea lanterns and the glowstone cap. */
const COLUMN_BLOCKS = 4

const GLOW = { day: 0xffba47, night: 0xffd88a }
/**
 * Physical candela, no tone mapping — same caveat as the entrance lanterns.
 * The reference design's 22 would white out the whole top of the fountain.
 */
const LIGHT = { color: 0xffa64d, day: 3, night: 7, distance: 8, decay: 2 }

function titleTexture (THREE, text, family) {
  const W = 1024
  const H = 256
  const c = makeCanvas(W, H)
  const g = c.getContext('2d')
  g.clearRect(0, 0, W, H)
  g.imageSmoothingEnabled = false
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  fitFont(g, text, family, 96, 40, W - 96)
  // The reference's offset shadow, so the gold sits off the black panel.
  g.fillStyle = '#5a3700'
  g.fillText(text, W / 2 + 5, H / 2 + 5)
  g.fillStyle = '#f6ba28'
  g.fillText(text, W / 2, H / 2)
  return pixelTexture(THREE, c)
}

export function createMonument ({ scene, THREE, meta, fontFamily }) {
  const at = meta?.pois?.courtyard
  // A world with no courtyard (a test fixture, a future layout) simply has no
  // sign; nothing else should have to know.
  if (!at) return { setNight () {}, dispose () {} }

  const family = fontFamily || 'ui-monospace, monospace'
  const group = new THREE.Group()
  const disposables = []
  const track = o => { disposables.push(o); return o }

  const mat = {
    stone: track(new THREE.MeshLambertMaterial({ color: 0x6d6d72 })),
    darkStone: track(new THREE.MeshLambertMaterial({ color: 0x48484d })),
    wood: track(new THREE.MeshLambertMaterial({ color: 0x6f431e })),
    panel: track(new THREE.MeshLambertMaterial({ color: 0x10100d })),
    gold: track(new THREE.MeshBasicMaterial({ color: 0xf6ba28 })),
    glow: track(new THREE.MeshBasicMaterial({ color: GLOW.day }))
  }

  const box = (parent, m, sx, sy, sz, x, y, z, rz = 0) => {
    const mesh = new THREE.Mesh(track(new THREE.BoxGeometry(sx, sy, sz)), m)
    mesh.position.set(x, y, z)
    if (rz) mesh.rotation.z = rz
    parent.add(mesh)
    return mesh
  }

  // ------------------------------------------------------------- body
  // Local origin is the top face of the column; the body rests on it.
  const bodyY = BODY.h / 2
  box(group, mat.stone, BODY.w, BODY.h, BODY.d, 0, bodyY, 0)
  for (const [x, y] of [
    [-BODY.w / 2 + 0.2, 0.77], [BODY.w / 2 - 0.2, 0.77],
    [-BODY.w / 2 + 0.2, -0.77], [BODY.w / 2 - 0.2, -0.77]
  ]) {
    box(group, mat.darkStone, 0.46, 0.46, BODY.d + 0.12, x, bodyY + y, 0)
  }

  // ----------------------------------------------------------- panels
  // One texture, one material, shared by both title faces.
  const tex = track(titleTexture(THREE, TITLE, family))
  const textMat = track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }))

  const panel = (width, x, z, ry, withTitle) => {
    const side = new THREE.Group()
    side.position.set(x, bodyY, z)
    side.rotation.y = ry
    group.add(side)

    box(side, mat.wood, width, PANEL_H, 0.15, 0, 0, 0)
    box(side, mat.panel, width - 0.24, PANEL_H - 0.24, 0.09, 0, 0, 0.1)

    if (withTitle) {
      const text = new THREE.Mesh(track(new THREE.PlaneGeometry(width - 0.55, PANEL_H * 0.55)), textMat)
      text.position.set(0, 0.25, 0.16)
      side.add(text)
    }

    // Gold trim. The lines run from near the edge in toward the centre and
    // are dropped on a face too narrow to hold them; the diamond always fits.
    const line = Math.min(1.65, (width - 0.6) / 2 - 0.15)
    if (line > 0.3) {
      const cx = width / 2 - 0.5 - line / 2
      box(side, mat.gold, line, 0.055, 0.055, -cx, -0.48, 0.18)
      box(side, mat.gold, line, 0.055, 0.055, cx, -0.48, 0.18)
    }
    box(side, mat.gold, 0.2, 0.2, 0.05, 0, -0.48, 0.19, Math.PI / 4)
  }

  panel(BODY.w - 0.85, 0, BODY.d / 2 + 0.08, 0, true)              // +z
  panel(BODY.w - 0.85, 0, -BODY.d / 2 - 0.08, Math.PI, true)        // -z
  panel(BODY.d - 0.08, -BODY.w / 2 - 0.08, 0, -Math.PI / 2, false)  // -x end
  panel(BODY.d - 0.08, BODY.w / 2 + 0.08, 0, Math.PI / 2, false)    // +x end

  // ---------------------------------------------------------- glowstone
  box(group, mat.glow, 1, 1, 1, 0, BODY.h + 0.5, 0)
  const light = new THREE.PointLight(LIGHT.color, LIGHT.day, LIGHT.distance, LIGHT.decay)
  light.position.set(0, BODY.h + 0.8, 0)
  group.add(light)

  group.position.set(at.x, at.y + COLUMN_BLOCKS + 0.1, at.z)
  scene.add(group)

  return {
    setNight (night) {
      mat.glow.color.set(night ? GLOW.night : GLOW.day)
      light.intensity = night ? LIGHT.night : LIGHT.day
    },
    dispose () {
      scene.remove(group)
      light.dispose()
      for (const d of disposables) d.dispose?.()
    }
  }
}
