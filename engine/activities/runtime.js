import { MATERIALS, createBuilding, inside, overlapsPlayer, traceVoxel } from './building.js'
import { createPersistence } from './persistence.js'
import { createHunt } from './hunt.js'
import { createWorldEditor } from '../world/schematicWorld.js'

const clock = ms => `${Math.floor(Math.ceil(ms / 1000) / 60)}:${String(Math.ceil(ms / 1000) % 60).padStart(2, '0')}`
export async function createActivities ({ THREE, Vec3, meta, mcData, world, worldView, viewer, player, hud, isTouch, canAct }) {
  const { hunt: huntMeta, creative: plot } = meta.activities
  const root = document.createElement('div')
  root.className = 'mc-activities'
  root.innerHTML = `
    <nav class="mc-activity-nav" aria-label="World activities">
      <button data-do="hunt">◆ Crystal Hunt</button><button data-do="creative">▦ Creative Plot</button><button data-do="home">⌂ Campus</button><button data-do="help">? Controls</button>
    </nav>
    <section class="mc-quest" aria-label="Activity progress"><strong data-title>EXPLORE & PLAY</strong><span data-progress>10 crystals · 3 minutes · Your best time</span><span data-direction>Start a hunt or build something of your own.</span></section>
    <section class="mc-buildbar" hidden aria-label="Creative building tools">
      <div class="mc-build-info"><strong>CREATIVE PLOT</strong><span>32 × 32 · 24 blocks high · Unlimited blocks</span></div>
      <div class="mc-materials">${MATERIALS.map(([name, label, color], i) => `<button data-material="${i}" title="${i + 1}: ${label}" aria-label="${label}" aria-pressed="${i === 0}"><i style="--block-color:${color}"></i><small>${i + 1}</small></button>`).join('')}</div>
      <div data-selected>Stone · Left click remove · Right click place</div>
      <div class="mc-build-tools"><button data-do="flight">Flight: off</button><button data-do="undo">Undo</button><button data-do="redo">Redo</button><button data-do="clear">Clear plot</button></div>
      <div class="mc-save" data-save role="status"></div>
    </section>
    ${isTouch ? '<div class="mc-touch-actions"><button data-hold="jump">Jump / ↑</button><button data-hold="sneak">↓</button><button data-edit="place">Place</button><button data-edit="remove">Remove</button></div>' : ''}`
  hud.root.appendChild(root)
  const el = selector => root.querySelector(selector)
  let selected = 0, creative = false, target = null, disposed = false
  const persistence = createPersistence({ storage: () => localStorage, bounds: plot, onStatus: text => { el('[data-save]').textContent = text } })
  const saved = persistence.load()
  const states = Object.fromEntries(MATERIALS.map(([name]) => [name, mcData.blocksByName[name].defaultState]))
  const setBlock = await createWorldEditor({ world, bounds: plot, states, notify: (pos, stateId) => worldView.emit('blockUpdate', { pos, stateId }) })
  const getBlock = p => world.sync.getBlockStateId(new Vec3(p.x, p.y, p.z)) || 0
  const save = () => persistence.save(building.placed.values(), hunt.best)
  const building = createBuilding({ bounds: plot, getBlock, setBlock, getPlayer: () => player.position, onChange: save })
  building.restore(saved.blocks)

  const group = new THREE.Group(); viewer.scene.add(group)
  const crystalGeometry = new THREE.OctahedronGeometry(0.38)
  const crystalMaterial = new THREE.MeshStandardMaterial({ color: '#7ffff3', emissive: '#26d9ba', emissiveIntensity: 0.8, roughness: 0.25, metalness: 0.2 })
  const crystals = huntMeta.crystals.map(c => {
    const mesh = new THREE.Mesh(crystalGeometry, crystalMaterial)
    mesh.position.set(c.x, c.y + 1, c.z); mesh.visible = false; group.add(mesh)
    return { ...c, mesh }
  })
  const textures = [], labelMaterials = []
  const label = (text, pos, color) => {
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 100
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#132326'; ctx.fillRect(0, 0, 640, 100)
    ctx.strokeStyle = color; ctx.lineWidth = 8; ctx.strokeRect(4, 4, 632, 92)
    ctx.font = 'bold 28px monospace'; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.fillText(text, 320, 60)
    const texture = new THREE.CanvasTexture(canvas); textures.push(texture)
    const material = new THREE.SpriteMaterial({ map: texture }); labelMaterials.push(material)
    const sprite = new THREE.Sprite(material); sprite.position.set(pos.x, pos.y + 3, pos.z); sprite.scale.set(5.4, 0.85, 1); group.add(sprite)
  }
  label('◆ CRYSTAL HUNT · E TO START', huntMeta.start, '#8effe6')
  label('CREATIVE PLOT · BUILD YOUR WORLD', plot.entry, '#ffdf87')
  const previewGeometry = new THREE.BoxGeometry(1.005, 1.005, 1.005)
  const previewMaterial = new THREE.MeshBasicMaterial({ color: '#8effe6', transparent: true, opacity: 0.32, depthWrite: false })
  const preview = new THREE.Mesh(previewGeometry, previewMaterial); preview.visible = false; group.add(preview)
  const outlineGeometry = new THREE.EdgesGeometry(previewGeometry)
  const outlineMaterial = new THREE.LineBasicMaterial({ color: '#ffffff' })
  const outline = new THREE.LineSegments(outlineGeometry, outlineMaterial); group.add(outline); outline.visible = false

  const teleport = p => {
    player.setFlight(null)
    for (const k of Object.keys(player.control)) player.control[k] = false
    player.teleport(p.x, p.y, p.z, p.yaw)
    worldView.updatePosition(player.position)
  }
  const result = ({ won, elapsed, best, count }) => {
    save()
    hud.openPanel(`<h3>${won ? 'All crystals found!' : 'Time’s up!'}</h3><p>${count} / 10 crystals · ${clock(elapsed)}</p><p>Personal best: ${best === null ? 'Complete a hunt to set a record' : clock(best)} · Saved in this browser when storage is available.</p><div class="row"><button data-replay>Play again</button><button data-close>Explore campus</button></div>`)
    hud.panel.querySelector('[data-replay]').addEventListener('click', startHunt)
  }
  const hunt = createHunt({ ...huntMeta, best: saved.best, onFinish: result, onCollect: () => hud.toast('Crystal found!') })
  function startHunt () {
    hud.closePanel(); teleport(huntMeta.start); creative = false; hunt.start()
    hud.toast('Find all 10 crystals in 3 minutes. Follow the direction hint!')
  }
  const toggleFlight = () => {
    if (!creative) return
    if (!player.flying && !inside({ x: Math.floor(player.position.x), y: plot.min.y, z: Math.floor(player.position.z) }, plot)) {
      hud.toast('Step inside the glowing plot border to fly.'); return
    }
    player.setFlight(player.flying ? null : plot)
  }
  const actions = {
    hunt: startHunt,
    creative: () => { hud.closePanel(); hunt.cancel(); teleport(plot.entry); creative = true; hud.toast('Your personal plot. Walk inside the border to build and fly.') },
    home: () => { hud.closePanel(); hunt.cancel(); teleport(plot.returnPoint); creative = false },
    help: () => hud.handleKey({ code: 'KeyH' }),
    flight: toggleFlight,
    undo: () => { if (!building.history()) hud.toast('Nothing to undo, or move away from the block first.') },
    redo: () => { if (!building.history(true)) hud.toast('Nothing to redo, or move away from the block first.') },
    clear: () => {
      hud.openPanel('<h3>Clear your creative plot?</h3><p>Removes all your placed blocks. The empty plot will be saved in this browser. You can undo this during this session.</p><div class="row"><button data-close>Keep building</button><button data-confirm>Clear plot</button></div>')
      hud.panel.querySelector('[data-confirm]').addEventListener('click', () => { building.clear(); hud.closePanel() })
    }
  }
  const choose = index => {
    selected = (index + MATERIALS.length) % MATERIALS.length
    root.querySelectorAll('[data-material]').forEach((b, i) => b.setAttribute('aria-pressed', String(i === selected)))
  }
  const edit = kind => {
    if (!creative || !canAct()) return false
    refreshTarget()
    const p = kind === 'place' ? target?.adjacent : target?.block
    if (!building.edit(p, kind === 'place' ? MATERIALS[selected][0] : null)) hud.toast('Aim within 6 blocks. Build inside the border, clear of yourself.')
    return true
  }
  const onClick = e => {
    if (hud.panelOpen()) return
    const button = e.target.closest('button'); if (!button) return
    if (button.dataset.material !== undefined) choose(Number(button.dataset.material))
    if (button.dataset.do) actions[button.dataset.do]?.()
    if (button.dataset.edit) edit(button.dataset.edit)
  }
  root.addEventListener('click', onClick)
  const releases = []
  for (const button of root.querySelectorAll('[data-hold]')) {
    const down = e => {
      if (!canAct()) return
      e.preventDefault(); button.setPointerCapture(e.pointerId); player.control[button.dataset.hold] = true
    }
    const up = () => { player.control[button.dataset.hold] = false }
    button.addEventListener('pointerdown', down); button.addEventListener('pointerup', up); button.addEventListener('pointercancel', up); button.addEventListener('lostpointercapture', up)
    releases.push(up)
  }
  const direction = new THREE.Vector3()
  function refreshTarget () {
    // Compute directly from player orientation, including mouse movement since the last rendered frame.
    direction.set(-Math.sin(player.yaw) * Math.cos(player.pitch), Math.sin(player.pitch), -Math.cos(player.yaw) * Math.cos(player.pitch))
    target = traceVoxel({ x: player.position.x, y: player.position.y + 1.62, z: player.position.z }, direction, getBlock)
  }
  const onVisibility = () => { if (document.hidden) persistence.flush() }
  const onPageHide = () => persistence.flush()
  document.addEventListener('visibilitychange', onVisibility); window.addEventListener('pagehide', onPageHide)
  return {
    interact () {
      if (Math.hypot(player.position.x - huntMeta.start.x, player.position.z - huntMeta.start.z) < 2.5 && Math.abs(player.position.y - huntMeta.start.y) < 2 && hunt.state !== 'running') { startHunt(); return true }
      return false
    },
    action: button => creative && (button === 0 || button === 2) ? edit(button === 0 ? 'remove' : 'place') : false,
    scroll: delta => { if (!creative) return false; choose(selected + Math.sign(delta)); return true },
    key (e) {
      if (!creative || !canAct() || e.repeat) return false
      if (/^Digit[1-9]$/.test(e.code)) { choose(Number(e.code.slice(5)) - 1); e.preventDefault(); return true }
      if (e.code === 'KeyF') { toggleFlight(); e.preventDefault(); return true }
      if ((e.ctrlKey || e.metaKey) && ['KeyZ', 'KeyY'].includes(e.code)) { building.history(e.code === 'KeyY' || e.shiftKey); e.preventDefault(); return true }
      return false
    },
    update (dt, now, paused) {
      if (disposed) return
      const pos = player.position
      const nearPlot = pos.x >= plot.min.x - 3 && pos.x <= plot.max.x + 3 && pos.z >= plot.min.z - 3 && pos.z <= plot.max.z + 3
      if (nearPlot && !creative) { hunt.cancel(); creative = true }
      if (!nearPlot && creative) { creative = false; player.setFlight(null) }
      if (pos.y < meta.ground - 8) teleport(creative ? plot.entry : meta.spawn)
      hunt.update(dt, pos, paused)
      for (const c of crystals) {
        c.mesh.visible = hunt.state === 'running' && !hunt.collected.has(c.id)
        c.mesh.rotation.y = now * 0.001; c.mesh.position.y = c.y + 1 + Math.sin(now * 0.003 + Number(c.id)) * 0.12
      }
      el('.mc-buildbar').hidden = !creative
      el('.mc-quest').hidden = creative
      root.classList.toggle('is-creative', creative)
      el('[data-do="flight"]').textContent = `Flight: ${player.flying ? 'on' : 'off'}`
      el('[data-do="undo"]').disabled = !building.canUndo(); el('[data-do="redo"]').disabled = !building.canRedo()
      el('[data-selected]').textContent = `${MATERIALS[selected][1]} · ${isTouch ? 'Aim, then tap Place / Remove' : 'Left remove · Right place · F fly'}`
      el('[data-title]').textContent = hunt.state === 'running' ? `CRYSTAL HUNT ${paused ? '· PAUSED' : ''}` : 'EXPLORE & PLAY'
      el('[data-progress]').textContent = hunt.state === 'running' ? `${hunt.collected.size} / 10 crystals · ${clock(hunt.remaining)} remaining` : `10 crystals · 3 minutes · Best: ${hunt.best === null ? '—' : clock(hunt.best)}`
      const nearest = hunt.nearest(pos)
      if (hunt.state === 'running' && nearest) {
        const angle = Math.atan2(-(nearest.x - pos.x), -(nearest.z - pos.z)) - player.yaw
        const dirs = ['Ahead ↑', 'Left ↖', 'Left ←', 'Behind ↙', 'Behind ↓', 'Behind ↘', 'Right →', 'Right ↗']
        const index = ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8
        el('[data-direction]').textContent = `${dirs[index]} · ${Math.round(Math.hypot(nearest.x - pos.x, nearest.z - pos.z))} blocks to nearest crystal`
      } else el('[data-direction]').textContent = 'Start a hunt or build something of your own.'
      preview.visible = outline.visible = false
      if (creative && !paused) {
        refreshTarget()
        const p = target?.adjacent
        if (p) {
          const valid = inside(p, plot) && !getBlock(p) && !overlapsPlayer(p, pos)
          preview.position.set(p.x + 0.5, p.y + 0.5, p.z + 0.5); previewMaterial.color.set(valid ? '#8effe6' : '#ff5d5d'); preview.visible = true
        }
        if (target) { const b = target.block; outline.position.set(b.x + 0.5, b.y + 0.5, b.z + 0.5); outline.visible = true }
      }
    },
    debug: () => ({ creative, flying: player.flying, hunt: hunt.state, collected: hunt.collected.size, elapsed: hunt.elapsed, blocks: building.placed.size, target }),
    dispose () {
      disposed = true; persistence.dispose(); releases.forEach(fn => fn()); root.remove(); group.removeFromParent()
      crystalGeometry.dispose(); crystalMaterial.dispose(); previewGeometry.dispose(); previewMaterial.dispose(); outlineGeometry.dispose(); outlineMaterial.dispose()
      textures.forEach(t => t.dispose()); labelMaterials.forEach(m => m.dispose())
      document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('pagehide', onPageHide)
    }
  }
}
