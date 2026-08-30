"use client";

import Link from "next/link";
import { BackLink, BlockPanel, blockButton } from "@/frontend/components/mc";
import { FEST, feeWindow, inr } from "@/frontend/lib/fest";

/**
 * The registration walkthrough as its own page, linked from the footer.
 *
 * Both the steps and the fee tiers come from `FEST` rather than being retyped:
 * this page and the homepage's register section have to agree, and a fee that
 * changes in one place and not the other is exactly the bug that costs a
 * participant money at the gate.
 */
export function RegistrationProcessScreen() {
  return (
    <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-[calc(var(--mc-unit)*2)] px-[calc(var(--mc-unit)*2)] py-[calc(var(--mc-unit)*2)]">
      <BackLink href="/" label="Home" />

      <header>
        <h1 className="text-mc-accent text-base md:text-lg">REGISTRATION PROCESS</h1>
        <p className="mt-[calc(var(--mc-unit)*0.5)] text-mc-text-dim">
          Pay once, then register for as many events as you like — here is the
          order it happens in.
        </p>
      </header>

      <section>
        <BlockPanel variant="panel" padded="lg">
          <ol className="flex flex-col gap-[calc(var(--mc-unit)*1.25)]">
            {FEST.registerSteps.map((step, i) => (
              <li
                key={step}
                className="flex items-start gap-[var(--mc-unit)] text-[16px] leading-relaxed text-mc-text md:text-[18px]"
              >
                <span
                  aria-hidden
                  className="flex h-[28px] w-[28px] shrink-0 items-center justify-center bg-mc-slot font-pixel text-[9px] text-mc-accent bevel-inset"
                >
                  {i + 1}
                </span>
                <span className="pt-[3px]">{step}</span>
              </li>
            ))}
          </ol>
        </BlockPanel>
      </section>

      <section>
        <h2 className="font-pixel text-[11px] uppercase text-mc-text-dim">Entry fees</h2>
        <BlockPanel variant="panel" padded="lg" className="mt-[var(--mc-unit)]">
          <ul className="flex flex-col gap-[calc(var(--mc-unit)*1.25)]">
            {FEST.money.tiers.map((tier) => (
              <li
                key={tier.id}
                className="flex flex-wrap items-baseline justify-between gap-[var(--mc-unit)]"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="text-[16px] text-mc-text md:text-[18px]">
                    {tier.label}
                    {tier.note ? ` — ${tier.note}` : ""}
                  </span>
                  <span className="text-[15px] text-mc-text-dim md:text-[17px]">
                    {feeWindow(tier.opensOn, tier.closesOn)}
                  </span>
                </div>
                <span className="font-pixel text-[14px] text-mc-accent md:text-[16px]">
                  {inr(tier.amountInr)}
                </span>
              </li>
            ))}
          </ul>
        </BlockPanel>
      </section>

      <section>
        <BlockPanel variant="panel" padded="lg" className="flex flex-col gap-[var(--mc-unit)]">
          <p className="text-[16px] leading-relaxed text-mc-text md:text-[18px]">
            One pass covers every event a participant enters. Event registration
            opens as soon as we verify your payment receipt.
          </p>
          <div>
            <Link href={FEST.links.register} className={blockButton({ variant: "gold" })}>
              Browse events
            </Link>
          </div>
        </BlockPanel>
      </section>
    </div>
  );
}
