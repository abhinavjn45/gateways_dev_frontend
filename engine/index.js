/**
 * Standalone voxel engine for the Gateways campus.
 *
 * Deliberately NOT part of the Next.js bundle: it is several megabytes and only
 * the 3D view needs it, so the site injects it as a separate versioned script
 * that exposes window.McGateways. Built by scripts/mc/build-engine.mjs.
 *
 * Exploration only. There is no block breaking or placing anywhere in here;
 * the single "use" action opens the event hub of the classroom you stand in.
 */
import * as THREE from 'three'
import { Vec3 } from 'vec3'
import { Schematic } from 'prismarine-schematic'
import mcDataLoader from 'minecraft-data'
import WorldLoader from 'prismarine-world'
import ChunkLoader from 'prismarine-chunk'
import BlockLoader from 'prismarine-block'
import { Physics, PlayerState } from 'prismarine-physics'
import { Viewer } from 'prismarine-viewer/viewer/lib/viewer'
import { WorldView } from 'prismarine-viewer/viewer/lib/worldView'

import { assetBase, versionQuery, fetchMaybeGzip, fetchJson, fetchBuffer } from './util/net.js'
import { createSchematicWorld } from './world/schematicWorld.js'
import { createPlayer, attachInput } from './player/controller.js'
import { injectStyles } from './ui/styles.js'
import { createHud } from './ui/hud.js'
import { createRoomProps } from './props/rooms.js'
import { createMultiplayer } from './net/multiplayer.js'

const TICK_MS = 50
const EYE_HEIGHT = 1.62
// The mesher indexes chunk sections from y = 0, which is only true up to 1.17.
// Never fall back to anything newer here.
const DEFAULT_VERSION = '1.17.1'

/**
 * The mesher worker is a separate multi-megabyte bundle. We fetch it gzipped,
 * inflate it in the browser and hand prismarine-viewer a Blob URL, because its
 * WorldRenderer hardcodes `new Worker('worker.js')`.
 */
async function installWorker (base, q, onStatus) {
  onStatus?.('Downloading renderer...')
  const manifest = await fetchJson(base + 'worker.parts.json' + q, 'worker manifest')
  if (manifest.version !== 2 || manifest.source !== 'worker.js') {
    throw new Error('unexpected worker manifest')
  }
  const bytes = await fetchMaybeGzip(base + manifest.asset.path.replace(/\.gz$/, '') + q, 'worker')
  const blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/javascript' }))

  const RealWorker = window.Worker
  window.Worker = class PatchedWorker extends RealWorker {
    constructor (src, opts) {
      super(src === 'worker.js' ? blobUrl : src, opts)
      // worker exceptions are invisible from the page unless we listen
      this.addEventListener('error', e => {
        console.error('[mesher worker]', e.message || e, e.filename, e.lineno)
      })
    }
  }
  return () => {
    window.Worker = RealWorker
    URL.revokeObjectURL(blobUrl)
  }
}

/** three.js looks down -Z at yaw 0, so facing (dx, dz) is yaw = atan2(-dx, -dz). */
const yawToward = (from, to) => Math.atan2(-(to.x - from.x), -(to.z - from.z))

/** The site's pixel font, if next/font has put it on <html>. */
function pixelFontFamily () {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--font-press-start').trim()
    return v ? `${v}, ui-monospace, monospace` : ''
  } catch {
    return ''
  }
}

