/**
 * Generates the Gateways campus and exports it as a gzipped Sponge .schem that
 * prismarine-schematic reads back at runtime.
 *
 * THE SCHOOL IS A RING OF CLASSROOMS AROUND A COURTYARD. A corridor wraps the
 * courtyard; classrooms hang off the OUTSIDE of that corridor on all four
 * sides, with the entrance hall in the middle of the south wing. Rooms are
 * numbered SLOTS (N1, N2, … E1, … W1, … S1, …), filled north → east → west →
 * south; the live event list is bound onto them at runtime, so this file
 * never needs to know an event's name.
 *
 * Also emits .cache/mc/world-anchors.json: the exact coordinates of every
 * door, sign, board and spawn point, so gen-content.mjs and the engine can put
 * the three.js signage exactly where the blocks are.
 *
 * Block names are Minecraft 1.17.1 (see build-engine.mjs for why). `id()`
 * throws on a name that does not exist in that version, so a typo fails the
 * build rather than silently rendering air.
 *
 *   npm run mc:world
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { ANCHORS, CACHE, OUT, VERSION, config } from './paths.mjs'

const require = createRequire(import.meta.url)
const { Schematic } = require('prismarine-schematic')
const { getStateId } = require('prismarine-schematic/lib/states')
const mcDataLoader = require('minecraft-data')
const { Vec3 } = require('vec3')

const mcData = mcDataLoader(VERSION)

// ------------------------------------------------------------------ canvas
class WorldGrid {
  constructor (w, h, l) {
    this.w = w; this.h = h; this.l = l
    this.data = new Uint16Array(w * h * l) // palette indices, 0 = air
    this.palette = []
    this.paletteMap = new Map()
    this.id('air')
  }

  /** name + optional properties -> palette index (interning) */
  id (name, props = null) {
    const propList = props ? Object.entries(props).map(([k, v]) => [k, String(v)]) : []
    const key = propList.length ? `${name}[${propList.map(p => p.join('=')).join(',')}]` : name
    const hit = this.paletteMap.get(key)
    if (hit !== undefined) return hit
    if (!mcData.blocksByName[name]) throw new Error(`Unknown block for ${VERSION}: ${name}`)
    const stateId = getStateId(mcData, name, propList)
    const idx = this.palette.length
    this.palette.push(stateId)
    this.paletteMap.set(key, idx)
    return idx
  }

  index (x, y, z) { return (y * this.l + z) * this.w + x }

  inside (x, y, z) {
    return x >= 0 && y >= 0 && z >= 0 && x < this.w && y < this.h && z < this.l
  }

  set (x, y, z, name, props) {
    if (!this.inside(x, y, z)) return
    this.data[this.index(x, y, z)] = name === 'air' ? 0 : this.id(name, props)
  }

  get (x, y, z) {
    if (!this.inside(x, y, z)) return 0
    return this.data[this.index(x, y, z)]
  }

  fill (x0, y0, z0, x1, y1, z1, name, props) {
    const [ax, bx] = x0 <= x1 ? [x0, x1] : [x1, x0]
    const [ay, by] = y0 <= y1 ? [y0, y1] : [y1, y0]
    const [az, bz] = z0 <= z1 ? [z0, z1] : [z1, z0]
    const pid = name === 'air' ? 0 : this.id(name, props)
    for (let y = ay; y <= by; y++) {
      for (let z = az; z <= bz; z++) {
        for (let x = ax; x <= bx; x++) {
          if (this.inside(x, y, z)) this.data[this.index(x, y, z)] = pid
        }
      }
    }
  }

  /** hollow rectangular shell (four walls, no floor or ceiling) */
  shell (x0, y0, z0, x1, y1, z1, name, props) {
    this.fill(x0, y0, z0, x1, y1, z0, name, props)
    this.fill(x0, y0, z1, x1, y1, z1, name, props)
    this.fill(x0, y0, z0, x0, y1, z1, name, props)
    this.fill(x1, y0, z0, x1, y1, z1, name, props)
  }

  /** filled disc on a horizontal plane */
  disc (cx, y, cz, r, name, props) {
    const r2 = r * r
    for (let z = cz - r; z <= cz + r; z++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const dx = x - cx, dz = z - cz
        if (dx * dx + dz * dz <= r2) this.set(x, y, z, name, props)
      }
    }
  }

  ring (cx, y, cz, r, name, props) {
    const r2 = r * r, ri2 = (r - 1) * (r - 1)
    for (let z = cz - r; z <= cz + r; z++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const dx = x - cx, dz = z - cz
        const d = dx * dx + dz * dz
        if (d <= r2 && d > ri2) this.set(x, y, z, name, props)
      }
    }
  }

  countSolid () {
    let n = 0
    for (let i = 0; i < this.data.length; i++) if (this.data[i] !== 0) n++
    return n
  }
}

