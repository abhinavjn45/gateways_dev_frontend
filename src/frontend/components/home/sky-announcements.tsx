"use client";

import { FEST } from "@/frontend/lib/fest";
import { cn } from "@/frontend/lib/utils";

/**
 * Announcements written inside drifting pixel clouds.
 *
 * This replaces the ticker bar that used to sit under the nav. A marquee is a
 * strip of chrome bolted across the page; here each fact rides in its own cloud
 * among the panorama's, so the announcement is part of the world rather than an
 * overlay on top of it.
 *
 * The cloud is built from blocks rather than a background image: a lit top
 * face, a body, a shaded underside, a stepped crown of bumps above and nubs
 * hanging below. Every offset is a multiple of `--mc-unit`, so the whole shape
 * rescales with `--mc-scale` and its edges stay on the pixel grid at 2×, 3×
 * and 4×. See `SHAPES` for what makes the crown read as a cloud rather than as
 * a box with tabs on it.
 *
 * COLOUR IS THEMED, geometry is not. The three faces come from `--cloud-lit` /
 * `--cloud-face` / `--cloud-shade` in globals.css, which are storm greys in the
 * dark theme and the pale cloud material in the light one — so these match the
 * weather in the panorama behind them without a second DOM tree or a JS branch.
 *
 * CSS animation, not GSAP and not Framer: each cloud is one looping transform
 * on one element with no coordination between them — the case the animation
 * ruleset assigns to CSS. Variation comes from a per-cloud duration and a
 * NEGATIVE delay, which starts each one partway through its cycle so they never
 * drift in lockstep. (A positive delay would instead leave them all frozen at
 * the origin for the first few seconds.)
 *
 * Reduced motion needs no branch here. The keyframe returns to its origin, so
 * the global `animation-duration: 0.01ms` override lands each cloud exactly
 * where it already is.
 */

/**
 * The clouds are laid out as an ARCH over the wordmark.
 *
 * Read left to right the tops go 20% → 6% → 6% → 20%: the two outer clouds hang
 * low at the edges, the two inner ones ride high over the centre, so the four
 * of them describe a shallow vault with PARALLAX sitting under its keystone.
 *
 * Two constraints hold it together, and both are load-bearing:
 *
 * 1. The inner pair sits ABOVE the title, not beside it — they are the highest
 *    things in the sky precisely because they are the ones over the centre.
 * 2. Every cloud is pinned to an edge and width-capped, so none can reach the
 *    centre column horizontally. Vertical clearance alone is not enough: the
 *    hero centres its content, so on a short viewport the title climbs, and a
 *    cloud that merely sits above it at 1440×900 would collide at 1280×720.
 *    The width cap makes that impossible rather than merely unlikely.
 *
 * Order matters — index 2 and 3 are the inner (high) pair and are the first to
 * be dropped, because an arch that cannot fit is better shown as two low clouds
 * than as four overlapping ones.
 *
 * VISIBILITY IS GATED ON VIEWPORT HEIGHT, not only width, and that is the
 * subtle part. These tops are percentages of the hero, but the hero centres its
 * content vertically — so as the viewport gets shorter the title block occupies
 * proportionally more of it and climbs into the arch. Below roughly 700px the
 * hero content no longer fits at all and overflows upward, putting the wordmark
 * near the top of the screen: measured at 1024×600, the inner pair overlapped
 * the glyphs by 84px, where the same layout has 150px of clearance at 1440×900.
 * Width alone cannot express that — a short window is short however wide it is.
 *
 * The thresholds are viewport heights, not screen heights. A 900px-tall laptop
 * gives roughly 800px of viewport once browser chrome is subtracted, so gating
 * the arch at 820px would have hidden it on the most common laptop there is.
 */
const SLOTS = [
  // Outer pair — the low ends of the arch, pinned hard to the edges.
  { top: "20%", left: "3%", duration: 15, delay: -2, shape: 0, gate: "short" },
  { top: "20%", right: "3%", duration: 17, delay: -9, shape: 1, gate: "short" },
  // Inner pair — the high span over the wordmark. Needs both room across and
  // room down, so it is the first thing to go.
  { top: "6%", left: "24%", duration: 13, delay: -5, shape: 2, gate: "arch" },
  { top: "6%", right: "24%", duration: 19, delay: -12, shape: 3, gate: "arch" },
] as const;

/**
 * Arbitrary media variants rather than Tailwind's width-only breakpoints —
 * `lg:` cannot say "and tall enough".
 */
const GATES = {
  /** Outer clouds: hidden on viewports too short to hold them clear of the title. */
  short: "hidden [@media(min-width:280px)_and_(min-height:620px)]:block",
  /** Inner clouds: need width for the span AND height for the rise. */
  arch: "hidden [@media(min-width:1024px)_and_(min-height:700px)]:block",
} as const;

/**
 * Bump/nub placements per shape, so the four clouds are not identical stamps.
 *
 * Each shape is a CONTIGUOUS CROWN: the bumps butt up against one another left
 * to right (6+14=20, 20+22=42, …) and step up to a single off-centre peak
 * before stepping back down. That contiguity is the whole fix. The previous
 * shapes carried two isolated bumps on a bare top edge, which left most of the
 * silhouette a flat rectangle with a couple of tabs on it — the reason these
 * did not read as clouds.
 *
 * Rules for editing:
 *  - `left + w` must stay ≤ 100, or a bump overhangs the body and the cloud
 *    gains a hard corner exactly where it should be softest.
 *  - `h` is in whole `--mc-unit`s, 1–3. Anything taller reads as a tower.
 *  - Vary WHERE the peak sits between shapes, not just its height; four clouds
 *    peaking dead centre look like one cloud drawn four times.
 */
