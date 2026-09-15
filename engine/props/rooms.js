/**
 * Classroom signage.
 *
 * These are three.js meshes placed at real world coordinates so they read as
 * part of the map, rather than voxels — that way they can carry crisp text
 * (the live event names), custom art and their own proximity handling.
 *
 * Nothing about an event is baked into the schematic: the world only has
 * numbered classroom slots (world.meta.json `rooms`), and the React side hands
 * us `bindings` — which event, if any, lives in which slot. Three pieces of
 * signage per room:
 *
 *   - a wall sign beside the door (short: the event name)
 *   - a header sign above the doorway: wooden frame, dark panel, the event
 *     name in gold, chains, and a lantern at each end
 *   - a board inside, on the wall opposite the door (name, kind, date, time,
 *     venue, prizes)
 *
 * Plus a proximity "interactable": stand inside the room (or on its threshold)
 * and the HUD offers "Press E — <event>", which opens the event hub.
 *
 * THE HEADER SIGN IS A SOLID OBJECT ON THE WALL, and that is the whole point of
 * it. Its predecessor was a floating label drawn with `depthTest: false` and a
 * high `renderOrder`, turned to face the player every frame — which meant every
 * event name was painted over everything, through every wall, from anywhere on
 * the map, and hung in the void while the terrain around it was still
 * streaming in. The sign is depth-tested like any block: walls hide it, and it
 * appears with the building it is bolted to.
 */

import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { fitFont, makeCanvas, pixelTexture } from './text.js'

const GOLD = '#ffd94a'
const GREEN = '#7efc20'

/** Minecraft-style wall sign: dark plank frame, centred lines. */
function signTexture (THREE, lines, family) {
  const c = makeCanvas(256, 128)
  const g = c.getContext('2d')
  g.fillStyle = '#3b2a1a'
  g.fillRect(0, 0, 256, 128)
  g.fillStyle = '#b57f56'
  g.fillRect(4, 4, 248, 120)
  // plank seams
  g.fillStyle = '#9d6b45'
  for (let y = 34; y < 124; y += 30) g.fillRect(4, y, 248, 2)
  g.fillStyle = '#2a1d10'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const rows = (lines || []).slice(0, 4)
  const size = rows.length > 2 ? 16 : 20
  rows.forEach((line, i) => {
    const y = 64 + (i - (rows.length - 1) / 2) * (size + 8)
    fitFont(g, line, family, size, 9, 236)
    g.fillText(line, 128, y)
  })
  return pixelTexture(THREE, c)
}

/** Classroom board: dark slate, gold frame, title + facts. */
function boardTexture (THREE, { title, lines, accent }, family) {
  const W = 512, H = 384
  const c = makeCanvas(W, H)
  const g = c.getContext('2d')
  g.fillStyle = '#15161a'
  g.fillRect(0, 0, W, H)
  g.strokeStyle = accent || GOLD
  g.lineWidth = 8
  g.strokeRect(10, 10, W - 20, H - 20)
  // chalk dust — a few faint specks so the slate is not a flat void
  g.fillStyle = 'rgba(255,255,255,0.06)'
  for (let i = 0; i < 40; i++) g.fillRect((i * 97) % (W - 30) + 15, (i * 53) % (H - 30) + 15, 3, 3)

  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillStyle = '#ffffff'
  const titleRows = wrap(title, 16, 2)
  const titlePx = titleRows.length > 1 ? 26 : 30
  titleRows.forEach((row, i) => {
    fitFont(g, row, family, titlePx, 14, W - 60)
    g.fillText(row, W / 2, 62 + i * (titlePx + 10))
  })
  const startY = 62 + titleRows.length * (titlePx + 10) + 14
  g.fillStyle = GREEN
  g.fillRect(60, startY - 6, W - 120, 3)

  g.fillStyle = '#e8e8ec'
  const rows = (lines || []).filter(Boolean).slice(0, 6)
  const rowPx = 15
  rows.forEach((line, i) => {
    fitFont(g, line, family, rowPx, 9, W - 60)
    g.fillText(line, W / 2, startY + 22 + i * (rowPx + 14))
  })
  return pixelTexture(THREE, c)
}