// -------------------------------------------------------------- dimensions
const SLOTS = Math.max(1, config.world?.slots ?? 16)

const GROUND = 8          // topmost solid ground block
const FLOOR = GROUND + 1  // first walkable air block (player feet)
const WALL_H = 5          // classroom walls, blocks
const ROOF_Y = FLOOR + WALL_H
const CORR = 4            // corridor width, blocks
const ROOM = 8            // classroom interior, blocks square
const PITCH = ROOM + 1    // interior plus the shared party wall
const HALL_W = 12         // entrance hall interior width
const APRON = 8           // grass beyond the outermost wall
const PORTAL_GAP = 10     // extra apron to the south so the portal clears the doors

/**
 * Courtyard size. Grown until the four wings hold every slot: north and south
 * capacity comes from the ring's width, east and west from its depth. Growing
 * the width first keeps the building a wide, shallow "school" rather than a
 * deep box.
 */
let CW = 52
let CD = 22
const capacity = (cw, cd) => {
  const span = cw + 11          // outer wall line to outer wall line (see OX0/OX1)
  const depth = cd + 11
  const north = Math.floor(span / PITCH)
  const side = Math.floor(depth / PITCH)
  // south: the hall sits centred; rooms fill each flank
  const hallX0 = Math.floor((span - (HALL_W + 2)) / 2)
  const south = Math.floor(hallX0 / PITCH) + Math.floor((span - (hallX0 + HALL_W + 1)) / PITCH)
  return { north, east: side, west: side, south, total: north + side * 2 + south }
}
for (let guard = 0; capacity(CW, CD).total < SLOTS && guard < 12; guard++) {
  if (CW + 11 <= 1.8 * (CD + 11)) CW += PITCH
  else CD += PITCH
}
const CAP = capacity(CW, CD)

// Grid origin: the world starts at 0, so put the apron at the edge.
const OX0 = APRON + ROOM + 1               // west outer wall of the ring
const OZ0 = APRON + ROOM + 1               // north outer wall of the ring
const CX0 = OX0 + CORR + 2                 // courtyard interior, west edge
const CZ0 = OZ0 + CORR + 2
const CX1 = CX0 + CW - 1
const CZ1 = CZ0 + CD - 1
const OX1 = CX1 + CORR + 2                 // east outer wall
const OZ1 = CZ1 + CORR + 2                 // south outer wall
if (OX1 - OX0 !== CW + 11 || OZ1 - OZ0 !== CD + 11) throw new Error('ring arithmetic drifted')

const W = OX1 + ROOM + 1 + APRON + 1
const L = OZ1 + ROOM + 1 + APRON + PORTAL_GAP + 1
const H = 26
const CCX = Math.floor((CX0 + CX1) / 2)    // courtyard centre
const CCZ = Math.floor((CZ0 + CZ1) / 2)

const g = new WorldGrid(W, H, L)
const anchors = {
  version: VERSION,
  size: { w: W, h: H, l: L },
  ground: GROUND,
  floor: FLOOR,
  spawn: null,
  rooms: [],
  pois: {}
}

/** deterministic pseudo-random so the world is reproducible */
let seed = 20260907
function rnd () {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return seed / 4294967296
}

// ------------------------------------------------------------------ terrain
function buildTerrain () {
  g.fill(0, 0, 0, W - 1, 0, L - 1, 'bedrock')
  g.fill(0, 1, 0, W - 1, GROUND - 2, L - 1, 'stone')
  g.fill(0, GROUND - 1, 0, W - 1, GROUND - 1, L - 1, 'dirt')
  g.fill(0, GROUND, 0, W - 1, GROUND, L - 1, 'grass_block')
}

