import { Vec3 } from 'vec3'

/**
 * Wraps a prismarine-schematic in a prismarine-world, generating chunk columns
 * on demand. The schematic sits at world origin, so schematic (x,y,z) is world
 * (x,y,z) and every coordinate in world.meta.json is directly usable.
 *
 * Loaded columns are shared by rendering, physics and the validated creative editor.
 */
export function createSchematicWorld ({ schematic, World, Chunk }) {
  const size = schematic.size
  const cache = new Map()

  const generateChunk = (chunkX, chunkZ) => {
    const key = `${chunkX},${chunkZ}`
    const hit = cache.get(key)
    if (hit) return hit

    const chunk = new Chunk()
    const baseX = chunkX * 16
    const baseZ = chunkZ * 16
    const pos = new Vec3(0, 0, 0)
    const src = new Vec3(0, 0, 0)

    const maxY = Math.min(size.y, 256)
    for (let x = 0; x < 16; x++) {
      const wx = baseX + x
      if (wx < 0 || wx >= size.x) continue
      for (let z = 0; z < 16; z++) {
        const wz = baseZ + z
        if (wz < 0 || wz >= size.z) continue

        for (let y = 0; y < maxY; y++) {
          src.set(wx, y, wz)
          const stateId = schematic.getBlockStateId(src)
          if (!stateId) continue
          pos.set(x, y, z)
          chunk.setBlockStateId(pos, stateId)
        }

        // Full sky light. prismarine-viewer's mesher shades by ambient
        // occlusion rather than light level, so this mainly matters to
        // anything else reading the chunk; the world reads bright either way.
        for (let y = 0; y < maxY; y++) {
          pos.set(x, y, z)
          chunk.setSkyLight(pos, 15)
          chunk.setBlockLight(pos, 0)
        }
      }
    }

    cache.set(key, chunk)
    return chunk
  }

  const world = new World(generateChunk)
  world.schematicSize = size
  return world
}

/** Preload editable columns so subsequent edits are synchronous and atomic. */
export async function createWorldEditor ({ world, bounds, states, notify = (_pos, _stateId) => {} }) {
  for (let x = Math.floor(bounds.min.x / 16); x <= Math.floor(bounds.max.x / 16); x++) {
    for (let z = Math.floor(bounds.min.z / 16); z <= Math.floor(bounds.max.z / 16); z++) await world.getColumn(x, z)
  }
  return (p, name) => {
    if (!['x', 'y', 'z'].every(k => Number.isInteger(p[k]) && p[k] >= bounds.min[k] && p[k] <= bounds.max[k])) throw new Error('Protected block')
    const stateId = name === null ? 0 : states[name]
    if (!Number.isInteger(stateId)) throw new Error('Unknown building material')
    const pos = new Vec3(p.x, p.y, p.z)
    world.sync.setBlockStateId(pos, stateId)
    notify(pos, stateId)
  }
}
