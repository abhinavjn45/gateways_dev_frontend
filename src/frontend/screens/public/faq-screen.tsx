"use client";

import Link from "next/link";
import { BackLink, BlockPanel } from "@/frontend/components/mc";
import { FaqSigns } from "@/frontend/components/faq/faq-signs";
import type { SignGroup } from "@/frontend/components/faq/faq-sign-layer";
import { CHATBOT_FAQ, FAQ_CATEGORIES } from "@/frontend/lib/chatbot-faq";

/**
 * The FAQ, as a row of Minecraft hanging signs.
 *
 * The questions come from `chatbot-faq.ts` — the same vetted set the chatbot
 * answers from, so the page and the bot cannot tell a visitor two different
 * things. Anything added there appears here automatically, under its category.
 *
 * `FaqSigns` decides how to draw them: hanging signs where the browser and the
 * viewport can carry it, and a plain accordion everywhere else. This screen
 * stays out of that argument and just hands over the grouped content.
 */
export function FaqScreen() {
  // A category with nothing in it yet renders nothing rather than an empty
  // heading — the list is data-driven and will not always be full.
  const groups: SignGroup[] = FAQ_CATEGORIES.map((category) => ({
    category,
    entries: CHATBOT_FAQ.filter((f) => f.category === category),
  })).filter((group) => group.entries.length > 0);

  return (
    // `relative` with a z-index: the sign layer's canvas is fixed at z-0 across
    // the whole viewport, and without a stacking context of its own this column
    // would be painted underneath it.
    <div className="relative z-10 mx-auto flex w-full max-w-[1220px] flex-col gap-[calc(var(--mc-unit)*2)] px-[calc(var(--mc-unit)*2)] py-[calc(var(--mc-unit)*2)]">
      <BackLink href="/" label="Home" />

      <header>
        <h1 className="text-mc-accent text-base md:text-lg">FREQUENTLY ASKED QUESTIONS</h1>
        <p className="mt-[calc(var(--mc-unit)*0.5)] text-mc-text-dim">
          Find answers to common questions about Gateways 2026. Tap a question to
          drop its sign.
        </p>
      </header>

      <FaqSigns groups={groups} />

      <section>
        <BlockPanel variant="gold" padded="lg" className="flex flex-col gap-[var(--mc-unit)]">
          <p className="text-[16px] leading-relaxed text-mc-text md:text-[18px]">
            Still stuck? The organising team is listed by role — registration,
            hospitality, and general enquiries each have their own contact.
          </p>
          <div className="flex flex-wrap gap-[calc(var(--mc-unit)*1.5)]">
            <Link
              href="/contact"
              className="font-pixel text-[9px] uppercase tracking-[0.1em] text-mc-accent no-underline hover:underline"
            >
              Contact us
            </Link>
            <Link
              href="/rules"
              className="font-pixel text-[9px] uppercase tracking-[0.1em] text-mc-accent no-underline hover:underline"
            >
              Rules &amp; regulations
            </Link>
            <Link
              href="/registration-process"
              className="font-pixel text-[9px] uppercase tracking-[0.1em] text-mc-accent no-underline hover:underline"
            >
              How to register
            </Link>
          </div>
        </BlockPanel>
      </section>
    </div>
  );
}
