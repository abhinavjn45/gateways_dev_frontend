import { Vec3 } from 'vec3'

/**
 * Keyboard/mouse/touch input plus authentic Minecraft movement via
 * prismarine-physics. The physics engine expects a mineflayer-shaped bot, so
 * we hand it the minimum viable stand-in.
 */
export function createPlayer ({ mcData, world, Block, Physics, PlayerState, spawn, version }) {
  // prismarine-world v3 is async: world.getBlock returns a Promise, and physics
  // silently breaks on that (block.shapes is undefined). It needs the sync view.
  // Columns outside the loaded radius come back null, so substitute air rather
  // than letting the simulation see a hole.
  const air = Block.fromStateId(0, 0)
  const physicsWorld = {
    getBlock (pos) {
      const b = world.sync.getBlock(pos)
      if (b && b.shapes) return b
      air.position = pos.floored ? pos.floored() : pos
      return air
    }
  }
  const physics = Physics(mcData, physicsWorld)

  const bot = {
    version,
    jumpTicks: 0,
    jumpQueued: false,
    fireworkRocketDuration: 0,
    entity: {
      position: new Vec3(spawn.x, spawn.y, spawn.z),
      velocity: new Vec3(0, 0, 0),
      onGround: false,
      isInWater: false,
      isInLava: false,
      isInWeb: false,
      isCollidedHorizontally: false,
      isCollidedVertically: false,
      elytraFlying: false,
      yaw: spawn.yaw ?? 0,
      pitch: 0,
      attributes: {},
      effects: {}
    },
    inventory: { slots: [] }
  }

  const control = {
    forward: false,
    back: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
    sneak: false
  }

  let flightBounds = null

  /**
   * Where the player was at the START of the last physics tick. The renderer
   * draws the camera between this and the current position, so movement that
   * happens in 50 ms steps is shown as a glide rather than a hop every third
   * frame. Reset on teleport so a jump across the map is not smeared.
   */
  const prev = bot.entity.position.clone()

  return {
    bot,
    get flying () { return Boolean(flightBounds) },
    setFlight (bounds) { flightBounds = bounds; bot.entity.velocity.set(0, 0, 0) },
    control,
    physics,
    PlayerState,

    get position () { return bot.entity.position },
    get prevPosition () { return prev },
    get yaw () { return bot.entity.yaw },
    get pitch () { return bot.entity.pitch },

    /** One 50 ms physics tick. */
    tick () {
      prev.update(bot.entity.position)
      if (flightBounds) {
        const p = bot.entity.position, yaw = bot.entity.yaw
        const f = Number(control.forward) - Number(control.back), r = Number(control.right) - Number(control.left)
        const norm = Math.max(1, Math.hypot(f, r)), speed = control.sprint ? 0.6 : 0.35
        const delta = { x: (-Math.sin(yaw) * f + Math.cos(yaw) * r) * speed / norm,
          z: (-Math.cos(yaw) * f - Math.sin(yaw) * r) * speed / norm,
          y: (Number(control.jump) - Number(control.sneak)) * speed }
        for (const axis of ['x', 'y', 'z']) {
          const candidate = p.clone(); candidate[axis] += delta[axis]
          candidate.x = Math.max(flightBounds.min.x + 0.3, Math.min(flightBounds.max.x + 0.7, candidate.x))
          candidate.z = Math.max(flightBounds.min.z + 0.3, Math.min(flightBounds.max.z + 0.7, candidate.z))
          candidate.y = Math.max(flightBounds.min.y, Math.min(flightBounds.max.y + 2, candidate.y))
          let collision = false
          for (let x = Math.floor(candidate.x - 0.299); x <= Math.floor(candidate.x + 0.299); x++)
            for (let z = Math.floor(candidate.z - 0.299); z <= Math.floor(candidate.z + 0.299); z++)
              for (let y = Math.floor(candidate.y + 0.001); y <= Math.floor(candidate.y + 1.799); y++)
                if (physicsWorld.getBlock(new Vec3(x, y, z)).shapes.length) collision = true
          if (!collision) p.update(candidate)
        }
        bot.entity.velocity.set(0, 0, 0)
        return
      }
      const state = new PlayerState(bot, control)
      physics.simulatePlayer(state, physicsWorld).apply(bot)
      // auto-jump: nudge over single-block ledges while walking into them
      if (bot.entity.isCollidedHorizontally && bot.entity.onGround && !control.jump) {
        bot.jumpQueued = true
      }
    },

    teleport (x, y, z, yaw) {
      bot.entity.position.set(x, y, z)
      prev.set(x, y, z)
      bot.entity.velocity.set(0, 0, 0)
      if (typeof yaw === 'number') { bot.entity.yaw = yaw; bot.entity.pitch = 0 }
    },

    look (dYaw, dPitch) {
      bot.entity.yaw -= dYaw
      bot.entity.pitch = Math.max(-Math.PI / 2 + 0.001,
        Math.min(Math.PI / 2 - 0.001, bot.entity.pitch - dPitch))
    }
  }
}

const KEY_MAP = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  Space: 'jump',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
  ControlLeft: 'sprint', ControlRight: 'sprint'
}

const isTypingTarget = el => !!(el && el.nodeType === 1 && el.matches(
  'input,textarea,select,[contenteditable="true"],[role="textbox"]'
))

/**
 * Attaches keyboard, pointer-lock mouse look and touch controls.
 *
 * The initial click captures the mouse. Captured clicks route to contextual actions.
 *
 * `setEnabled(false)` is what a modal calls: it clears every held key and
 * ignores input until re-enabled, so the player does not keep walking behind
 * an open dialog.
 */
