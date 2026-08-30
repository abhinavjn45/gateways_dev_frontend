/**
 * The physics and the layout of a hanging sign, as pure functions.
 *
 * No three, no React, no time source of its own — every function takes elapsed
 * seconds or a 0..1 progress and returns a number. That is deliberate, and it
 * is the same split `lib/ambient/break-physics.ts` uses: the maths is the part
 * worth reasoning about, and it should not need a WebGL context to do it.
 *
 * IT ALSO OWNS THE LAYOUT, and that is the load-bearing decision in this
 * feature. A drei `<View>` is scissored to its own DOM box, so a board that
 * drops past the bottom of its row is CLIPPED — the row has to grow in exact
 * step with the fall. Two systems computing that independently would desync on
 * the first dropped frame. Instead both read `rowHeight()` and `rigOffsetY()`
 * from here, off the same progress value, in the same frame.
 *
 * WORLD UNITS. The canvas camera is orthographic, and drei sets its frustum to
 * the view's pixel rect, so one world unit would be one pixel. Everything below
 * is authored in "sign units" instead (board 5.85 wide, the proportions of a
 * real hanging sign) and the rig carries a `SCALE` factor. That keeps the
 * numbers readable and, because the camera is orthographic, means the sign
 * holds a constant on-screen size while its box grows — a perspective camera
 * with a fixed vertical FOV would instead show the same world height in a
 * 108px row as in a 520px one, and the sign would appear to shrink as it opened.
 */

// ─── Layout ─────────────────────────────────────────────────────────────────

/** Pixels per sign unit at full size. Board 5.85 units ≈ 560px wide. */
export const SCALE = 96;

/** Row width the sign is drawn for. Below this it scales down to fit. */
export const DESIGN_W = 760;

/** Units from the top of the row box down to the centre of the beam. */
export const TOP_PAD = 0.7;

/** Row height, in units, with the board parked behind the beam. */
export const CLOSED_UNITS = 1.4;

/**
 * Row height, in units, with the board down.
 *
 * Sized to the board's LOWEST REACHABLE point, not its resting one: rest bottom
 * (4.875) + bounce overshoot (0.40) + the corner dip from a full sway
 * (2.925 × sin 0.075 ≈ 0.22) + the top pad (0.55). A box sized to where the
 * board comes to rest would clip its corner on every bounce.
 */
export const OPEN_UNITS = 6.35;

/**
 * Board Y when parked out of sight.
 *
 * High enough that the board's BOTTOM edge clears the top of the row box, so
 * the scissor rectangle hides it completely. That is the whole reason there is
 * no mask geometry and no stencil buffer here: the view's own clip does it.
 */
export const HIDDEN_Y = 2.6;

/**
 * Board Y once it has come to rest on the chains.
 *
 * Set so the chains span 1.0 units — exactly two links, which is what a real
 * Minecraft hanging sign uses. An earlier value left the board hanging 0.25
 * units below the beam, close enough that there was no visible chain at all.
 */
export const REST_Y = -3.2;

export const BOARD_W = 5.85;
export const BOARD_H = 3.55;
export const BOARD_D = 0.58;

export const BEAM_W = 7.1;
export const BEAM_H = 0.95;
export const BEAM_D = 0.82;

/** Y of the beam's underside, where the chains hang from. */
export const BEAM_ANCHOR_Y = -BEAM_H / 2;

/**
 * Links per chain.
 *
 * Two at rest; the third exists only for the moment mid-drop when the board is
 * below its resting point on the first bounce.
 */
export const MAX_LINKS = 3;

/** X of each chain, and of the iron strap it runs behind. */
export const CHAIN_X = 2.7;

/** How wide the iron strap is, and how far it overhangs the beam. */
export const STRAP_W = 0.22;
export const STRAP_OVERHANG = 0.14;

/**
 * The width the question may occupy on the beam.
 *
 * DERIVED from where the straps are, not chosen. The straps are opaque iron
 * sitting in front of the beam face, so any text wider than the gap between
 * them is not "tight" — it is hidden, and the question reads as a sentence with
 * two words missing. Taking the number from `CHAIN_X` means moving a chain can
 * never silently start eating the type.
 */
export const BEAM_TEXT_W = 2 * (CHAIN_X - STRAP_W / 2) - 0.2;


/** Height of one link in the chain texture, in units. */
export const LINK_H = 0.5;

// ─── Timing ─────────────────────────────────────────────────────────────────

/** Seconds for the fall itself, before the bounce takes over. */
export const DROP_S = 1.15;

/**
 * Seconds to retract. Faster than the drop — going back up is not a fall.
 *
 * Both directions run through `easeInQuart`, read forwards and backwards.
 * Reversed, a quartic is fast at the start and slow at the end, which is
 * exactly right for a retract: the board is yanked up off the chains and then
 * eases into the beam. Halving the duration is what makes it read as pulled
 * rather than dropped.
 */