function tree (x, z) {
  const h = 4 + Math.floor(rnd() * 3)
  const top = GROUND + h
  g.fill(x, GROUND + 1, z, x, top, z, 'oak_log', { axis: 'y' })
  for (let dy = -2; dy <= 1; dy++) {
    const r = dy <= -1 ? 2 : 1
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx === 0 && dz === 0 && dy <= 0) continue
        if (Math.abs(dx) === r && Math.abs(dz) === r && r === 2) continue
        if (g.get(x + dx, top + dy, z + dz) === 0) {
          g.set(x + dx, top + dy, z + dz, 'oak_leaves', { distance: 1, persistent: 'true' })
        }
      }
    }
  }
}

// ---------------------------------------------------------------- courtyard
function buildCourtyard () {
  // paths: a cross from archway to archway, meeting at the fountain
  g.fill(CCX - 1, GROUND, CZ0, CCX + 1, GROUND, CZ1, 'stone_bricks')
  g.fill(CX0, GROUND, CCZ - 1, CX1, GROUND, CCZ + 1, 'stone_bricks')

  // fountain: raised stone rim, shallow water, a lit column
  g.disc(CCX, GROUND, CCZ, 4, 'stone_bricks')
  g.ring(CCX, FLOOR, CCZ, 4, 'chiseled_stone_bricks')
  g.disc(CCX, GROUND, CCZ, 3, 'water')
  g.fill(CCX, FLOOR, CCZ, CCX, FLOOR + 2, CCZ, 'sea_lantern')
  g.set(CCX, FLOOR + 3, CCZ, 'glowstone')

  // benches facing the fountain, and a tree in each corner
  for (const [dx, dz, facing] of [[-7, 0, 'east'], [7, 0, 'west'], [0, -6, 'south'], [0, 6, 'north']]) {
    const bx = CCX + dx, bz = CCZ + dz
    if (facing === 'east' || facing === 'west') {
      g.fill(bx, FLOOR, bz - 1, bx, FLOOR, bz + 1, 'oak_stairs', { facing, half: 'bottom', shape: 'straight', waterlogged: 'false' })
    } else {
      g.fill(bx - 1, FLOOR, bz, bx + 1, FLOOR, bz, 'oak_stairs', { facing, half: 'bottom', shape: 'straight', waterlogged: 'false' })
    }
  }
  for (const [x, z] of [[CX0 + 3, CZ0 + 3], [CX1 - 3, CZ0 + 3], [CX0 + 3, CZ1 - 3], [CX1 - 3, CZ1 - 3]]) tree(x, z)

  // lamp posts at the archways
  for (const [x, z] of [[CCX - 3, CZ0], [CCX + 3, CZ0], [CCX - 3, CZ1], [CCX + 3, CZ1], [CX0, CCZ - 3], [CX0, CCZ + 3], [CX1, CCZ - 3], [CX1, CCZ + 3]]) {
    g.fill(x, FLOOR, z, x, FLOOR + 2, z, 'oak_fence')
    g.set(x, FLOOR + 3, z, 'lantern')
  }

  anchors.pois.courtyard = { x: CCX + 0.5, y: FLOOR, z: CCZ + 0.5 }
}

// ----------------------------------------------------------------- corridor
function buildCorridor () {
  // floor: a two-tone checker over the whole ring footprint, then the
  // courtyard is left as grass (it was filled first, this only paints the ring)
  for (let z = OZ0; z <= OZ1; z++) {
    for (let x = OX0; x <= OX1; x++) {
      const inCourt = x >= CX0 && x <= CX1 && z >= CZ0 && z <= CZ1
      if (inCourt) continue
      g.set(x, GROUND, z, ((x >> 1) + (z >> 1)) % 2 === 0 ? 'polished_andesite' : 'smooth_stone')
    }
  }

  // outer wall, five high, with a skirting course and a window band
  g.shell(OX0, FLOOR, OZ0, OX1, FLOOR + WALL_H - 1, OZ1, 'stone_bricks')
  g.shell(OX0, FLOOR, OZ0, OX1, FLOOR, OZ1, 'oak_planks')

  // parapet between corridor and courtyard, with a four-wide archway on each side
  const px0 = CX0 - 1, px1 = CX1 + 1, pz0 = CZ0 - 1, pz1 = CZ1 + 1
  g.shell(px0, GROUND, pz0, px1, GROUND, pz1, 'stone_bricks')
  g.shell(px0, FLOOR, pz0, px1, FLOOR, pz1, 'stone_brick_wall')
  g.fill(CCX - 2, FLOOR, pz0, CCX + 2, FLOOR, pz0, 'air')
  g.fill(CCX - 2, FLOOR, pz1, CCX + 2, FLOOR, pz1, 'air')
  g.fill(px0, FLOOR, CCZ - 2, px0, FLOOR, CCZ + 2, 'air')
  g.fill(px1, FLOOR, CCZ - 2, px1, FLOOR, CCZ + 2, 'air')
  for (const [x, z] of [[CCX - 2, pz0], [CCX + 2, pz0], [CCX - 2, pz1], [CCX + 2, pz1], [px0, CCZ - 2], [px0, CCZ + 2], [px1, CCZ - 2], [px1, CCZ + 2]]) {
    g.fill(x, FLOOR, z, x, FLOOR + 2, z, 'chiseled_stone_bricks')
    g.set(x, FLOOR + 3, z, 'sea_lantern')
  }

  // roof over the corridor only — the courtyard stays open to the sky
  for (let z = OZ0; z <= OZ1; z++) {
    for (let x = OX0; x <= OX1; x++) {
      const inCourt = x >= px0 && x <= px1 && z >= pz0 && z <= pz1
      if (inCourt) continue
      const lamp = (x - OX0) % 7 === 3 && (z - OZ0) % 7 === 3
      if (lamp) g.set(x, ROOF_Y, z, 'sea_lantern')
      else g.set(x, ROOF_Y, z, 'stone_brick_slab', { type: 'bottom', waterlogged: 'false' })
    }
  }
}

