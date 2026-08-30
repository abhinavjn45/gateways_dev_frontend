/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { Menu, User, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { BlockButton, BlockModal, ThemeToggle } from "@/frontend/components/mc";
import { ART } from "@/frontend/lib/assets/manifest";
import { FEST } from "@/frontend/lib/fest";
import { cn } from "@/frontend/lib/utils";
import { repo } from "@/lib/data";

/**
 * The sticky top bar.
 *
 * Two kinds of destination live side by side here, which is why this takes
 * callbacks rather than only rendering links: About / Theme / Register /
 * Contact are in-page anchors, while Events and Schedule open modals (the fest
 * has dedicated /events and /schedule routes, but the homepage should answer
 * "what is on?" without navigating away from the pitch).
 *
 * The bar starts transparent and gains a solid panel background once scrolled,
 * so the wordmark does not sit on a bar floating over the page.
 *
 * `scrolled` changes the BACKGROUND only, never the text colour. The bar is
 * sticky but not overlaid: it occupies its own row above the hero, so even
 * "transparent" means the page surface is behind it, never the sky. Both states
 * therefore sit on a themed background and both must use the themed text tokens.
 * (Colouring the unscrolled state for the sky instead puts white type on a pale
 * page in the light theme — invisible.)
 *
 * Left to right: the fest's own crest + wordmark (the identity this page is
 * selling), the link list, then the host university's mark on the far right.
 * The two logos are deliberately at opposite ends — ours anchors the page, the
 * university's is an outbound credit and should not be mistaken for it.
 */

// Nav links are now hardcoded in the render methods.

export interface SiteNavProps {
  onOpenEvents: () => void;
  onOpenSchedule: () => void;
}

export function SiteNav({ onOpenEvents, onOpenSchedule }: SiteNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    repo.auth.getSession().then((s) => setSession(s));
    return repo.auth.onAuthStateChange(() => {
      repo.auth.getSession().then((s) => setSession(s));
    });
  }, []);

  useEffect(() => {
    // passive: this listener never calls preventDefault, and saying so lets the
    // browser keep scrolling on the compositor thread.
    //
    // rAF-coalesced as well: a scroll gesture fires this far more often than
    // once a frame, and each call read `scrollY` — a layout read — on the main
    // thread. React bailed out of the repeated `setScrolled(true)`, but the read
    // itself still happened every event.
    let frame = 0;
    const read = () => {
      frame = 0;
      setScrolled(window.scrollY > 24);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-colors duration-200",
        scrolled
          ? "border-b-[length:var(--mc-bevel)] border-mc-border bg-mc-void/95 backdrop-blur-sm"
          : "border-b-[length:var(--mc-bevel)] border-transparent bg-transparent",
      )}
    >
      <div className="flex w-full items-center justify-between gap-[var(--mc-unit)] px-[calc(var(--mc-unit)*1.5)] py-[calc(var(--mc-unit)*0.75)] md:px-[calc(var(--mc-unit)*2)] md:py-[var(--mc-unit)] min-[1320px]:grid min-[1320px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] min-[1320px]:gap-[calc(var(--mc-unit)*2)]">
        {/* Crest and wordmark are one link, not two adjacent ones — they are a
            single lockup, and two targets to the same anchor would just give a
            keyboard user a redundant stop. The crest is decorative here because
            the wordmark beside it already names the link. */}
        {/* Crests and wordmarks container */}
        <div className="flex shrink-0 items-center gap-[calc(var(--mc-unit)*1.5)] md:gap-[calc(var(--mc-unit)*2)] min-[1320px]:justify-self-start">
          {/*
            The university mark, linking out to christuniversity.in.
            Moved to the left, before the Gateways logo.
          */}
          <a
            href={FEST.host.universityUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${FEST.host.university} — opens in a new tab`}
            className="flex min-h-11 shrink-0 items-center"
          >
            {/* Below md, the seal alone. */}
            <span aria-hidden className="block h-10 w-10 shrink-0 md:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ART.brand.christSmallWhite.src}
                alt=""
                className="theme-only-dark h-full w-auto opacity-90"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ART.brand.christSmallBlack.src}
                alt=""
                className="theme-only-light h-full w-auto opacity-90"
              />
            </span>
            
            {/* Desktop/Tablet (Medium/Large) Devices */}
            <span aria-hidden className="hidden md:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ART.brand.christWhite.src}
                alt=""
                className="theme-only-dark h-10 w-auto opacity-90 transition-opacity hover:opacity-100 md:h-12 min-[1320px]:h-14"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ART.brand.christBlack.src}
                alt=""
                className="theme-only-light h-10 w-auto opacity-90 transition-opacity hover:opacity-100 md:h-12 min-[1320px]:h-14"
              />
            </span>
          </a>

          {/* Gateways Crest */}
          <a
            href="#top"
            className="flex min-h-11 min-w-11 shrink-0 items-center gap-[calc(var(--mc-unit)*0.75)] no-underline"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ART.brand.gatewaysColoured.src}
              alt="Gateways 2026"
              aria-hidden
              className="theme-only-dark h-10 w-auto shrink-0 md:h-14 min-[1320px]:h-16"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ART.brand.gatewaysBlackSvg.src}
              alt="Gateways 2026"
              aria-hidden
              className="theme-only-light h-10 w-auto shrink-0 md:h-14 min-[1320px]:h-16"
            />
          </a>
        </div>

        {/* Desktop nav. Hidden rather than unmounted on mobile so there is only
            one source of truth for the link list. */}
        <nav aria-label="Main" className="hidden items-center justify-center gap-[calc(var(--mc-unit)*0.5)] min-[1320px]:flex">
          <NavLink href="/" label="Home" />
          {/* Plain text, not <BlockButton>. These open modals rather than
              navigating, but a bevelled panel around two of seven nav items
              made them read as the only real controls up here — the raised
              chrome was carrying meaning it did not have. */}
          <NavLink label="Events" onClick={onOpenEvents} />
          <NavLink label="Schedule" onClick={onOpenSchedule} />
          <NavLink href="/gallery" label="Gallery" />
          <NavLink href="/about" label="About" />
          <NavLink href="/contact" label="Contact" />
        </nav>

        <div className="flex shrink-0 items-center gap-[calc(var(--mc-unit)*0.75)] md:gap-[calc(var(--mc-unit)*1.25)] min-[1320px]:justify-self-end">
          <div className="hidden items-center md:flex">
            {session ? (
              <BlockButton variant="stone" size="sm" onClick={() => router.push("/dashboard/profile")}>
                My Account
              </BlockButton>
            ) : (
              <BlockButton variant="stone" size="sm" onClick={() => router.push("/login")}>
                Get Started
              </BlockButton>
            )}
          </div>

          {/* Below 1320px this leaves the bar so the university mark can take
              the slot. It is never absent from both places at once: the menu
              modal carries an "Appearance" row that is itself hidden above
              1320px. Someone who needs the light theme on a phone still has it,
              one tap further in. */}
          <ThemeToggle className="hidden min-[1320px]:inline-flex" />

          {/* Mobile Account Button (Icon Only) */}
          <div className="md:hidden">
            {session ? (
              <BlockButton variant="stone" size="icon" onClick={() => router.push("/dashboard/profile")} aria-label="My Account">
                <User aria-hidden size={20} strokeWidth={2.5} />
              </BlockButton>
            ) : (
              <BlockButton variant="stone" size="icon" onClick={() => router.push("/login")} aria-label="Get Started">
                <LogIn aria-hidden size={20} strokeWidth={2.5} />
              </BlockButton>
            )}
          </div>

          {/* Last in the row. The hamburger belongs at the trailing edge on
              mobile, which is also where it was before the mark took the
              toggle's slot. */}
          <div className="min-[1320px]:hidden">
            <BlockButton
              variant="ghost"
              size="icon"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu aria-hidden size={20} strokeWidth={2.5} />
            </BlockButton>
          </div>
        </div>
      </div>

      {/* Mobile menu. A modal rather than a slide-down panel because BlockModal
          already gives us the focus trap, scroll lock and Escape handling that a
          hand-rolled dropdown would have to reimplement badly. */}
      <BlockModal
        open={menuOpen}
        onOpenChange={setMenuOpen}
        title="Menu"
        description="Site navigation"
      >
        <nav aria-label="Mobile" className="flex flex-col gap-[var(--mc-unit)]">
          {/* First, and visibly set apart, because it is the one row here that
              is not a destination — someone who opened the menu to change the
              theme should not have to read past six links to reach it.

              Labelled "Appearance", not "Theme": the nav already has a "Theme"
              link and there it means this year's SUBJECT (Digital Twins), not
              the colour scheme. Two rows sharing a word while doing unrelated
              things is worse than a slightly formal label.

              Hidden above 1320px, where the toggle is back out in the bar. */}
          <div className="flex items-center justify-between gap-[var(--mc-unit)] bg-mc-slot px-[calc(var(--mc-unit)*1.5)] py-[var(--mc-unit)] bevel-inset min-[1320px]:hidden">
            <span className="font-pixel text-[10px] uppercase tracking-[0.1em] text-mc-text-dim">
              Appearance
            </span>
            <ThemeToggle />
          </div>

          <MenuLink href="/" label="Home" onNavigate={() => setMenuOpen(false)} />
          {/* MenuLink, not <BlockButton variant="stone">. Two raised grey slabs
              among six inset dark rows read as the only real controls in the
              menu — exactly the miscue the desktop nav already corrected (see
              the note above its own Events/Schedule pair). */}
          <MenuLink
            label="Events"
            onNavigate={() => setMenuOpen(false)}
            onClick={onOpenEvents}
          />
          <MenuLink
            label="Schedule"
            onNavigate={() => setMenuOpen(false)}
            onClick={onOpenSchedule}
          />
          <MenuLink href="/gallery" label="Gallery" onNavigate={() => setMenuOpen(false)} />
          <MenuLink href="/about" label="About" onNavigate={() => setMenuOpen(false)} />
          <MenuLink href="/contact" label="Contact" onNavigate={() => setMenuOpen(false)} />
          <a
            href={FEST.host.universityUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center justify-center bg-mc-slot px-[calc(var(--mc-unit)*1.5)] py-[var(--mc-unit)] text-center font-pixel text-[10px] uppercase tracking-[0.08em] text-mc-text no-underline bevel-inset sm:hidden"
          >
            {FEST.host.university}
          </a>
        </nav>
      </BlockModal>
    </header>
  );
}

/**
 * One nav item, rendered as an anchor when it navigates and a button when it
 * opens a modal — same styling either way, because to the visitor they are the
 * same kind of thing. Using a real <button> for the modal triggers keeps the
 * semantics honest: an <a href="#"> that opens a dialog lies to assistive tech.
 */
function NavLink({
  href,
  label,
  onClick,
}: {
  href?: string;
  label: string;
  onClick?: () => void;
}) {
  const className =
    "bg-transparent px-[var(--mc-unit)] py-[calc(var(--mc-unit)*0.5)] font-pixel text-[10px] uppercase tracking-[0.1em] text-mc-text no-underline transition-colors hover:text-mc-eyebrow";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        // `appearance-none` is load-bearing, not tidiness. Tailwind's preflight
        // sets `button { appearance: button }`, which leaves these as NATIVE
        // widgets, and `html`/`html[data-theme="light"]` flip `color-scheme`
        // between dark and light. On every theme switch the browser repainted
        // its own button chrome for one frame before the author styles took
        // over — the flash on Events and Schedule, and only on those two,
        // because they are the row's only <button>s (the rest are <a>) and
        // their `bg-transparent` left nothing covering the widget underneath.
        className={cn(className, "cursor-pointer appearance-none border-0")}
      >
        {label}
      </button>
    );
  }

  return (
    <a href={href} className={className}>
      {label}
    </a>
  );
}

/**
 * One row of the mobile menu. Anchor when it navigates, button when it opens a
 * modal — identical styling either way, mirroring how NavLink already handles
 * the same split on desktop. An <a href="#"> that opens a dialog lies to
 * assistive tech, so the modal triggers get a real <button>.
 *
 * `onNavigate` closes the menu and runs first, so the modal opens onto a closed
 * menu rather than stacking on top of it.
 */
function MenuLink({
  href,
  label,
  onNavigate,
  onClick,
}: {
  href?: string;
  label: string;
  onNavigate: () => void;
  onClick?: () => void;
}) {
  const className =
    "block w-full bg-mc-slot px-[calc(var(--mc-unit)*1.5)] py-[calc(var(--mc-unit)*1.25)] text-center font-pixel text-[11px] uppercase tracking-[0.1em] text-mc-text no-underline bevel-inset";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={() => {
          onNavigate();
          onClick();
        }}
        // Same native-widget repaint as NavLink above — see the note there.
        className={cn(className, "cursor-pointer appearance-none border-0")}
      >
        {label}
      </button>
    );
  }

  return (
    <a href={href} onClick={onNavigate} className={className}>
      {label}
    </a>
  );
}
