/** In-world HUD: crosshair, name and depth, the "press E" hint, toasts and the
 *  controls guide. Plain DOM on top of the canvas — cheap and accessible. */

const GUIDE_SEEN_KEY = 'mc-gateways:guide-seen'

export function createHud ({ container, config, playerName, canvas, isTouch }) {
  const ui = config?.ui || {}
  const controls = config?.controls || []

  const root = document.createElement('div')
  root.className = 'mc-hud'
  root.innerHTML = `
    <div class="mc-crosshair"></div>
    <div class="mc-status">
      <div>${escapeHtml(playerName || 'Player')}</div>
      <div class="depth">Y: <span data-depth>0</span></div>
    </div>
    <div class="mc-capture" data-capture>Click to look around · Esc releases the mouse</div>
    <button type="button" class="mc-hint" data-hint></button>
    <div class="mc-toast" data-toast></div>
    <div class="mc-panel-overlay" data-overlay><div class="mc-panel-box" data-panel></div></div>
  `
  container.appendChild(root)

  const depthEl = root.querySelector('[data-depth]')
  const hintEl = root.querySelector('[data-hint]')
  const toastEl = root.querySelector('[data-toast]')
  const captureEl = root.querySelector('[data-capture]')
  const overlay = root.querySelector('[data-overlay]')
  const panel = root.querySelector('[data-panel]')

  // -------------------------------------------------------------- toasts
  let toastTimer = 0
  const toast = text => {
    toastEl.textContent = text
    toastEl.classList.add('show')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400)
  }

  // -------------------------------------------------------------- panels
  const openPanel = html => {
    panel.innerHTML = html
    overlay.classList.add('show')
    document.exitPointerLock?.()
    panel.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closePanel))
  }
  const closePanel = () => { overlay.classList.remove('show'); panel.innerHTML = '' }
  const panelOpen = () => overlay.classList.contains('show')
  overlay.addEventListener('click', e => { if (e.target === overlay) closePanel() })

  const guideHtml = () => `
    <div class="mc-guide">
      <h3>Welcome to the campus</h3>
      <p>${escapeHtml(ui.shortcutsHeading || '')}</p>
      <dl>${controls.map(c => `<dt>${escapeHtml(c.keys)}</dt><dd>${escapeHtml(c.label)}</dd>`).join('')}</dl>
      <p>${escapeHtml(ui.shortcutsHint || '')}</p>
      <p class="credit">${escapeHtml(config?.credits || '')}</p>
      <div class="row"><button type="button" data-close>Close</button></div>
    </div>`

  // The hint doubles as the interact button on touch screens, where there is
  // no E key. On desktop it is still clickable, which does no harm.
  hintEl.addEventListener('click', () => api.onInteract?.())

  // ------------------------------------------------------------ keyboard
  /** Returns true when the key was consumed by the HUD. */
  const handleKey = e => {
    if (e.code === 'Escape') {
      if (panelOpen()) { closePanel(); return true }
      return false
    }
    if (e.code === 'KeyH') {
      if (panelOpen()) closePanel()
      else openPanel(guideHtml())
      return true
    }
    return false
  }

  // show the guide on the very first visit only; H brings it back any time
  let seen = false
  try { seen = localStorage.getItem(GUIDE_SEEN_KEY) === '1' } catch { /* private mode */ }
  if (!seen) {
    setTimeout(() => {
      openPanel(guideHtml())
      try { localStorage.setItem(GUIDE_SEEN_KEY, '1') } catch { /* ignore */ }
    }, 400)
  }

  let lastHint = ''
  const api = {
    onInteract: null,
    toast,
    openPanel,
    closePanel,
    panelOpen,
    handleKey,

    update (pos, nearest) {
      depthEl.textContent = String(Math.floor(pos.y))
      const hint = nearest?.hint || ''
      if (hint !== lastHint) {
        lastHint = hint
        hintEl.textContent = hint
        hintEl.classList.toggle('show', Boolean(hint))
      }
      const locked = document.pointerLockElement === canvas
      captureEl.classList.toggle('show', !locked && !isTouch && !panelOpen() && !root.classList.contains('mc-uiopen'))
    },

    setUiOpen (open) {
      root.classList.toggle('mc-uiopen', Boolean(open))
    },

    dispose () {
      clearTimeout(toastTimer)
      root.remove()
    }
  }

  return api
}

function escapeHtml (s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}