// --------------------------------------------------------------- classrooms
const CARPETS = ['red_carpet', 'blue_carpet', 'lime_carpet', 'yellow_carpet', 'purple_carpet', 'orange_carpet', 'cyan_carpet', 'magenta_carpet']

/**
 * One classroom. `ix0..ix1` × `iz0..iz1` is the INTERIOR; walls sit one
 * outside it. `door` names the wall shared with the corridor; the board hangs
 * on the wall opposite, flanked by windows.
 */
function buildRoom ({ index, wing, name, ix0, iz0, door }) {
  const ix1 = ix0 + ROOM - 1
  const iz1 = iz0 + ROOM - 1
  const wx0 = ix0 - 1, wx1 = ix1 + 1, wz0 = iz0 - 1, wz1 = iz1 + 1

  // floor + carpet inset one block, so a plank border shows around it
  g.fill(ix0, GROUND, iz0, ix1, GROUND, iz1, 'oak_planks')
  g.fill(ix0 + 1, FLOOR, iz0 + 1, ix1 - 1, FLOOR, iz1 - 1, CARPETS[index % CARPETS.length])

  // walls, skirting, roof
  g.shell(wx0, FLOOR, wz0, wx1, FLOOR + WALL_H - 1, wz1, 'stone_bricks')
  g.shell(wx0, FLOOR, wz0, wx1, FLOOR, wz1, 'oak_planks')
  g.fill(wx0, ROOF_Y, wz0, wx1, ROOF_Y, wz1, 'stone_brick_slab', { type: 'bottom', waterlogged: 'false' })
  g.set(ix0 + 2, ROOF_Y, iz0 + 2, 'sea_lantern')
  g.set(ix1 - 2, ROOF_Y, iz0 + 2, 'sea_lantern')
  g.set(ix0 + 2, ROOF_Y, iz1 - 2, 'sea_lantern')
  g.set(ix1 - 2, ROOF_Y, iz1 - 2, 'sea_lantern')

  // The four walls, oriented from the door: `along` runs the length of the
  // door wall, `depth` runs from the door to the board.
  const horizontal = door === 'n' || door === 'S' || door === 's'
  const doorLine = door === 'n' ? wz0 : door === 's' ? wz1 : door === 'w' ? wx0 : wx1
  const boardLine = door === 'n' ? wz1 : door === 's' ? wz0 : door === 'w' ? wx1 : wx0
  const along0 = horizontal ? ix0 : iz0
  const along1 = horizontal ? ix1 : iz1
  const mid = Math.floor((along0 + along1) / 2)
  const at = (a, line) => (horizontal ? [a, line] : [line, a])

  // doorway: two wide, three high, centred on the corridor wall
  for (const a of [mid, mid + 1]) {
    const [x, z] = at(a, doorLine)
    g.fill(x, FLOOR, z, x, FLOOR + 2, z, 'air')
  }
  // door frame
  for (const a of [mid - 1, mid + 2]) {
    const [x, z] = at(a, doorLine)
    g.fill(x, FLOOR, z, x, FLOOR + 3, z, 'dark_oak_planks')
  }

  // board: four wide, three high, dark, framed — the three.js panel hangs on it
  for (const a of [mid - 1, mid, mid + 1, mid + 2]) {
    const [x, z] = at(a, boardLine)
    g.fill(x, FLOOR + 1, z, x, FLOOR + 3, z, 'black_concrete')
  }
  for (const a of [mid - 2, mid + 3]) {
    const [x, z] = at(a, boardLine)
    g.fill(x, FLOOR + 1, z, x, FLOOR + 3, z, 'dark_oak_planks')
  }
  // windows either side of the board frame
  for (const a of [along0, along1]) {
    const [x, z] = at(a, boardLine)
    g.fill(x, FLOOR + 1, z, x, FLOOR + 3, z, 'glass')
  }

  // desks: two rows of two, an aisle down the middle, chairs facing the board
  const toBoard = door === 'n' ? 'south' : door === 's' ? 'north' : door === 'w' ? 'east' : 'west'
  const deskDepths = door === 'n' || door === 'w' ? [2, 5] : [1, 4]   // rows measured from iz0/ix0
  for (const dd of deskDepths) {
    for (const da of [0, 5]) {
      // desk is 2 along × 1 deep, chair one block toward the door
      const chairShift = (door === 'n' || door === 'w') ? -1 : 1
      const dLine = (horizontal ? iz0 : ix0) + dd
      const [x0, z0] = at(along0 + da + 1, dLine)
      const [x1, z1] = at(along0 + da + 2, dLine)
      g.fill(x0, FLOOR, z0, x1, FLOOR, z1, 'oak_planks')
      const [cx0, cz0] = at(along0 + da + 1, dLine + chairShift)
      const [cx1, cz1] = at(along0 + da + 2, dLine + chairShift)
      g.fill(cx0, FLOOR, cz0, cx1, FLOOR, cz1, 'oak_stairs', { facing: toBoard, half: 'bottom', shape: 'straight', waterlogged: 'false' })
    }
  }

  // -------------------------------------------------------------- anchors
  const outward = door === 'n' ? [0, -1] : door === 's' ? [0, 1] : door === 'w' ? [-1, 0] : [1, 0]
  // the sign hangs on the corridor side of the door wall, right of the doorway
  const [sx, sz] = at(mid + 3, doorLine)
  const signPos = { x: sx + outward[0], y: FLOOR + 1, z: sz + outward[1] }
  const signFacing = door === 'n' ? 'north' : door === 's' ? 'south' : door === 'w' ? 'west' : 'east'
  g.set(signPos.x, signPos.y, signPos.z, 'birch_wall_sign', { facing: signFacing, waterlogged: 'false' })

  const [dx, dz] = at(mid, doorLine)
  const doorCentre = { x: dx + (horizontal ? 1 : 0.5), z: dz + (horizontal ? 0.5 : 1) }
  const boardDir = door === 'n' ? -1 : door === 's' ? 1 : door === 'w' ? -1 : 1 // direction the panel FACES (into the room)
  const [bx, bz] = at(mid, boardLine)

  anchors.rooms.push({
    index,
    wing,
    name,
    bounds: { min: { x: ix0, y: FLOOR, z: iz0 }, max: { x: ix1, y: ROOF_Y - 1, z: iz1 } },
    centre: { x: (ix0 + ix1 + 1) / 2, y: FLOOR, z: (iz0 + iz1 + 1) / 2 },
    door: {
      x: doorCentre.x,
      y: FLOOR,
      z: doorCentre.z,
      facing: signFacing,
      // where to stand in the corridor, one block out from the doorway, looking in
      outside: { x: doorCentre.x + outward[0] * 1.5, y: FLOOR, z: doorCentre.z + outward[1] * 1.5 }
    },
    sign: { ...signPos, facing: signFacing },
    label: {
      x: doorCentre.x + outward[0] * 0.6,
      y: FLOOR + 3.6,
      z: doorCentre.z + outward[1] * 0.6
    },
    board: {
      cx: horizontal ? bx + 1 : bx + (boardDir > 0 ? 1.02 : -0.02),
      cy: FLOOR + 2.5,
      cz: horizontal ? bz + (boardDir > 0 ? 1.02 : -0.02) : bz + 1,
      axis: horizontal ? 'z' : 'x',
      dir: boardDir,
      w: 4,
      h: 3
    }
  })
}

