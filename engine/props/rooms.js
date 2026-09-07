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
 *   - a floating label above the doorway that always faces the player
 *   - a board inside, on the wall opposite the door (name, kind, date, time,
 *     venue, prizes)
 *
 * Plus a proximity "interactable": stand inside the room (or on its threshold)
 * and the HUD offers "Press E — <event>", which opens the event hub.
 */

const GOLD = '#ffd94a'
const GREEN = '#7efc20'

function makeCanvas (w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function pixelTexture (THREE, canvas) {
  const tex = new THREE.CanvasTexture(canvas)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Fit `text` into `maxWidth` px by shrinking the font, never below `minPx`. */
function fitFont (g, text, family, startPx, minPx, maxWidth) {
  let px = startPx
  for (; px > minPx; px -= 1) {
    g.font = `${px}px ${family}`
    if (g.measureText(text).width <= maxWidth) break
  }
  g.font = `${px}px ${family}`
  return px
}

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

/** Floating label above a doorway. */
function labelTexture (THREE, text, family, color = GOLD) {
  const c = makeCanvas(512, 96)
  const g = c.getContext('2d')
  g.fillStyle = 'rgba(10,10,14,0.82)'
  g.fillRect(0, 0, 512, 96)
  g.fillStyle = color
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  fitFont(g, text, family, 26, 12, 480)
  g.fillText(text, 256, 48)
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
  let billboards = []    // meshes that always face the player
  let disposables = []
  const track = obj => { disposables.push(obj); return obj }

  const clear = () => {
    for (const d of disposables) d.dispose?.()
    disposables = []
    interactables = []
    billboards = []
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

      // --------------------------------------------------- floating label
      if (r.label) {
        const label = plane(labelTexture(THREE, name, family, b.interactive ? GOLD : '#cfd3da'), 2.2, 0.41, { depthTest: false })
        label.position.set(r.label.x, r.label.y, r.label.z)
        label.renderOrder = 10
        billboards.push(label)
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
      for (const bb of billboards) {
        bb.rotation.y = Math.atan2(playerPos.x - bb.position.x, playerPos.z - bb.position.z)
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

    dispose () {
      clear()
      scene.remove(group)
    }
  }
}