export const RAISE_S = 0.55;

/**
 * Seconds after the catch before the board counts as settled.
 *
 * Past this both decay terms are below a tenth of a pixel on screen, so the
 * render loop can stop entirely. Generous on purpose: stopping a frame early
 * shows as a snap, stopping one late costs nothing.
 */
export const SETTLE_S = 3.0;

// ─── Easing ─────────────────────────────────────────────────────────────────

/**
 * The fall.
 *
 * Quartic rather than linear or eased-out: a sign falling under gravity is
 * slowest at the start and fastest at the moment the chain catches it. An
 * ease-out would read as the board being lowered on a winch.
 */
export function easeInQuart(p: number): number {
  return p * p * p * p;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// ─── Layout maths ───────────────────────────────────────────────────────────

/**
 * How much the whole sign shrinks to fit a row narrower than it was drawn for.
 *
 * Floored at 0.55 rather than allowed to vanish: below that the baked text
 * stops resolving, and the phone breakpoint has already handed over to the
 * plain accordion long before it matters.
 */
export function fitFor(rowWidth: number): number {
  return clamp(rowWidth / DESIGN_W, 0.55, 1);
}

/** Row height in CSS pixels, for the current progress and row width. */
export function rowHeight(rowWidth: number, progress: number): number {
  const units = lerp(CLOSED_UNITS, OPEN_UNITS, clamp01(progress));
  return units * SCALE * fitFor(rowWidth);
}

/**
 * Where the rig sits so the beam holds still at `TOP_PAD` below the row's top
 * edge while the row grows downward beneath it.
 *
 * The box is centred on the camera, so its top edge in world units is half its
 * height. Note this is independent of the row's WIDTH — the fit factor cancels,
 * because it scales the box and the rig by the same amount. That is why the
 * overlay button in `faq-sign.tsx` can be positioned in plain CSS from the top
 * of the row and never needs touching per frame.
 */
export function rigOffsetY(progress: number): number {
  return lerp(CLOSED_UNITS, OPEN_UNITS, clamp01(progress)) / 2 - TOP_PAD;
}

// ─── Motion ─────────────────────────────────────────────────────────────────

/**
 * Where the board sits during the fall, for progress 0 (parked) to 1 (caught).
 *
 * The fall ONLY. The bounce that follows is added on top by `bounceY`, because
 * the two run on different clocks: the fall is driven by open/close progress
 * and reverses when the sign is shut, while the bounce is a one-shot that
 * starts the instant the chain goes taut.
 */
export function dropY(progress: number): number {
  return lerp(HIDDEN_Y, REST_Y, easeInQuart(clamp01(progress)));
}

/**
 * The rebound, `t` seconds after the chain catches the board.
 *
 * A decaying SINE, not a cosine. A cosine is the obvious choice for a rebound
 * and it is wrong here: it starts at full amplitude, so the board would
 * teleport a third of its own height at the exact instant of the catch. Sine
 * starts at zero, which is the only value that joins continuously onto the end
 * of the fall. It is also the more physical of the two — the board arrives with
 * its speed at a maximum and its displacement at zero, which is precisely the
 * phase a sine describes.
 *
 * Negative first, so it overshoots BELOW the resting point before the chain
 * pulls it back up.
 */
export function bounceY(t: number): number {
  return -0.55 * Math.exp(-2.25 * t) * Math.sin(11.5 * t);
}

/**
 * The pendulum swing, in radians, `t` seconds after the catch.
 *
 * Decays slower than the vertical bounce (1.7 against 2.25) because a pendulum
 * sheds energy more slowly than a spring does, and the difference is visible:
 * the board stops bobbing noticeably before it stops swinging.
 */
export function swayZ(t: number): number {
  return Math.exp(-1.7 * t) * Math.sin(6.2 * t) * 0.075;
}

/**
 * A smaller nudge for hover, so pointing at a hanging sign disturbs it.
 *
 * Same shape at a third the amplitude and a little slower — a poke, not a drop.
 */
export function swayImpulse(t: number): number {
  return Math.exp(-2.1 * t) * Math.sin(5.4 * t) * 0.026;
}

/**
 * How far the chains have to span, for a board whose centre is at `boardY`.
 *
 * The chain is one stretched box rather than a stack of links, so it needs a
 * length, not a count. Never shorter than a single link: a chain that collapses
 * to zero height inverts its texture and flickers.
 */
export function chainLength(boardY: number): number {
  return Math.max(LINK_H, BEAM_ANCHOR_Y - (boardY + BOARD_H / 2));
}