function buildWings () {
  const span = OX1 - OX0
  let slot = 0
  const next = () => slot < SLOTS ? slot++ : -1

  // north: interior just outside the north wall, filling west → east
  for (let i = 0; i < CAP.north; i++) {
    const index = next(); if (index < 0) break
    buildRoom({ index, wing: 'north', name: `N${i + 1}`, ix0: OX0 + 1 + i * PITCH, iz0: OZ0 - ROOM, door: 's' })
  }
  // east: interior just outside the east wall, filling north → south
  for (let i = 0; i < CAP.east; i++) {
    const index = next(); if (index < 0) break
    buildRoom({ index, wing: 'east', name: `E${i + 1}`, ix0: OX1 + 1, iz0: OZ0 + 1 + i * PITCH, door: 'w' })
  }
  // west: mirror of east
  for (let i = 0; i < CAP.west; i++) {
    const index = next(); if (index < 0) break
    buildRoom({ index, wing: 'west', name: `W${i + 1}`, ix0: OX0 - ROOM, iz0: OZ0 + 1 + i * PITCH, door: 'e' })
  }
  // south: rooms flank the entrance hall
  const hallX0 = OX0 + Math.floor((span - (HALL_W + 2)) / 2)   // hall's west wall
  const hallX1 = hallX0 + HALL_W + 1                            // hall's east wall
  const leftCount = Math.floor((hallX0 - OX0) / PITCH)
  const rightCount = Math.floor((OX1 - hallX1) / PITCH)
  let s = 0
  for (let i = 0; i < leftCount; i++) {
    const index = next(); if (index < 0) break
    buildRoom({ index, wing: 'south', name: `S${++s}`, ix0: OX0 + 1 + i * PITCH, iz0: OZ1 + 1, door: 'n' })
  }
  for (let i = 0; i < rightCount; i++) {
    const index = next(); if (index < 0) break
    buildRoom({ index, wing: 'south', name: `S${++s}`, ix0: hallX1 + 1 + i * PITCH, iz0: OZ1 + 1, door: 'n' })
  }

  buildEntranceHall(hallX0, hallX1)
}