/**
 * One or two lines for the header sign.
 *
 * Not `wrap()`: with a one-line cap that helper drops the overflow silently,
 * and with two it puts a single word on the second line and drops the rest.
 * A name that does not fit must SAY it does not fit.
 */
function headerLines (text, maxChars = 18) {
  const str = String(text || '').trim()
  if (str.length <= maxChars) return [str]
  const lines = ['']
  for (const w of str.split(/\s+/)) {
    const cur = lines[lines.length - 1]
    const next = cur ? `${cur} ${w}` : w
    if (next.length <= maxChars) { lines[lines.length - 1] = next; continue }
    if (lines.length === 2) {
      lines[1] = cur.slice(0, maxChars - 1) + '…'
      return lines
    }
    lines.push(w.length > maxChars ? w.slice(0, maxChars - 1) + '…' : w)
  }
  return lines
}

/**
 * The header sign's face: the event name in gold on a transparent canvas, laid
 * over the dark panel. 1024×256 is a power of two (mipmaps) and ~4:1, the same
 * shape as the panel, so NearestFilter lands the pixel font on whole texels.
 */
function headerTexture (THREE, text, family, color) {
  const W = 1024, H = 256
  const c = makeCanvas(W, H)
  const g = c.getContext('2d')
  g.clearRect(0, 0, W, H)
  g.fillStyle = color
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const rows = headerLines(text)
  if (rows.length === 1) {
    fitFont(g, rows[0], family, 118, 40, W - 84)
    g.fillText(rows[0], W / 2, H / 2)
  } else {
    // Both rows at one size, so the two lines read as one title.
    const px = Math.min(
      fitFont(g, rows[0], family, 72, 34, W - 84),
      fitFont(g, rows[1], family, 72, 34, W - 84)
    )
    g.font = `${px}px ${family}`
    g.fillText(rows[0], W / 2, H / 2 - px * 0.68)
    g.fillText(rows[1], W / 2, H / 2 + px * 0.68)
  }
  return pixelTexture(THREE, c)
}

/** Greedy word wrap to `maxChars` per line, at most `maxLines` lines. */
export function wrap (text, maxChars, maxLines) {
  const words = String(text || '').trim().split(/\s+/)
  const out = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (next.length <= maxChars) { cur = next; continue }
    if (cur) out.push(cur)
    cur = w.length > maxChars ? w.slice(0, maxChars - 1) + '…' : w
    if (out.length === maxLines - 1) break
  }
  if (cur && out.length < maxLines) out.push(cur)
  if (out.length === 0) out.push('')
  return out
}

/**
 * The header sign, built ONCE and shared by every room.
 *
 * The reference design is ~25 meshes: four frame bars, two insets, a panel,
 * gold trim, ten chain links, two lanterns with glowing cores. Sixteen rooms of
 * that is ~400 draw calls before a single block is drawn. So the static parts
 * are merged into one BufferGeometry per material and every room's sign is
 * seven meshes pointing at those seven geometries — 128 draw calls for the lot,
 * and a rebuild for a new event list costs nothing but the text.
 *
 * Built at the reference's own proportions, then scaled by S once, then
 * translated so the BACK of the frame is at local z = 0: anchoring a sign at
 * the wall face is then "flush against the wall" with no per-room arithmetic.
 *
 * MeshLambert rather than the reference's MeshStandard: it is what the world's
 * blocks are lit with, so the wood sits under the same ambient and sun as the
 * stone around it, and it is a fraction of the shader cost. The gold trim and
 * the lantern cores are MeshBasic — unlit — so they always read bright.
 */
const SIGN_SCALE = 0.75
const SIGN = { w: 6.4, h: 1.65, d: 0.22, frame: 0.18, frameD: 0.34 }

/**
 * The lanterns' light. TUNE BY EYE, on the actual wall.
 *
 * three ≥ r155 measures point lights in candela and this renderer has no tone
 * mapping, so there is no roll-off: a lantern hanging 0.3 blocks off the stone
 * with the reference design's intensity of 5 paints a clipped white disc, not
 * a warm pool. 1.6 is a starting point that stays inside the range the Lambert
 * blocks can show. `distance` is the hard cut-off — 4 keeps the glow off the
 * neighbouring door 9 blocks away.
 */
