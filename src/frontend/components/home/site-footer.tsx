/* eslint-disable @typescript-eslint/no-unused-vars, react/no-unescaped-entities */
"use client";

import { blockButton } from "@/frontend/components/mc/block-button";
import { GRASS_GROUND_STYLE } from "@/frontend/lib/assets/textures";
import { FEST } from "@/frontend/lib/fest";
import { ART } from "@/frontend/lib/assets/manifest";

function SocialIcon({ label }: { label: string }) {
  switch (label.toLowerCase()) {
    case "instagram": 
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
        </svg>
      );
    case "linkedin": 
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
          <rect width="4" height="12" x="2" y="9"/>
          <circle cx="4" cy="4" r="2"/>
        </svg>
      );
    case "youtube": 
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
          <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
        </svg>
      );
    default: 
      return <span>{label}</span>;
  }
}

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
    // `relative` carries no offset and changes nothing visually. It exists so
    // the footer becomes a POSITIONED element and therefore paints above the
    // ambient block layer (`#ambient-blocks`, z-index 0, first in the body).
    // Without it the footer is in-flow content, which paints below that layer,
    // and blocks rising out of the footer would slide over the turf instead of
    // emerging from behind its edge.
    <footer
      className="pixelated relative mt-[calc(var(--mc-unit)*2)]"
      style={GRASS_GROUND_STYLE}
    >
      {/* Top padding clears the grass cap, which is 10 art px tall and so
          2.5 × --mc-unit at every --mc-scale. The parade used to occupy that
          band and hold the content off it; with the parade gone the text would
          otherwise start in the turf. */}
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-[calc(var(--mc-unit)*2)] px-[calc(var(--mc-unit)*2)] pb-[calc(var(--mc-unit)*3)] pt-[calc(var(--mc-unit)*10)] md:px-[calc(var(--mc-unit)*1.5)]">
        
        <div className="grid grid-cols-1 gap-[calc(var(--mc-unit)*4)] md:grid-cols-12 md:gap-[calc(var(--mc-unit)*3)]">
          {/* Column 1: Brand & Bio */}
          <div className="md:col-span-4 flex flex-col gap-[calc(var(--mc-unit)*2)]">
            <div className="flex items-center gap-[calc(var(--mc-unit)*1.5)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ART.brand.gatewaysWhiteSvg.src}
                alt="Gateways Logo"
                className="h-16 w-auto opacity-90 md:h-20"
              />
              <div className="flex flex-col justify-center">
                <span className="font-pixel text-[20px] md:text-[24px] uppercase tracking-[0.05em] text-white">
                  Gateways
                </span>
                <span className="font-pixel text-[12px] md:text-[14px] text-mc-gold-light tracking-[0.1em] mt-1">
                  2026
                </span>
              </div>
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
                    className={blockButton({ variant: "stone", size: "sm" }) + " !px-[calc(var(--mc-unit)*1.5)] !py-[calc(var(--mc-unit)*1.5)]"}
                    aria-label={s.label}
                  >
                    <SocialIcon label={s.label} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: Useful Links */}
          <div className="md:col-span-3 flex flex-col gap-[calc(var(--mc-unit)*1.5)]">
            <h3 className="font-pixel text-[12px] uppercase text-mc-gold-light">Useful Links</h3>
            <ul className="flex flex-col gap-[calc(var(--mc-unit)*0.75)]">
              <li>
                <a href="/faq" className="inline-flex min-h-8 items-center whitespace-nowrap font-pixel text-[9px] uppercase tracking-[0.1em] text-mc-cloud no-underline transition-colors hover:text-mc-gold-light">
                  FAQs
                </a>
              </li>
              <li>
                <a href="/registration-process" className="inline-flex min-h-8 items-center whitespace-nowrap font-pixel text-[9px] uppercase tracking-[0.1em] text-mc-cloud no-underline transition-colors hover:text-mc-gold-light">
                  Registration Process
                </a>
              </li>
              <li>
                <a href="/guidelines" className="inline-flex min-h-8 items-center whitespace-nowrap font-pixel text-[9px] uppercase tracking-[0.1em] text-mc-cloud no-underline transition-colors hover:text-mc-gold-light">
                  Participant's Guidelines
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Policies */}
          <div className="md:col-span-3 flex flex-col gap-[calc(var(--mc-unit)*1.5)]">
            <h3 className="font-pixel text-[12px] uppercase text-mc-gold-light">Policies</h3>
            <ul className="flex flex-col gap-[calc(var(--mc-unit)*0.75)]">
              <li>
                <a href="/terms" className="inline-flex min-h-8 items-center whitespace-nowrap font-pixel text-[9px] uppercase tracking-[0.1em] text-mc-cloud no-underline transition-colors hover:text-mc-gold-light">
                  Terms & Conditions
                </a>
              </li>
              <li>
                <a href="/privacy" className="inline-flex min-h-8 items-center whitespace-nowrap font-pixel text-[9px] uppercase tracking-[0.1em] text-mc-cloud no-underline transition-colors hover:text-mc-gold-light">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="inline-flex min-h-8 items-center whitespace-nowrap font-pixel text-[9px] uppercase tracking-[0.1em] text-mc-cloud no-underline transition-colors hover:text-mc-gold-light">
                  Rules & Regulations
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: App Download */}
          <div className="md:col-span-2 flex flex-col gap-[calc(var(--mc-unit)*1.5)]">
            <h3 className="font-pixel text-[12px] uppercase text-mc-gold-light">Get The App</h3>
            <div className="flex flex-col gap-3 items-start">
              <a 
                href="#" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex transition-transform hover:scale-105"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="Download on App Store" className="h-10 object-contain" />
              </a>
              <a 
                href="#" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex transition-transform hover:scale-105 mt-1"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" className="h-[2.8rem] object-contain" />
              </a>
            </div>
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
