"use client";

import { Megaphone } from "lucide-react";
import { ART } from "@/frontend/lib/assets/manifest";
import { FEST } from "@/frontend/lib/fest";

/**
 * The scrolling strip pinned above the nav, on every page.
 *
 * This is a SEPARATE feed from the sky clouds in `sky-announcements.tsx`:
 * those drift behind the homepage hero and vanish once you scroll past it or
 * leave the page, so anything that must stay visible everywhere — a status
 * change like registration closing — needs a home that is not "in the hero".
 * `FEST.marqueeAnnouncements` is that home; add or remove items there, this
 * component does not care how many there are.
 *
 * Structure: a fixed "Announcement" tag (never scrolls, so the strip reads as
 * an announcement bar even before any text has scrolled into view) beside a
 * looping ticker. The ticker is two back-to-back copies of the same track
 * translated by exactly -50% (see the `marquee` keyframes in globals.css) —
 * the standard seamless-loop trick, which needs no retuning when an item is
 * added because the copies are always exactly half the total width, whatever
 * that width is.
 *
 * Only the FIRST copy is in the accessibility tree; the second exists purely
 * to fill the gap the animation opens up and is `aria-hidden` so a screen
 * reader does not hear every item twice.
 *
 * `alert` items get the same redstone warning treatment as an alert sky
 * cloud (see that file), so a closed-registration notice reads as a status
 * change, not routine news, wherever it appears.
 */
export function AnnouncementMarquee() {
  const items = FEST.marqueeAnnouncements;
  if (items.length === 0) return null;

  return (
    <div
      role="status"
      aria-label="Announcements"
      className="group flex w-full items-stretch overflow-hidden border-b-[length:var(--mc-bevel)] border-mc-redstone-dark bg-mc-redstone"
    >
      {/* The pinned tag. A slot of the accent material, not the strip's own
          redstone — the whole point is that it reads as a label ON the
          announcement, the way a "NEW" sticker sits on a box rather than
          being painted the same colour as it.

          Below `sm` this is the crest alone, not "Announcement" in a pixel
          font: at phone width the label was competing with the one thing
          actually worth the space, the scrolling message, for a word the
          redstone strip itself already implies. The crest still marks the
          strip as belonging to the fest, just without spending a whole word
          on it. Always the BLACK crest, not the theme-paired pair the nav
          itself swaps between — this chip's own background is the constant
          gold token in both themes, so the ink that reads on it doesn't
          change with the theme either, only the page around it does. */}
      <span className="flex shrink-0 items-center gap-[calc(var(--mc-unit)*0.6)] bg-mc-gold px-[calc(var(--mc-unit)*0.85)] py-[calc(var(--mc-unit)*0.5)] sm:px-[calc(var(--mc-unit)*1.25)] sm:py-[calc(var(--mc-unit)*0.6)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ART.brand.gatewaysBlackSvg.src}
          alt="Gateways"
          aria-hidden
          className="block h-[16px] w-auto sm:hidden"
        />
        <span className="hidden items-center gap-[calc(var(--mc-unit)*0.6)] font-pixel text-[9px] uppercase tracking-[0.08em] text-mc-obsidian sm:flex">
          <Megaphone aria-hidden size={13} strokeWidth={2.75} />
          Announcement
        </span>
      </span>

      {/* `group-hover:[animation-play-state:paused]` lets anyone stop the
          scroll to read a longer item, without a separate pause control. */}
      <div className="relative flex flex-1 overflow-hidden">
        <MarqueeTrack items={items} />
        <MarqueeTrack items={items} hidden />
      </div>
    </div>
  );
}

function MarqueeTrack({
  items,
  hidden = false,
}: {
  items: { text: string; alert?: boolean }[];
  hidden?: boolean;
}) {
  return (
    <div
      aria-hidden={hidden}
      className="marquee-track flex w-max shrink-0 animate-marquee items-center whitespace-nowrap py-[calc(var(--mc-unit)*0.6)] [animation-play-state:running] group-hover:[animation-play-state:paused]"
    >
      {items.map((item, i) => (
        <span
          key={i}
          className="flex items-center gap-[calc(var(--mc-unit)*0.6)] px-[calc(var(--mc-unit)*2)] font-pixel text-[9px] uppercase tracking-[0.08em] text-mc-cloud-light md:text-[10px]"
        >
          {/* The alert chip. A second, smaller badge inside the item rather
              than recolouring the whole strip when even one item is an
              alert — with only one item today that would be the same thing,
              but the strip must still read correctly once a routine item
              (e.g. the prize pool) sits next to this one. */}
          {item.alert ? (
            <span className="rounded-none bg-mc-redstone-dark px-[calc(var(--mc-unit)*0.6)] py-[calc(var(--mc-unit)*0.2)] text-mc-gold-light">
              Closed
            </span>
          ) : null}
          {item.text}
        </span>
      ))}
    </div>
  );
}