const LANTERN_LIGHT = { color: 0xff9d3c, intensity: 1.6, distance: 4, decay: 2 }
/** The lantern core, day and night. Unlit, so this IS its brightness. */
const LANTERN_GLOW = { day: 0xffa31a, night: 0xffc25e }
/**
 * How many signs carry real light. Every point light is compiled into every
 * Lambert shader in the scene — the world's blocks included — so the pool is
 * fixed: two lights per sign, one sign by day, the four nearest by night.
 * Unused lights stay invisible and three does not compile for them.
 */
const LIT_SIGNS = { day: 1, night: 4 }
const LIGHT_POOL = LIT_SIGNS.night * 2

function buildSignTemplate (THREE) {
  const { w, h, d, frame, frameD } = SIGN
  const parts = { wood: [], darkWood: [], panel: [], gold: [], chain: [], lanternBody: [], lanternGlow: [], lanternHalo: [] }
  const box = (list, sx, sy, sz, x, y, z, rz = 0) => {
    const g = new THREE.BoxGeometry(sx, sy, sz)
    if (rz) g.rotateZ(rz)
    g.translate(x, y, z)
    list.push(g)
  }

  box(parts.panel, w, h, d, 0, 0, 0)

  box(parts.wood, w + frame * 2, frame, frameD, 0, h / 2 + frame / 2, 0)
  box(parts.wood, w + frame * 2, frame, frameD, 0, -h / 2 - frame / 2, 0)
  box(parts.wood, frame, h, frameD, -w / 2 - frame / 2, 0, 0)
  box(parts.wood, frame, h, frameD, w / 2 + frame / 2, 0, 0)

  box(parts.darkWood, w - 0.2, 0.08, 0.28, 0, h / 2 - 0.12, 0.09)
  box(parts.darkWood, w - 0.2, 0.08, 0.28, 0, -h / 2 + 0.12, 0.09)

  box(parts.gold, 1.7, 0.035, 0.04, -1.7, -0.42, d / 2 + 0.03)
  box(parts.gold, 1.7, 0.035, 0.04, 1.7, -0.42, d / 2 + 0.03)
  box(parts.gold, 0.16, 0.16, 0.05, 0, -0.42, d / 2 + 0.04, Math.PI / 4)

  // Chains: five links a side, alternating quarter turns so they read as links
  // rather than a stack of rings. The cross-section is not square on purpose.
  for (const x of [-2.3, 2.3]) {
    for (let i = 0; i < 5; i++) {
      const g = new THREE.TorusGeometry(0.055, 0.018, 6, 10)
      g.rotateX(Math.PI / 2)
      if (i % 2 === 1) g.rotateY(Math.PI / 2)
      g.translate(x, h / 2 + 0.22 + i * 0.12, 0)
      parts.chain.push(g)
    }
  }

  const lanternAt = []
  for (const x of [-3.65, 3.65]) {
    box(parts.lanternBody, 0.34, 0.52, 0.34, x, -0.08, 0.15)
    box(parts.lanternGlow, 0.23, 0.32, 0.23, x, -0.08, 0.15)
    // The night halo: a soft additive box around the lantern. Unlit and
    // shared, so all thirty-two switch on with one material flag.
    box(parts.lanternHalo, 0.56, 0.78, 0.56, x, -0.08, 0.15)
    lanternAt.push(new THREE.Vector3(x, -0.08, 0.15))
  }

  const zBack = frameD / 2
  const geometries = {}
  for (const [k, list] of Object.entries(parts)) {
    const merged = mergeGeometries(list, false)
    merged.translate(0, 0, zBack)
    merged.scale(SIGN_SCALE, SIGN_SCALE, SIGN_SCALE)
    geometries[k] = merged
    for (const g of list) g.dispose()
  }
  // The name's quad, shared too — only its texture differs per room.
  geometries.text = new THREE.PlaneGeometry(5.2 * SIGN_SCALE, 1.3 * SIGN_SCALE)

  const materials = {
    wood: new THREE.MeshLambertMaterial({ color: 0x6b3f1f }),
    darkWood: new THREE.MeshLambertMaterial({ color: 0x3a2111 }),
    panel: new THREE.MeshLambertMaterial({ color: 0x101010 }),
    gold: new THREE.MeshBasicMaterial({ color: 0xf4c542 }),
    chain: new THREE.MeshLambertMaterial({ color: 0x343434 }),
    lanternBody: new THREE.MeshLambertMaterial({ color: 0x252525 }),
    lanternGlow: new THREE.MeshBasicMaterial({ color: LANTERN_GLOW.day }),
    lanternHalo: new THREE.MeshBasicMaterial({
      color: 0xffb347,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      visible: false // day: off
    })
  }

  return {
    geometries,
    materials,
    textZ: (d / 2 + 0.03 + zBack) * SIGN_SCALE,
    lanternLocal: lanternAt.map(v => v.add(new THREE.Vector3(0, 0, zBack)).multiplyScalar(SIGN_SCALE)),
    dispose () {
      for (const g of Object.values(geometries)) g.dispose()
      for (const m of Object.values(materials)) m.dispose()
    }
  }
}