export function attachInput ({ player, canvas, container, onInteract, onKey, onAction, onScroll, canAct = () => true }) {
  const control = player.control
  const disposers = []
  let enabled = true
  const on = (target, evt, fn, opts) => {
    target.addEventListener(evt, fn, opts)
    disposers.push(() => target.removeEventListener(evt, fn, opts))
  }
  const clearControl = () => { for (const k of Object.keys(control)) control[k] = false }

  // ------------------------------------------------------------- keyboard
  on(window, 'keydown', e => {
    if (isTypingTarget(document.activeElement)) return
    // While a React modal owns the screen, nothing here should react — not
    // even H for the guide, which would stack a second overlay on top.
    if (!enabled) return
    if (onKey && onKey(e)) return
    if (!canAct()) return
    const action = KEY_MAP[e.code]
    if (action) { control[action] = true; e.preventDefault() }
    if (e.code === 'KeyE' || e.code === 'Enter') {
      e.preventDefault()
      onInteract?.()
    }
  })
  on(window, 'keyup', e => {
    const action = KEY_MAP[e.code]
    if (action) { control[action] = false; e.preventDefault() }
  })
  // never leave a key stuck down when the tab loses focus
  on(window, 'blur', clearControl)

  // ----------------------------------------------------------- mouse look
  const SENS = 0.0022
  on(canvas, 'click', () => {
    if (!enabled) return
    if (document.pointerLockElement !== canvas) {
      // Chrome returns a promise that rejects if the lock is requested too
      // soon after Esc; a rejected lock is not an error worth surfacing.
      const r = canvas.requestPointerLock?.()
      if (r && typeof r.catch === 'function') r.catch(() => {})
    }
  })
  on(document, 'mousemove', e => {
    if (!enabled) return
    if (document.pointerLockElement !== canvas) return
    player.look(e.movementX * SENS, e.movementY * SENS)
  })
  on(canvas, 'mousedown', e => {
    if (!enabled) return
    if (document.pointerLockElement !== canvas) return
    e.preventDefault()
    if (!canAct()) return
    if (onAction?.(e.button)) return
    if (e.button === 2) onInteract?.()
  })
  on(canvas, 'wheel', e => { if (enabled && canAct() && onScroll?.(e.deltaY)) e.preventDefault() }, { passive: false })
  on(document, 'pointerlockchange', () => { if (document.pointerLockElement !== canvas) clearControl() })
  on(canvas, 'contextmenu', e => e.preventDefault())

  // --------------------------------------------------------------- touch
  // A left-hand virtual stick for movement; dragging anywhere else looks
  // around. Sized generously so it works on small phones.
  const touch = { moveId: null, lookId: null, ox: 0, oy: 0, lx: 0, ly: 0 }
  const stick = document.createElement('div')
  stick.className = 'mc-joystick'
  stick.innerHTML = '<i></i>'
  stick.style.display = 'none'
  container.appendChild(stick)
  disposers.push(() => stick.remove())

  const isTouch = matchMedia('(hover: none) and (pointer: coarse)').matches
  if (isTouch) stick.style.display = 'block'

  const setStick = (dx, dy) => {
    const knob = stick.firstElementChild
    const r = 42
    const d = Math.hypot(dx, dy) || 1
    const s = Math.min(1, d / r)
    knob.style.transform = `translate(${(dx / d) * s * r}px, ${(dy / d) * s * r}px)`
    const nx = (dx / d) * s
    const ny = (dy / d) * s
    control.forward = ny < -0.3
    control.back = ny > 0.3
    control.left = nx < -0.3
    control.right = nx > 0.3
    control.sprint = s > 0.85
  }

  const clearStick = () => {
    stick.firstElementChild.style.transform = ''
    control.forward = control.back = control.left = control.right = control.sprint = false
  }

  // Touches that start on HUD buttons (the hub button, the guide) belong to them.
  const onHud = e => !!(e.target && e.target.closest && e.target.closest('button, a, .mc-panel-overlay'))

  on(container, 'touchstart', e => {
    if (!enabled || !canAct() || onHud(e)) return
    const rect = container.getBoundingClientRect()
    for (const t of e.changedTouches) {
      const left = t.clientX < rect.left + rect.width * 0.45
      if (left && touch.moveId === null) {
        touch.moveId = t.identifier
        touch.ox = t.clientX; touch.oy = t.clientY
        stick.style.left = `${t.clientX - rect.left}px`
        stick.style.top = `${t.clientY - rect.top}px`
        stick.classList.add('active')
      } else if (!left && touch.lookId === null) {
        touch.lookId = t.identifier
        touch.lx = t.clientX; touch.ly = t.clientY
      }
    }
  }, { passive: true })

  on(container, 'touchmove', e => {
    if (!enabled || !canAct()) return
    for (const t of e.changedTouches) {
      if (t.identifier === touch.moveId) {
        setStick(t.clientX - touch.ox, t.clientY - touch.oy)
      } else if (t.identifier === touch.lookId) {
        player.look((t.clientX - touch.lx) * 0.006, (t.clientY - touch.ly) * 0.006)
        touch.lx = t.clientX; touch.ly = t.clientY
      }
    }
  }, { passive: true })

  const endTouch = e => {
    for (const t of e.changedTouches) {
      if (t.identifier === touch.moveId) { touch.moveId = null; clearStick(); stick.classList.remove('active') }
      if (t.identifier === touch.lookId) touch.lookId = null
    }
  }
  on(container, 'touchend', endTouch, { passive: true })
  on(container, 'touchcancel', endTouch, { passive: true })

  return {
    isTouch,
    clear: clearControl,
    setEnabled (next) {
      enabled = Boolean(next)
      if (!enabled) {
        clearControl()
        clearStick()
        stick.classList.remove('active')
        touch.moveId = touch.lookId = null
      }
    },
    dispose () { for (const d of disposers) d() }
  }
}
