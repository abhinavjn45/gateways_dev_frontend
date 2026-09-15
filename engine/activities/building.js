export const MATERIALS = [
  ['stone', 'Stone', '#969696'], ['cobblestone', 'Cobblestone', '#686e72'],
  ['oak_planks', 'Oak planks', '#b68b52'], ['bricks', 'Bricks', '#ac5b43'],
  ['glass', 'Glass', '#bddfdf'], ['white_wool', 'White wool', '#eeeeea'],
  ['red_wool', 'Red wool', '#b73730'], ['blue_wool', 'Blue wool', '#394aa1'],
  ['glowstone', 'Glowstone', '#edc266']
]
export const inside = (p, bounds) => ['x', 'y', 'z'].every(k => p[k] >= bounds.min[k] && p[k] <= bounds.max[k])
export const overlapsPlayer = (p, player) => p.x + 1 > player.x - 0.3 && p.x < player.x + 0.3 &&
  p.y + 1 > player.y && p.y < player.y + 1.8 && p.z + 1 > player.z - 0.3 && p.z < player.z + 0.3
export const blockKey = p => `${p.x},${p.y},${p.z}`

/** Grid DDA returns the first occupied voxel and the face-adjacent empty cell. */
export function traceVoxel (origin, direction, getBlock, reach = 6) {
  const p = Object.fromEntries(['x', 'y', 'z'].map(k => [k, Math.floor(origin[k])]))
  const step = {}, delta = {}, next = {}
  for (const k of ['x', 'y', 'z']) {
    step[k] = Math.sign(direction[k])
    delta[k] = direction[k] ? Math.abs(1 / direction[k]) : Infinity
    next[k] = direction[k] ? ((direction[k] > 0 ? p[k] + 1 - origin[k] : origin[k] - p[k]) * delta[k]) : Infinity
  }
  let distance = 0, adjacent = null
  while (distance <= reach) {
    if (getBlock(p)) return { block: { ...p }, adjacent, distance }
    const axis = next.x <= next.y && next.x <= next.z ? 'x' : next.y <= next.z ? 'y' : 'z'
    if (!Number.isFinite(next[axis])) return null
    adjacent = { ...p }
    distance = next[axis]
    p[axis] += step[axis]
    next[axis] += delta[axis]
  }
  return null
}

export function createBuilding ({ bounds, getBlock, setBlock, getPlayer, onChange = () => {} }) {
  const placed = new Map(), undo = [], redo = []
  const canSet = (p, name) => inside(p, bounds) && (!name || !overlapsPlayer(p, getPlayer()))
  const apply = (p, name) => {
    setBlock(p, name)
    if (name) placed.set(blockKey(p), { ...p, name })
    else placed.delete(blockKey(p))
  }
  const restore = entries => { for (const e of entries) apply(e, e.name) }
  return {
    placed, restore,
    edit (p, name) {
      if (!p || !canSet(p, name)) return false
      if (name && (!MATERIALS.some(m => m[0] === name) || getBlock(p))) return false
      const before = placed.get(blockKey(p))?.name || null
      if (!name && !before) return false
      apply(p, name)
      undo.push([{ p: { ...p }, before, after: name }]); if (undo.length > 100) undo.shift()
      redo.length = 0; onChange(); return true
    },
    history (forward = false) {
      const from = forward ? redo : undo, to = forward ? undo : redo
      const changes = from.at(-1)
      if (!changes || changes.some(c => !canSet(c.p, forward ? c.after : c.before))) return false
      for (const c of changes) apply(c.p, forward ? c.after : c.before)
      from.pop(); to.push(changes); onChange(); return true
    },
    clear () {
      if (!placed.size) return
      const changes = [...placed.values()].map(e => ({ p: { x: e.x, y: e.y, z: e.z }, before: e.name, after: null }))
      for (const c of changes) apply(c.p, null)
      undo.push(changes); if (undo.length > 100) undo.shift()
      redo.length = 0; onChange()
    },
    canUndo: () => undo.length > 0,
    canRedo: () => redo.length > 0
  }
}
