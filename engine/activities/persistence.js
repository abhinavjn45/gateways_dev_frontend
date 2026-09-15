import { MATERIALS } from './building.js'
const KEY = 'mc-gateways:activities:v1'
export function createPersistence ({ storage, bounds, onStatus = (_status) => {} }) {
  let blocked = false, timer = null, pending = null
  const flush = () => {
    clearTimeout(timer); timer = null
    if (!pending || blocked) return
    try { storage().setItem(KEY, JSON.stringify(pending)); pending = null; onStatus('Saved in this browser') }
    catch { onStatus('Not saved — browser storage unavailable') }
  }
  return {
    load () {
      try {
        const raw = storage().getItem(KEY)
        if (raw === null) { onStatus('Saves belong to this browser'); return { blocks: [], best: null } }
        const data = JSON.parse(raw)
        if (data.version !== 1 || data.plot !== 'campus-east-32x32x24' || !Array.isArray(data.blocks) || data.blocks.length > 24576 ||
          !(data.best === null || (Number.isFinite(data.best) && data.best > 0 && data.best <= 180000))) throw new Error('Invalid save')
        const seen = new Set()
        const blocks = data.blocks.map(e => {
          if (!e || !MATERIALS.some(m => m[0] === e.name)) throw new Error('Invalid material')
          const p = { name: e.name }
          for (const k of ['x', 'y', 'z']) {
            if (!Number.isInteger(e[k]) || e[k] < 0 || e[k] > bounds.max[k] - bounds.min[k]) throw new Error('Invalid coordinate')
            p[k] = e[k] + bounds.min[k]
          }
          const key = `${e.x},${e.y},${e.z}`
          if (seen.has(key)) throw new Error('Duplicate block')
          seen.add(key); return p
        })
        onStatus('Saved in this browser'); return { blocks, best: data.best }
      } catch {
        blocked = true; onStatus('Save unavailable or invalid — original retained; this session will not save')
        return { blocks: [], best: null }
      }
    },
    save (blocks, best) {
      if (blocked) return
      pending = { version: 1, plot: 'campus-east-32x32x24', best,
        blocks: [...blocks].map(e => ({ name: e.name, x: e.x - bounds.min.x, y: e.y - bounds.min.y, z: e.z - bounds.min.z })) }
      onStatus('Saving…'); clearTimeout(timer); timer = setTimeout(flush, 300)
    },
    flush,
    dispose: flush
  }
}