// ---------------------------------------------------------- entrance hall
function buildEntranceHall (hx0, hx1) {
  const iz0 = OZ1 + 1, iz1 = OZ1 + ROOM
  const wz1 = iz1 + 1
  g.fill(hx0 + 1, GROUND, iz0, hx1 - 1, GROUND, iz1, 'polished_andesite')
  g.shell(hx0, FLOOR, OZ1, hx1, FLOOR + WALL_H - 1, wz1, 'stone_bricks')
  g.shell(hx0, FLOOR, OZ1, hx1, FLOOR, wz1, 'oak_planks')
  g.fill(hx0, ROOF_Y, OZ1, hx1, ROOF_Y, wz1, 'stone_brick_slab', { type: 'bottom', waterlogged: 'false' })
  const mid = Math.floor((hx0 + hx1) / 2)
  // open onto the corridor (north) and the grounds (south): four wide, four high
  g.fill(mid - 1, FLOOR, OZ1, mid + 2, FLOOR + 3, OZ1, 'air')
  g.fill(mid - 1, FLOOR, wz1, mid + 2, FLOOR + 3, wz1, 'air')
  // pillars and lights
  for (const x of [mid - 2, mid + 3]) {
    g.fill(x, FLOOR, OZ1, x, FLOOR + 4, OZ1, 'chiseled_stone_bricks')
    g.fill(x, FLOOR, wz1, x, FLOOR + 4, wz1, 'chiseled_stone_bricks')
  }
  for (const x of [hx0 + 3, mid, hx1 - 3]) g.set(x, ROOF_Y, (iz0 + iz1) >> 1, 'sea_lantern')
  // windows on the front
  g.fill(hx0 + 2, FLOOR + 2, wz1, mid - 3, FLOOR + 3, wz1, 'glass')
  g.fill(mid + 4, FLOOR + 2, wz1, hx1 - 2, FLOOR + 3, wz1, 'glass')
  // a welcome sign beside the inner doors
  g.set(mid + 3, FLOOR + 2, OZ1 + 1, 'birch_wall_sign', { facing: 'south', waterlogged: 'false' })

  anchors.pois.entrance = { x: mid + 0.5, y: FLOOR, z: wz1 + 1.5, inner: { x: mid + 0.5, y: FLOOR, z: OZ1 - 1.5 } }

  // path from the front doors to the portal, with lamp posts
  const pz = wz1 + PORTAL_GAP - 2
  g.fill(mid - 1, GROUND, wz1 + 1, mid + 2, GROUND, pz - 1, 'dirt_path')
  for (let z = wz1 + 3; z < pz - 1; z += 4) {
    for (const x of [mid - 3, mid + 4]) {
      g.fill(x, FLOOR, z, x, FLOOR + 1, z, 'oak_fence')
      g.set(x, FLOOR + 2, z, 'lantern')
    }
  }
  buildPortal(mid, pz)
}

