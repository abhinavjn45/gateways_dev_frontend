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
  const faqs = [
    {
      question: "Q. Who can participate in Gateways 2026?",
      answer: "Ans. Gateways is a National Level IT Fest, and students from any college or university across India pursuing their UG or PG degrees can participate. Specific eligibility criteria for each event can be found on their respective pages."
    },
    {
      question: "Q. Is there any registration fee?",
      answer: "Ans. Yes, there is a nominal entry fee. Early bird registration is available at a discounted price. Check the 'Events' section for specific pricing details for individual and team events."
    },
    {
      question: "Q. Can I participate in multiple events?",
      answer: "Ans. Yes! You can participate in multiple events as long as their timings do not overlap. However, you can only register for one flagship or main event happening simultaneously."
    },
    {
      question: "Q. Do I need to be a part of a team?",
      answer: "Ans. Not necessarily. We have a mix of both individual and team events. For team events, you can either create a new team and invite members or join an existing team using a Team ID."
    },
    {
      question: "Q. Will accommodation be provided?",
      answer: "Ans. Yes, accommodation is provided from October 8 to October 9, 2026, on a first-come, first-served basis strictly for participants traveling from outside Bangalore."
    },
    {
      question: "Q. How will I receive updates regarding the events?",
      answer: "Ans. All updates, announcements, and schedules will be updated on your participant dashboard. Make sure to regularly check the portal and your registered email address."
    }
  ];

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

      <section className="mt-[calc(var(--mc-unit)*2)] flex flex-col gap-[calc(var(--mc-unit)*2)]">
        {faqs.map((faq, i) => (
          <BlockPanel key={i} variant="panel" padded="lg">
            <h2 className="font-pixel text-[18px] md:text-[22px] text-mc-gold-light mb-[calc(var(--mc-unit))]">
              {faq.question}
            </h2>
            <p className="text-[16px] md:text-[18px] text-mc-text leading-relaxed">
              {faq.answer}
            </p>
          </BlockPanel>
        ))}
      </section>
    </div>
  );
}