const FACING_YAW = { south: 0, north: Math.PI, east: Math.PI / 2, west: -Math.PI / 2 }
const FACING_OFFSET = {
  // a wall sign sits at the back of its own block, flush against the wall
  south: [0.5, 0.08], north: [0.5, 0.92], east: [0.08, 0.5], west: [0.92, 0.5]
}

export function createRoomProps ({ scene, THREE, meta, bindings, config, fontFamily, isTouch, onOpenEvent }) {
  const group = new THREE.Group()
  scene.add(group)

  const family = fontFamily || 'ui-monospace, monospace'
  const ui = config?.ui || {}
  const hintTemplate = (isTouch ? ui.hubHintTouch : ui.hubHint) || 'Press E — {name}'

  let interactables = [] // { bounds, threshold, hint, open() }
  let signs = []         // { group, lanterns: [Vector3, Vector3] } in world space
  let disposables = []   // per-build; thrown away on every rebuild
  const track = obj => { disposables.push(obj); return obj }

  // Built once; survives every rebuild; freed only in dispose().
  const tpl = buildSignTemplate(THREE)

  /**
   * Two lanterns' worth of light for the WHOLE campus, moved to whichever sign
   * the player is nearest. Every point light is compiled into every Lambert
   * shader in the scene — the world's blocks included — so thirty-two of them
   * would tax every fragment on screen for a glow nobody is close enough to
   * see. Two, following the player, put the warm pool on the door being
   * walked toward, which is the only place it is ever looked at.
   */
  const lights = Array.from({ length: LIGHT_POOL }, () => {
    const l = new THREE.PointLight(LANTERN_LIGHT.color, LANTERN_LIGHT.intensity, LANTERN_LIGHT.distance, LANTERN_LIGHT.decay)
    l.visible = false
    scene.add(l)
    return l
  })
  let night = false
  let litKey = null // which signs currently hold the lights

  const clear = () => {
    for (const d of disposables) d.dispose?.()
    disposables = []
    interactables = []
    signs = []
    litKey = null
    for (const l of lights) l.visible = false
    while (group.children.length) group.remove(group.children[0])
  }

  const plane = (tex, w, h, opts = {}) => {
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, ...opts })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat)
    track(mat); track(tex); track(mesh.geometry)
    group.add(mesh)
    return mesh
  }

  const build = list => {
    clear()
    const rooms = meta?.rooms || []
    for (const b of list || []) {
      const r = rooms[b.index]
      if (!r) continue
      const name = b.label || ''

      // ------------------------------------------------------- door sign
      if (r.sign) {
        const [ox, oz] = FACING_OFFSET[r.sign.facing] || FACING_OFFSET.south
        const sign = plane(signTexture(THREE, b.signLines || wrap(name, 14, 3), family), 0.92, 0.46)
        sign.position.set(r.sign.x + ox, r.sign.y + 0.53, r.sign.z + oz)
        sign.rotation.y = FACING_YAW[r.sign.facing] ?? 0
      }

      // ------------------------------------------------------ header sign
      if (r.label && r.door) {
        const sign = new THREE.Group()
        // Shared geometry and materials: added, never tracked — clear() must
        // not dispose what the next build is about to reuse.
        for (const k of Object.keys(tpl.materials)) {
          sign.add(new THREE.Mesh(tpl.geometries[k], tpl.materials[k]))
        }
        // The one thing unique to this room. `depthWrite: false` so the
        // transparent quad never z-fights the opaque panel 0.03 behind it;
        // depthTest stays ON — walls still hide it.
        const tex = track(headerTexture(THREE, name, family, b.interactive ? '#f4c542' : '#cfd3da'))
        const mat = track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }))
        const text = new THREE.Mesh(tpl.geometries.text, mat)
        text.position.z = tpl.textZ
        sign.add(text)

        // `label` is already the door centre, raised, a hand's width off the
        // wall face. With the template's back at local z = 0, that is flush.
        sign.position.set(r.label.x, r.label.y, r.label.z)
        sign.rotation.y = FACING_YAW[r.door.facing] ?? 0
        group.add(sign)
        sign.updateMatrixWorld(true)
        signs.push({
          id: b.index,
          group: sign,
          lanterns: tpl.lanternLocal.map(v => sign.localToWorld(v.clone()))
        })
      }

      // ------------------------------------------------------------ board
      if (r.board) {
        const tex = boardTexture(THREE, {
          title: name,
          lines: b.boardLines || [],
          accent: b.interactive ? GOLD : '#6e7380'
        }, family)
        const board = plane(tex, r.board.w || 4, r.board.h || 3)
        board.position.set(r.board.cx, r.board.cy, r.board.cz)
        board.rotation.y = r.board.axis === 'z'
          ? (r.board.dir > 0 ? 0 : Math.PI)
          : (r.board.dir > 0 ? Math.PI / 2 : -Math.PI / 2)
      }

      // ----------------------------------------------------- interactable
      if (b.interactive && b.slug) {
        const slug = b.slug
        interactables.push({
          bounds: r.bounds,
          threshold: r.door?.outside,
          hint: hintTemplate.replace('{name}', name),
          open: () => onOpenEvent?.(slug)
        })
      }
    }
  }

  build(bindings)

  let nearestRef = null

  const inside = (p, bounds, pad) => (
    bounds &&
    p.x >= bounds.min.x - pad && p.x <= bounds.max.x + 1 + pad &&
    p.z >= bounds.min.z - pad && p.z <= bounds.max.z + 1 + pad &&
    p.y >= bounds.min.y - 1 && p.y <= bounds.max.y + 1
  )

  return {
    nearest () { return nearestRef },

    update (playerPos) {
      // Hand the pool of lights to the nearest signs. Lantern positions were
      // computed at build time, so a change of sign is a few vector copies.
      const want = night ? LIT_SIGNS.night : LIT_SIGNS.day
      const ranked = signs
        .map(sg => ({ sg, d: (sg.group.position.x - playerPos.x) ** 2 + (sg.group.position.z - playerPos.z) ** 2 }))
        .sort((a, b) => a.d - b.d)
        .slice(0, want)
        .map(r => r.sg)
      const key = ranked.map(sg => sg.id).join(',')
      if (key !== litKey) {
        litKey = key
        lights.forEach((l, i) => {
          const sg = ranked[i >> 1]
          l.visible = Boolean(sg)
          if (sg) l.position.copy(sg.lanterns[i & 1])
        })
      }

      let best = null
      for (const it of interactables) {
        if (inside(playerPos, it.bounds, 0.4)) { best = it; break }
        const t = it.threshold
        if (t && Math.hypot(t.x - playerPos.x, t.z - playerPos.z) < 1.6 && Math.abs(t.y - playerPos.y) < 2) { best = it; break }
      }
      nearestRef = best
    },

    /** Rebuild every sign for a new event list (the sheet changed underneath us). */
    setBindings (next) { build(next) },

    /** Night: every lantern glows, and the four nearest doors cast light. */
    setNight (on) {
      night = Boolean(on)
      tpl.materials.lanternHalo.visible = night
      tpl.materials.lanternGlow.color.set(night ? LANTERN_GLOW.night : LANTERN_GLOW.day)
      litKey = null // re-deal the lights on the next frame
    },

    dispose () {
      clear()
      for (const l of lights) { scene.remove(l); l.dispose() }
      tpl.dispose()
      scene.remove(group)
    }
  }
}