// ------------------------------------------------------------------ portal
function buildPortal (cx, pz) {
  g.fill(cx - 5, GROUND, pz - 3, cx + 6, GROUND, pz + 3, 'obsidian')
  g.fill(cx - 3, GROUND, pz - 1, cx + 4, GROUND, pz + 1, 'crying_obsidian')
  // frame: six wide, five tall, on the x axis, so you arrive facing the doors
  const fx0 = cx - 2, fx1 = cx + 3
  const fy0 = FLOOR, fy1 = FLOOR + 4
  g.fill(fx0, fy0, pz, fx1, fy0, pz, 'obsidian')
  g.fill(fx0, fy1, pz, fx1, fy1, pz, 'obsidian')
  g.fill(fx0, fy0, pz, fx0, fy1, pz, 'obsidian')
  g.fill(fx1, fy0, pz, fx1, fy1, pz, 'obsidian')
  g.fill(fx0 + 1, fy0 + 1, pz, fx1 - 1, fy1 - 1, pz, 'nether_portal', { axis: 'x' })
  for (const dx of [-5, 6]) {
    g.fill(cx + dx, FLOOR, pz, cx + dx, FLOOR + 3, pz, 'obsidian')
    g.set(cx + dx, FLOOR + 4, pz, 'glowstone')
  }
  anchors.pois.portal = { x: cx + 0.5, y: FLOOR, z: pz + 0.5, axis: 'x' }
}

// -------------------------------------------------------------- decoration
function decorate () {
  const busy = (x, z) =>
    (x >= OX0 - ROOM - 2 && x <= OX1 + ROOM + 2 && z >= OZ0 - ROOM - 2 && z <= OZ1 + ROOM + 2) ||
    (Math.abs(x - anchors.pois.portal.x) < 10 && z > OZ1)
  for (let i = 0; i < 160; i++) {
    const x = 3 + Math.floor(rnd() * (W - 6))
    const z = 3 + Math.floor(rnd() * (L - 6))
    if (busy(x, z)) continue
    if (g.get(x, GROUND + 1, z) !== 0) continue
    if (rnd() < 0.7) tree(x, z)
    else g.set(x, FLOOR, z, rnd() < 0.5 ? 'dandelion' : 'poppy')
  }
}

// ---------------------------------------------------------------- build all
buildTerrain()
buildCorridor()
buildCourtyard()
buildWings()
decorate()

// spawn south of the fountain, looking north across it at the classroom wing.
// three.js looks down -Z at yaw 0, and the engine's physics agrees.
anchors.spawn = { x: CCX + 0.5, y: FLOOR, z: CCZ + 8.5, yaw: 0 }

// --------------------------------------------------------------- export
const blocks = Array.from(g.data)
const schem = new Schematic(VERSION, new Vec3(W, H, L), new Vec3(0, 0, 0), g.palette, blocks)
const buffer = await schem.write()

fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(CACHE, { recursive: true })
fs.writeFileSync(path.join(OUT, config.world?.schematic || 'world.schem'), buffer)
fs.writeFileSync(ANCHORS, JSON.stringify(anchors, null, 2))

console.log(`campus        courtyard ${CW}x${CD}  capacity N${CAP.north} E${CAP.east} W${CAP.west} S${CAP.south} = ${CAP.total}  slots ${SLOTS}`)
console.log(`world.schem   ${W}x${H}x${L}  palette=${g.palette.length}  solid=${g.countSolid().toLocaleString()}  gz=${(buffer.length / 1024).toFixed(1)} KB`)
console.log(`anchors       rooms=${anchors.rooms.length}  spawn=${JSON.stringify(anchors.spawn)}`)
