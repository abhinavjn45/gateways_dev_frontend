export function createHunt ({ crystals, durationSeconds = 180, best = /** @type {number | null} */ (null), onFinish = (_result) => {}, onCollect = (_crystal) => {} }) {
  let state = 'idle', elapsed = 0
  const collected = new Set()
  return {
    get state () { return state }, get elapsed () { return elapsed }, get best () { return best },
    get remaining () { return Math.max(0, durationSeconds * 1000 - elapsed) }, collected,
    start () { state = 'running'; elapsed = 0; collected.clear() },
    cancel () { state = 'idle'; elapsed = 0; collected.clear() },
    nearest (pos) {
      return crystals.filter(c => !collected.has(c.id)).sort((a, b) => Math.hypot(a.x - pos.x, a.z - pos.z) - Math.hypot(b.x - pos.x, b.z - pos.z))[0] || null
    },
    update (dt, pos, paused) {
      if (state !== 'running' || paused) return
      elapsed = Math.min(durationSeconds * 1000, elapsed + dt)
      if (elapsed < durationSeconds * 1000) {
        for (const c of crystals) {
          if (!collected.has(c.id) && Math.hypot(c.x - pos.x, c.z - pos.z) < 1.25 && Math.abs(c.y - pos.y) < 1.5) {
            collected.add(c.id); onCollect(c)
          }
        }
      }
      const won = collected.size === crystals.length
      if (won || elapsed >= durationSeconds * 1000) {
        state = won ? 'won' : 'lost'
        if (won && (best === null || elapsed < best)) best = elapsed
        onFinish({ won, elapsed, best, count: collected.size })
      }
    }
  }
}
