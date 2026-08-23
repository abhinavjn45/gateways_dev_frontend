"use client";

import { BlockPanel } from "@/frontend/components/mc";
import { blockButton } from "@/frontend/components/mc/block-button";
import { GRASS_GROUND_STYLE } from "@/frontend/lib/assets/textures";
import { FEST } from "@/frontend/lib/fest";
import { ART } from "@/frontend/lib/assets/manifest";

//The site footer.
//
//The phone numbers are real links (`tel:`) rather than plain text — a visitor
//on a phone reading this page should be one tap from calling, and copying a
//number off a screen is exactly the friction that loses a registration.
export function SiteFooter() {
  return (
    // Grass-topped dirt, generated in assets/textures.ts. The footer is now
    // the ground the page gradient's horizon has been leading down to, which
    // is why it drops the themed surface it used to sit on.
    //
    // That flips how its type is coloured. A MATERIAL backdrop is the same in
    // both themes, so the text on it can no longer name themed tokens the way
    // the rest of the app does — `text-mc-text-dim` resolves to a dark brown in
    // the light theme and would vanish into the soil. Everything below names a
    // pale material directly instead, the same exception the hero and portal
    // scenes take for type sitting on art.
    //
    // No top border: the grass cap IS the edge, and a hard rule above it read
    // as a line drawn over the turf.
    <footer
      className="pixelated mt-[calc(var(--mc-unit)*2)]"
      style={GRASS_GROUND_STYLE}
    >
      {/* Top padding clears the grass cap, which is 10 art px tall and so
          2.5 × --mc-unit at every --mc-scale. The parade used to occupy that
          band and hold the content off it; with the parade gone the text would
          otherwise start in the turf. */}
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-[calc(var(--mc-unit)*2)] px-[calc(var(--mc-unit)*2)] pb-[calc(var(--mc-unit)*3)] pt-[calc(var(--mc-unit)*3.5)] md:px-[calc(var(--mc-unit)*1.5)]">
        
        <div className="grid grid-cols-1 md:grid-cols-10 gap-[calc(var(--mc-unit)*3)] md:gap-[calc(var(--mc-unit)*2)]">
          {/* Column 1: Brand & Legacy (40%) */}
          <div className="md:col-span-4 flex flex-col gap-[calc(var(--mc-unit)*1.5)]">
            <div className="flex items-center gap-[calc(var(--mc-unit)*1)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ART.brand.gatewaysColoured.src}
                alt="Gateways 2026"
                className="theme-only-dark h-16 w-auto opacity-90 md:h-20"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ART.brand.gatewaysBlackSvg.src}
                alt="Gateways 2026"
                className="theme-only-light h-16 w-auto opacity-90 md:h-20"
              />
            </div>
            
            <p className="max-w-[42ch] text-[16px] leading-snug text-mc-cloud/90">
              Celebrating 30 years of technological brilliance and innovation. Gateways continues its legacy of empowering the brightest minds to shape the future.
            </p>
            
            <ul className="mt-[calc(var(--mc-unit)*1)] flex flex-wrap gap-[calc(var(--mc-unit)*1)]">
              {FEST.socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={blockButton({ variant: "stone", size: "sm" })}
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: Useful Links (30%) */}
          <div className="md:col-span-3 flex flex-col gap-[calc(var(--mc-unit)*1.5)]">
            <h3 className="font-pixel text-[12px] uppercase text-mc-gold-light">Useful Links</h3>
            <ul className="flex flex-col gap-[calc(var(--mc-unit)*0.75)]">
              <li>
                <a href="#" className="inline-flex min-h-8 items-center font-pixel text-[9px] uppercase tracking-[0.1em] text-mc-cloud no-underline transition-colors hover:text-mc-gold-light">
                  FAQs
                </a>
              </li>
              <li>
                <a href="#" className="inline-flex min-h-8 items-center font-pixel text-[9px] uppercase tracking-[0.1em] text-mc-cloud no-underline transition-colors hover:text-mc-gold-light">
                  Registration Process
                </a>
              </li>
              <li>
                <a href="#" className="inline-flex min-h-8 items-center font-pixel text-[9px] uppercase tracking-[0.1em] text-mc-cloud no-underline transition-colors hover:text-mc-gold-light">
                  Participant's Guidelines
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Policies (30%) */}
          <div className="md:col-span-3 flex flex-col gap-[calc(var(--mc-unit)*1.5)]">
            <h3 className="font-pixel text-[12px] uppercase text-mc-gold-light">Policies</h3>
            <ul className="flex flex-col gap-[calc(var(--mc-unit)*0.75)]">
              <li>
                <a href="#" className="inline-flex min-h-8 items-center font-pixel text-[9px] uppercase tracking-[0.1em] text-mc-cloud no-underline transition-colors hover:text-mc-gold-light">
                  Terms & Conditions
                </a>
              </li>
              <li>
                <a href="#" className="inline-flex min-h-8 items-center font-pixel text-[9px] uppercase tracking-[0.1em] text-mc-cloud no-underline transition-colors hover:text-mc-gold-light">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="inline-flex min-h-8 items-center font-pixel text-[9px] uppercase tracking-[0.1em] text-mc-cloud no-underline transition-colors hover:text-mc-gold-light">
                  Rules & Regulations
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-[var(--mc-unit)] border-t-[length:var(--mc-bevel)] border-white/25 pt-[calc(var(--mc-unit)*1.5)] mt-[calc(var(--mc-unit)*2)]">
          <p className="font-pixel text-[8px] uppercase tracking-[0.1em] text-mc-cloud/80">
            © 2026 {FEST.host.department}
          </p>
          <a
            href={FEST.host.universityUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center font-pixel text-[8px] uppercase tracking-[0.1em] text-mc-cloud no-underline transition-colors hover:text-mc-gold-light"
          >
            {FEST.host.university} ↗
          </a>
        </div>
        
      </div>
    </footer>
  );
}
