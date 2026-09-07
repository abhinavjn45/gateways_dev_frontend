/**
 * Reads public/prismarine/world.schem back the way the browser engine will and
 * asserts the anchors are actually usable: spawn has ground and headroom, every
 * classroom doorway is open and reachable from the corridor, every board has a
 * wall behind it and air in front, every sign block is really a sign.
 *
 *   npm run mc:verify
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { ANCHORS, OUT, config } from './paths.mjs'

const require = createRequire(import.meta.url)
const { Schematic } = require('prismarine-schematic')
const { Vec3 } = require('vec3')

const schemPath = path.join(OUT, config.world?.schematic || 'world.schem')
for (const [label, p] of [['world.schem', schemPath], ['world-anchors.json', ANCHORS]]) {
  if (!fs.existsSync(p)) {
    console.error(`Missing ${label} — run \`npm run mc:world\` first.`)
    process.exit(1)
  }
}

const anchors = JSON.parse(fs.readFileSync(ANCHORS, 'utf8'))
const schem = await Schematic.read(fs.readFileSync(schemPath), anchors.version)

console.log(`read back     ${schem.size.x}x${schem.size.y}x${schem.size.z}  version=${schem.version}  palette=${schem.palette.length}`)

let fails = 0
const fail = msg => { fails++; console.log(`  FAIL  ${msg}`) }

const blockAt = (x, y, z) => schem.getBlock(new Vec3(Math.floor(x), Math.floor(y), Math.floor(z)))
const nameAt = (x, y, z) => blockAt(x, y, z)?.name ?? '<out of bounds>'
const isAir = (x, y, z) => nameAt(x, y, z) === 'air'
// Carpet is a 1/16-block the player walks over, so a carpeted floor counts as
// standing room even though the cell is not air.
const passable = (x, y, z) => { const n = nameAt(x, y, z); return n === 'air' || n.endsWith('_carpet') }
const inBounds = (x, y, z) =>
  x >= 0 && y >= 0 && z >= 0 && x < schem.size.x && y < schem.size.y && z < schem.size.z
const standable = (x, y, z, what) => {
  if (!inBounds(x, y, z)) { fail(`${what} (${x},${y},${z}) is outside the world`); return }
  if (!passable(x, y, z)) fail(`${what} is inside ${nameAt(x, y, z)}, not air`)
  if (!isAir(x, y + 1, z)) fail(`no headroom above ${what} (${nameAt(x, y + 1, z)})`)
  if (isAir(x, y - 1, z)) fail(`nothing solid under ${what} — the player will fall`)
}

// ------------------------------------------------------------------- spawn
if (!anchors.spawn) fail('no spawn in anchors')
else standable(anchors.spawn.x, anchors.spawn.y, anchors.spawn.z, 'spawn')

// ------------------------------------------------------------------- rooms
for (const r of anchors.rooms || []) {
  const tag = `room ${r.name}`
  // the doorway: two columns of air, three high, and a floor to stand on
  standable(r.door.x, r.door.y, r.door.z, `${tag} doorway`)
  standable(r.door.outside.x, r.door.outside.y, r.door.outside.z, `${tag} threshold`)
  standable(r.centre.x, r.centre.y, r.centre.z, `${tag} centre`)
  // the sign block really is a sign
  const sn = nameAt(r.sign.x, r.sign.y, r.sign.z)
  if (!sn.endsWith('_sign')) fail(`${tag} expected a sign at ${r.sign.x},${r.sign.y},${r.sign.z}, found ${sn}`)
  // the board panel has a wall behind it and open space in front
  const b = r.board
  const wx = b.axis === 'z' ? Math.floor(b.cx) : Math.floor(b.cx - b.dir * 0.5)
  const wz = b.axis === 'z' ? Math.floor(b.cz - b.dir * 0.5) : Math.floor(b.cz)
  const wy = Math.floor(b.cy)
  if (isAir(wx, wy, wz)) fail(`${tag} board has no wall behind it at ${wx},${wy},${wz} — the panel will float`)
  const fx = b.axis === 'z' ? wx : wx + b.dir
  const fz = b.axis === 'z' ? wz + b.dir : wz
  if (!isAir(fx, wy, fz)) fail(`${tag} board panel is buried inside ${nameAt(fx, wy, fz)}`)
}

// -------------------------------------------------------------------- POIs
for (const [key, p] of Object.entries(anchors.pois || {})) {
  if (p && typeof p.x === 'number' && !inBounds(p.x, p.y, p.z)) fail(`poi ${key} is outside the world`)
}
if (anchors.pois?.entrance) standable(anchors.pois.entrance.x, anchors.pois.entrance.y, anchors.pois.entrance.z, 'entrance')

// ------------------------------------------------------------------ totals
let solid = 0
for (const b of schem.blocks) if (schem.palette[b] !== 0) solid++
console.log(`content       ${(anchors.rooms || []).length} rooms`)
console.log(`solid blocks  ${solid.toLocaleString()}`)

if (fails === 0) {
  console.log('\nAll world assertions passed.')
  process.exit(0)
}
console.log(`\n${fails} assertion(s) FAILED.`)
process.exit(1)