const SHAPES = [
  // Peak just right of centre.
  {
    bumps: [
      { left: "6%", w: "14%", h: 1 },
      { left: "20%", w: "22%", h: 2 },
      { left: "42%", w: "26%", h: 3 },
      { left: "68%", w: "20%", h: 2 },
      { left: "88%", w: "10%", h: 1 },
    ],
    nubs: [
      { left: "14%", w: "20%" },
      { left: "44%", w: "26%" },
      { left: "76%", w: "14%" },
    ],
  },
  // Broad and low — two shoulders, no single peak.
  {
    bumps: [
      { left: "4%", w: "16%", h: 1 },
      { left: "20%", w: "24%", h: 2 },
      { left: "44%", w: "22%", h: 2 },
      { left: "66%", w: "22%", h: 3 },
      { left: "88%", w: "10%", h: 1 },
    ],
    nubs: [
      { left: "10%", w: "18%" },
      { left: "38%", w: "22%" },
      { left: "68%", w: "20%" },
    ],
  },
  // Peak hard left.
  {
    bumps: [
      { left: "4%", w: "18%", h: 2 },
      { left: "22%", w: "24%", h: 3 },
      { left: "46%", w: "22%", h: 2 },
      { left: "68%", w: "20%", h: 1 },
      { left: "88%", w: "8%", h: 1 },
    ],
    nubs: [
      { left: "18%", w: "24%" },
      { left: "52%", w: "18%" },
    ],
  },
  // Peak hard right.
  {
    bumps: [
      { left: "6%", w: "12%", h: 1 },
      { left: "18%", w: "20%", h: 2 },
      { left: "38%", w: "24%", h: 2 },
      { left: "62%", w: "24%", h: 3 },
      { left: "86%", w: "12%", h: 1 },
    ],
    nubs: [
      { left: "12%", w: "16%" },
      { left: "40%", w: "20%" },
      { left: "70%", w: "22%" },
    ],
  },
] as const;

export function SkyAnnouncements() {
  return (
    <ul
      aria-label="Announcements"
      // pointer-events-none so a drifting cloud can never intercept a click
      // meant for the hero beneath it.
      className="pointer-events-none absolute inset-0 z-0 m-0 list-none p-0"
    >
      {FEST.announcements.map((text, i) => {
        const slot = SLOTS[i % SLOTS.length];
        return (
          <li
            key={text}
            className={cn("absolute animate-sky-float", GATES[slot.gate])}
            style={{
              top: slot.top,
              ...("left" in slot ? { left: slot.left } : { right: slot.right }),
              animationDuration: `${slot.duration}s`,
              animationDelay: `${slot.delay}s`,
            }}
          >
            <SkyCloud text={text} shape={slot.shape} />
          </li>
        );
      })}
    </ul>
  );
}

function SkyCloud({ text, shape }: { text: string; shape: number }) {
  const { bumps, nubs } = SHAPES[shape % SHAPES.length];

  return (
    // A fixed width rather than shrink-to-fit: four clouds sized to their own
    // text would range from tiny to enormous and stop reading as one family.
    // The text wraps inside instead.
    <div className="relative w-[min(44vw,190px)] md:w-[min(26vw,236px)]">
      {/* Bumps riding on top. They carry the lit face colour so the cloud's
          whole upper silhouette is a single tone. */}
      {bumps.map((b, i) => (
        <span
          aria-hidden
          key={`bump-${i}`}
          className="absolute block bg-[var(--cloud-lit)]"
          style={{
            left: b.left,
            width: b.w,
            height: `calc(var(--mc-unit) * ${b.h})`,
            top: `calc(var(--mc-unit) * ${-b.h})`,
          }}
        />
      ))}

      {/* Nubs hanging underneath, in the shaded underside colour. */}
      {nubs.map((n, i) => (
        <span
          aria-hidden
          key={`nub-${i}`}
          className="absolute bottom-[calc(var(--mc-unit)*-1)] block h-[var(--mc-unit)] bg-[var(--cloud-shade)]"
          style={{ left: n.left, width: n.w }}
        />
      ))}

      {/* Body. The top and bottom borders are the lit and shaded faces — the
          same two-tone trick the `bevel` utility uses, done with borders here
          because the bumps must line up flush with the lit face. */}
      <div className="relative border-b-[length:var(--mc-unit)] border-t-[length:var(--mc-unit)] border-b-[var(--cloud-shade)] border-t-[var(--cloud-lit)] bg-[var(--cloud-face)] px-[calc(var(--mc-unit)*1.25)] py-[calc(var(--mc-unit)*0.75)]">
        {/* text-balance so the lines come out even lengths. Without it the
            greedy line-breaker leaves orphans and splits mid-date
            ("hackathon begins 30 / september 2026"), which in a 2–3 line block at
            this size is the difference between a caption and a ransom note. */}
        <span className="block text-balance text-center font-pixel text-[7px] uppercase leading-[1.9] tracking-[0.06em] text-[var(--cloud-ink)] md:text-[9px]">
          {text}
        </span>
      </div>
    </div>
  );
}
