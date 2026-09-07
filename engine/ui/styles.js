/** The engine ships its own CSS so it stays independent of the Next bundle.
 *  It borrows the site's pixel font through the CSS variable next/font sets on
 *  <html>, and falls back to a monospace stack when it is not there. */
const CSS = `
.mc-world-root { position: absolute; inset: 0; overflow: hidden; touch-action: none; background: #8fc0f0; }
.mc-world-root canvas { display: block; width: 100%; height: 100%; }

.mc-hud, .mc-hud * { font-family: var(--font-press-start), ui-monospace, monospace; }
.mc-hud {
  position: absolute; inset: 0; pointer-events: none;
  color: #fff; text-shadow: 2px 2px 0 rgba(0,0,0,0.45); z-index: 5;
}
.mc-hud button { pointer-events: auto; font-family: inherit; }

.mc-crosshair {
  position: absolute; left: 50%; top: 50%; width: 20px; height: 20px;
  margin: -10px 0 0 -10px; opacity: 0.85; mix-blend-mode: difference;
}
.mc-crosshair::before, .mc-crosshair::after {
  content: ''; position: absolute; background: #fff;
}
.mc-crosshair::before { left: 9px; top: 2px; width: 2px; height: 16px; }
.mc-crosshair::after  { top: 9px; left: 2px; height: 2px; width: 16px; }

.mc-status {
  position: absolute; left: 10px; top: 10px; font-size: 10px; line-height: 1.8;
}
.mc-status .depth { color: #7efc20; }

.mc-capture {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, 40px);
  background: rgba(12,12,14,0.78); padding: 8px 14px; font-size: 9px;
  opacity: 0; transition: opacity 200ms ease; white-space: nowrap;
}
.mc-capture.show { opacity: 1; }

.mc-hint {
  position: absolute; left: 50%; bottom: 26px; transform: translateX(-50%);
  background: rgba(12,12,14,0.86); border-left: 4px solid #7efc20;
  padding: 10px 14px; font-size: 10px; line-height: 1.6; color: #fff;
  border-top: 0; border-right: 0; border-bottom: 0; cursor: pointer;
  opacity: 0; transition: opacity 200ms ease; white-space: nowrap; max-width: 92vw;
  overflow: hidden; text-overflow: ellipsis; text-shadow: 2px 2px 0 rgba(0,0,0,0.45);
}
.mc-hint.show { opacity: 1; }
.mc-hint:active { transform: translateX(-50%) translateY(1px); }

.mc-toast {
  position: absolute; left: 50%; top: 14px; transform: translate(-50%, -12px);
  background: rgba(12,12,14,0.92); border-left: 4px solid #ffd94a;
  padding: 8px 14px; font-size: 9px; opacity: 0;
  transition: opacity 280ms ease, transform 280ms ease;
}
.mc-toast.show { opacity: 1; transform: translate(-50%, 0); }

.mc-panel-overlay {
  position: absolute; inset: 0; display: none; align-items: center;
  justify-content: center; background: rgba(0,0,0,0.55); pointer-events: auto;
  padding: 16px; z-index: 6;
}
.mc-panel-overlay.show { display: flex; }
.mc-panel-box {
  background: rgba(16,16,20,0.97); max-width: min(680px, 94vw);
  max-height: 84vh; overflow-y: auto; padding: 22px; color: #fff;
  box-shadow: inset 0 2px 0 rgba(255,255,255,.12), inset 0 -2px 0 rgba(0,0,0,.55), 0 18px 48px rgba(0,0,0,.55);
}
.mc-panel-box h3 { margin: 0 0 6px; font-size: 13px; }
.mc-panel-box p  { font-size: 10px; line-height: 1.8; opacity: .82; margin: 8px 0; }
.mc-panel-box .row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
.mc-panel-box button {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 38px; padding: 0 14px; background: #999; color: #fff;
  border: none; cursor: pointer; font-size: 10px; text-decoration: none;
  text-shadow: 2px 2px 0 rgba(0,0,0,.45);
  box-shadow: inset 0 2px 0 rgba(255,255,255,.45), inset 0 -3px 0 rgba(0,0,0,.4);
}
.mc-panel-box button:hover { background: #a8b6c8; color: #ffd94a; }

.mc-guide dl { display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; font-size: 9px; line-height: 1.6; }
.mc-guide dt { color: #ffd94a; }
.mc-guide dd { margin: 0; opacity: .8; }
.mc-guide .credit { font-size: 8px; opacity: .55; margin-top: 14px; }

.mc-joystick {
  position: absolute; width: 108px; height: 108px; margin: -54px 0 0 -54px;
  border-radius: 50%; background: rgba(255,255,255,0.10);
  border: 2px solid rgba(255,255,255,0.22); pointer-events: none;
  opacity: 0; transition: opacity 160ms ease; z-index: 6;
}
.mc-joystick.active { opacity: 1; }
.mc-joystick i {
  position: absolute; left: 50%; top: 50%; width: 44px; height: 44px;
  margin: -22px 0 0 -22px; border-radius: 50%; background: rgba(255,255,255,0.55);
}

@media (hover: none) and (pointer: coarse) {
  .mc-crosshair { opacity: 0.5; }
  .mc-capture { display: none; }
  .mc-hint { bottom: 96px; padding: 14px 18px; }
}
`

let injected = false
export function injectStyles () {
  if (injected || typeof document === 'undefined') return
  const el = document.createElement('style')
  el.id = 'mc-gateways-engine-styles'
  el.textContent = CSS
  document.head.appendChild(el)
  injected = true
}
