"use client";

import React from "react";
import { Megaphone, AlertCircle, PartyPopper, TriangleAlert } from "lucide-react";
import { ART } from "@/frontend/lib/assets/manifest";
import { FEST } from "@/frontend/lib/fest";
import { useAsync } from "@/frontend/hooks/use-async";
import { fetchAnnouncements } from "@/frontend/lib/announcements";

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
  const { data: allAnnouncements } = useAsync(fetchAnnouncements, []);
  
  const { items, duration } = React.useMemo(() => {
    if (!allAnnouncements) return { items: [], duration: "22s" };
    
    const fetched = allAnnouncements
      .filter((a) => a.targetAudience.trim() === "Frontend Announcements")
      .map((a) => ({
        text: a.content,
        category: a.badgeCategory?.trim().toLowerCase(),
        badge: a.badgeContent?.trim()
      }));

    if (fetched.length === 0) return { items: [], duration: "22s" };

    // Duplicate items so the track is guaranteed to be wider than the screen (e.g. 4K monitors)
    const COPIES = 20;
    const repeated = [];
    for (let i = 0; i < COPIES; i++) {
      repeated.push(...fetched);
    }

    // Calculate a comfortable constant reading speed regardless of text length
    const totalChars = fetched.reduce((sum, item) => sum + item.text.length, 0) * COPIES;
    // 8 characters per second is a slower, very comfortable reading pace
    const calcDuration = Math.max(10, Math.floor(totalChars / 8));

    return { 
      items: repeated, 
      duration: `${calcDuration}s` 
    };
  }, [allAnnouncements]);

  if (items.length === 0) return null;

  return (
    <div
      role="status"
      aria-label="Announcements"
      className="group flex w-full items-stretch overflow-hidden border-b-[length:var(--mc-bevel)] border-mc-redstone-dark bg-mc-redstone"
    >
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

      <div className="relative flex flex-1 overflow-hidden">
        <MarqueeTrack items={items} duration={duration} />
        <MarqueeTrack items={items} duration={duration} hidden />
      </div>
    </div>
  );
}

function MarqueeTrack({
  items,
  duration,
  hidden = false,
}: {
  items: { text: string; category?: string; badge?: string }[];
  duration: string;
  hidden?: boolean;
}) {
  return (
    <div
      aria-hidden={hidden}
      style={{ animationDuration: duration }}
      className="marquee-track flex w-max shrink-0 animate-marquee items-center whitespace-nowrap py-[calc(var(--mc-unit)*0.6)] [animation-play-state:running] group-hover:[animation-play-state:paused]"
    >
      {items.map((item, i) => {
        let Icon = Megaphone;
        let badgeColor = "bg-mc-lapis text-mc-cloud-light"; // Default to info
        
        if (item.category === 'danger') {
          Icon = AlertCircle;
          badgeColor = "bg-mc-redstone-dark text-mc-gold-light";
        } else if (item.category === 'success') {
          Icon = PartyPopper;
          badgeColor = "bg-mc-emerald text-mc-obsidian";
        } else if (item.category === 'warning') {
          Icon = TriangleAlert;
          badgeColor = "bg-mc-gold text-mc-obsidian";
        }

        return (
          <span
            key={i}
            className="flex items-center gap-[calc(var(--mc-unit)*0.6)] px-[calc(var(--mc-unit)*2)] font-pixel text-[9px] uppercase tracking-[0.08em] text-mc-cloud-light md:text-[10px]"
          >
            {item.badge ? (
              <span className={`flex items-center gap-[calc(var(--mc-unit)*0.4)] rounded-none px-[calc(var(--mc-unit)*0.6)] py-[calc(var(--mc-unit)*0.2)] ${badgeColor}`}>
                <Icon size={12} strokeWidth={2.5} />
                {item.badge}
              </span>
            ) : null}
            {item.text}
          </span>
        );
      })}
    </div>
  );
}