async function start ({ container, config, playerName, meta: metaIn, bindings, spawnRoom, onOpenEvent, onStatus, onProgress }) {
  const status = m => { try { onStatus?.(m) } catch { /* ignore */ } }
  const progress = t => { try { onProgress?.(Math.max(0, Math.min(1, t))) } catch { /* ignore */ } }

  const base = assetBase()
  const q = versionQuery()
  const strings = config?.status || {}
  const version = config?.world?.version || DEFAULT_VERSION

  injectStyles()
  container.classList.add('mc-world-root')

  const disposers = []
  const cleanup = () => { while (disposers.length) { try { disposers.pop()() } catch { /* ignore */ } } }

  try {
    // ------------------------------------------------------------- assets
    progress(0.02)
    const restoreWorker = await installWorker(base, q, status)
    disposers.push(restoreWorker)
    progress(0.16)

    status(strings.readingSchematic || 'Reading the campus...')
    const [meta, schemBytes, blockStatesBytes] = await Promise.all([
      metaIn ? Promise.resolve(metaIn) : fetchJson(base + 'world.meta.json' + q, 'world meta'),
      fetchBuffer(base + (config?.world?.schematic || 'world.schem') + q, 'schematic'),
      fetchMaybeGzip(base + `blocksStates/${version}.json` + q, 'blocksStates')
    ])
    progress(0.3)

    const blockStates = JSON.parse(new TextDecoder().decode(blockStatesBytes))
    const schematic = await Schematic.read(Buffer.from(schemBytes), version)
    progress(0.38)

    const sizeLabel = `${schematic.size.x}x${schematic.size.y}x${schematic.size.z}`
    status((strings.buildingWorld || 'Campus {size} decoded. Building terrain...').replace('{size}', sizeLabel))

    // -------------------------------------------------------------- world
    const mcData = mcDataLoader(version)
    const World = WorldLoader(version)
    const Chunk = ChunkLoader(version)
    const Block = BlockLoader(version)

    const world = createSchematicWorld({ schematic, World, Chunk })
    progress(0.46)

    // ------------------------------------------------------------ renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance'
    })
    const tier = navigator.hardwareConcurrency || 4
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier <= 4 ? 1 : 1.5))
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight)
    container.appendChild(renderer.domElement)
    disposers.push(() => { renderer.domElement.remove(); renderer.dispose() })

    const viewer = new Viewer(renderer)
    viewer.world.texturesDataUrl = base + `textures/${version}.png` + q
    viewer.world.blockStatesData = blockStates
    if (!viewer.setVersion(version)) throw new Error(`version ${version} is not supported by the renderer`)
    viewer.scene.background = new THREE.Color('#8fc0f0')
    viewer.scene.fog = new THREE.Fog('#b9d6f2', 70, 190)

    viewer.ambientLight.intensity = 1.1
    viewer.directionalLight.intensity = 0.6
    disposers.push(() => viewer.resetAll())

    status(strings.lighting || 'Sky and block lighting ready')
    progress(0.55)

    // -------------------------------------------------------------- player
    const rooms = meta.rooms || []
    const roomSpawn = index => {
      const r = rooms[index]
      if (!r?.door?.outside) return null
      const o = r.door.outside
      return { x: o.x, y: o.y, z: o.z, yaw: yawToward(o, r.centre || r.door) }
    }
    const spawn = (typeof spawnRoom === 'number' && roomSpawn(spawnRoom)) || meta.spawn || { x: 0.5, y: 2, z: 0.5, yaw: 0 }
    const player = createPlayer({ mcData, world, Block, Physics, PlayerState, spawn, version })

    const viewDistance = Math.max(2, Math.min(8, meta.renderDistance ?? config?.world?.renderDistance ?? 4))
    const worldView = new WorldView(world, viewDistance, new Vec3(spawn.x, spawn.y, spawn.z))
    viewer.listen(worldView)

    status(strings.terrain || 'Rendering nearby terrain...')
    await worldView.init(new Vec3(spawn.x, spawn.y, spawn.z))
    progress(0.82)

    // --------------------------------------------------------------- input
    const isTouch = matchMedia('(hover: none) and (pointer: coarse)').matches

    // --------------------------------------------------------------- props
    status(strings.props || 'Hanging the event signs...')
    try { await document.fonts?.ready } catch { /* fonts are optional */ }
    const props = createRoomProps({
      scene: viewer.scene,
      THREE,
      meta,
      bindings,
      config,
      fontFamily: pixelFontFamily(),
      isTouch,
      onOpenEvent
    })
    disposers.push(() => props.dispose())
    progress(0.92)

    // ----------------------------------------------------------------- HUD
    const hud = createHud({ container, config, playerName, canvas: renderer.domElement, isTouch })
    disposers.push(() => hud.dispose())

    const interact = () => {
      if (hud.panelOpen()) return
      const n = props.nearest()
      if (n) n.open()
    }
    hud.onInteract = interact

    const input = attachInput({
      player,
      canvas: renderer.domElement,
      container,
      onInteract: interact,
      onKey: e => hud.handleKey(e)
    })
    disposers.push(() => input.dispose())

    // -------------------------------------------------------- multiplayer
    const mp = createMultiplayer()
    disposers.push(() => mp.dispose())

    // ------------------------------------------------------------ resizing
    const resize = () => {
      const w = container.clientWidth || window.innerWidth
      const h = container.clientHeight || window.innerHeight
      renderer.setSize(w, h)
      viewer.camera.aspect = w / h
      viewer.camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', resize)
    disposers.push(() => window.removeEventListener('resize', resize))
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
    ro?.observe(container)
    disposers.push(() => ro?.disconnect())
    resize()

    // --------------------------------------------------------- render loop
    let raf = 0
    let acc = 0
    let last = performance.now()
    let lastChunkUpdate = 0
    let running = true

    const frame = now => {
      if (!running) return
      raf = requestAnimationFrame(frame)
      const dt = Math.min(200, now - last)
      last = now

      // fixed 50 ms physics step, matching Minecraft's tick rate
      acc += dt
      let steps = 0
      while (acc >= TICK_MS && steps < 5) { player.tick(); acc -= TICK_MS; steps++ }

      const pos = player.position
      // Upstream's setFirstPersonCamera allocates a fresh TWEEN every frame and
      // never settles, leaving the camera at the origin. Drive it directly.
      viewer.camera.position.set(pos.x, pos.y + EYE_HEIGHT, pos.z)
      viewer.camera.rotation.set(player.pitch, player.yaw, 0, 'ZYX')
      props.update(pos, now)
      mp.update(pos, now, player.yaw, player.pitch)
      hud.update(pos, props.nearest())

      if (now - lastChunkUpdate > 250) {
        lastChunkUpdate = now
        worldView.updatePosition(pos)
      }

      viewer.update()
      renderer.render(viewer.scene, viewer.camera)

      // lightweight introspection hook for manual and automated checks
      window.__mcDebug = {
        position: { x: pos.x, y: pos.y, z: pos.z },
        yaw: player.yaw,
        pitch: player.pitch,
        onGround: player.bot.entity.onGround,
        meshCount: Object.keys(viewer.world.sectionMeshs || {}).length,
        loadedChunks: Object.keys(viewer.world.loadedChunks || {}).length,
        nearest: props.nearest()?.hint || null
      }
    }
    raf = requestAnimationFrame(frame)
    disposers.push(() => { running = false; cancelAnimationFrame(raf) })

    status(strings.ready || 'Ready')
    progress(1)

    return {
      dispose () {
        cleanup()
        container.classList.remove('mc-world-root')
      },
      /** A React modal is open: release the mouse and freeze the player. */
      setUiOpen (open) {
        input.setEnabled(!open)
        hud.setUiOpen(open)
        if (open) document.exitPointerLock?.()
      },
      teleportToRoom (index) {
        const s = roomSpawn(index)
        if (!s) return false
        player.teleport(s.x, s.y, s.z, s.yaw)
        worldView.updatePosition(player.position)
        return true
      },
      setBindings (next) { props.setBindings(next) },
      toast (text) { hud.toast(text) }
    }
  } catch (err) {
    cleanup()
    container.classList.remove('mc-world-root')
    throw err
  }
}

const api = { start, version: '1' }
if (typeof window !== 'undefined') window.McGateways = api
export default api
