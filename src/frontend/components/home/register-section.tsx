"use client";

import { blockButton, BlockPanel } from "@/frontend/components/mc";
import { RegisterDecor } from "@/frontend/components/decor";
import { FEST, feeWindow, inr } from "@/frontend/lib/fest";
import { cn } from "@/frontend/lib/utils";
import { HomeSection } from "./home-section";

/**
 * How to register, plus accommodation.
 *
 * Laid out as a crafting recipe: the numbered steps are the recipe, the price
 * panel beside them is the output. Registration itself happens on an external
 * form (as it did in 2025) — this section's only job is to make the process
 * legible before someone leaves the site for it.
 *
 * `FEST.links.register` now points at an on-site route. The external-link
 * handling below is kept rather than deleted: the value is data, and a future
 * edition that does hand registration to an external form should not need a
 * component change to stop opening it in the same tab.
 */
/**
 * Looked up by ROLE, not by index. `FEST.contacts` is marked TODO for the 2026
 * team, so it will be rewritten wholesale; a positional pick would silently
 * start showing the hospitality lead on a registration panel.
 */
const registrationContact = FEST.contacts.find(
  (c) => c.role === "Registration & Payments" && c.phone,
);

export function RegisterSection() {
  const isExternal = FEST.links.register.startsWith("http");

  return (
    <HomeSection
      id="register"
      eyebrow="Take part"
      decor={<RegisterDecor />}
      title="How to Register"
      lead={
        <>
          One pass covers every event. Registration fees start at{" "}
          <strong className="text-mc-accent">
            {inr(FEST.money.registration.earlyBirdInr)}
          </strong>{" "}
          for early birds — international participants pay a flat{" "}
          <strong className="text-mc-accent">
            {inr(FEST.money.registration.internationalInr)}
          </strong>.
        </>
      }
    >
      <div className="grid gap-[calc(var(--mc-unit)*1.5)] lg:grid-cols-[1.6fr_1fr]">
        {/* No `h-max`: it stopped this panel stretching to the grid row, so the
            two columns ended at different heights on every desktop width.
            No padding on the <ol> either — BlockPanel moves `padded` to an
            inner wrapper when `title` is set, so a pad here stacked on top of
            it and pushed the steps 1.5 units further in than the fee rows
            beside them. That offset was the visible misalignment.

            The flex pair (`flex flex-col` on the panel, `flex flex-1 flex-col`
            on its body) is what lets the help strip below sit on `mt-auto`.
            Stretching to the row is what aligns the columns; without this the
            slack all pooled UNDER the last step as dead space inside a
            bordered panel, which is worse than the ragged edge it fixed. */}
        <BlockPanel
          variant="gold"
          padded="lg"
          title="The recipe"
          className="flex flex-col"
          bodyClassName="flex flex-1 flex-col"
        >
          {/* `flex-1 justify-between`, not a fixed stack: the panel is stretched
              to the grid row, and the slack has to go somewhere. Spread across
              the six gaps it reads as a list sized to its card; pooled under
              the last step it read as a half-empty box. `gap` still sets the
              MINIMUM, so nothing collapses at widths where the column is tight
              and there is no slack to distribute. */}
          <ol className="flex flex-1 flex-col justify-between gap-[var(--mc-unit)] pb-[calc(var(--mc-unit)*1.5)]">
            {FEST.registerSteps.map((step, i) => (
              <li
                key={step}
                className="flex items-start gap-[var(--mc-unit)] text-[20px] leading-snug text-mc-text md:text-[22px]"
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

          {/* Fills the slack the stretch creates, and earns the space: the
              question a numbered how-to leaves you with is "what if I get
              stuck on one of these", and the answer is a real person already
              in FEST.contacts. Not decoration — the same fact the contact
              section further down carries, put where it is needed. */}
          {registrationContact ? (
            <div className="mt-auto flex flex-wrap items-baseline justify-between gap-[var(--mc-unit)] border-t-[length:var(--mc-bevel)] border-mc-border pt-[calc(var(--mc-unit)*1.5)]">
              <span className="font-pixel text-[8px] uppercase tracking-[0.18em] text-mc-eyebrow md:text-[9px]">
                Stuck on a step?
              </span>
              <span className="text-[17px] leading-snug text-mc-text-dim">
                {registrationContact.name} ·{" "}
                <a
                  href={`tel:${registrationContact.phone.replace(/\s+/g, "")}`}
                  className="text-mc-accent no-underline hover:underline"
                >
                  {registrationContact.phone}
                </a>
              </span>
            </div>
          ) : null}
        </BlockPanel>

        <div className="flex flex-col gap-[calc(var(--mc-unit)*1.5)]">
          <BlockPanel
            variant="slot"
            padded="lg"
            className="flex flex-col gap-[calc(var(--mc-unit)*0.75)]"
          >
            <h3 className="text-[10px] uppercase text-mc-success md:text-[12px]">
              Entry fees
            </h3>
            <ul className="flex flex-col gap-[calc(var(--mc-unit)*1.5)]">
              {FEST.money.tiers.map((tier) => (
                <FeeRow
                  key={tier.id}
                  label={tier.note ? `${tier.label} — ${tier.note}` : tier.label}
                  window={feeWindow(tier.opensOn, tier.closesOn)}
                  amountInr={tier.amountInr}
                />
              ))}
            </ul>
            <p className="text-[17px] leading-snug text-mc-text-dim">
              Per person. One pass covers every event you enter.
            </p>
          </BlockPanel>

          <BlockPanel
            variant="slot"
            padded="lg"
            className="flex flex-col gap-[calc(var(--mc-unit)*0.75)]"
          >
            <h3 className="text-[10px] uppercase text-mc-success md:text-[12px]">
              Accommodation
            </h3>
            <p className="flex items-baseline gap-2 font-pixel text-[18px] text-mc-accent md:text-[22px]">
              <span>{inr(FEST.money.accommodationPerDayInr)}</span>
              <span className="text-[10px] text-mc-text-dim leading-snug tracking-normal">+ GST</span>
            </p>
            <p className="text-[19px] leading-snug text-mc-text-dim">
              {FEST.money.accommodationNote}. Allotted first-come, first-served;
              payable on arrival. Ask the hospitality contact below.
            </p>
          </BlockPanel>

        </div>

        {/* The cva classes on an anchor, not a <BlockButton> inside one —
            an <a> wrapping a <button> is invalid HTML and swallows the
            anchor's keyboard activation. */}
        <div className="flex w-full flex-col gap-[calc(var(--mc-unit)*1.5)] sm:flex-row lg:col-span-2">
          <a
            href={FEST.links.register}
            {...(isExternal
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className={cn(
              blockButton({ variant: "gold", size: "lg", block: true }),
              "no-underline flex-1",
            )}
          >
            Browse events and register
          </a>

          <a
            href={FEST.links.brochure}
            {...(FEST.links.brochure.startsWith("http")
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className={cn(
              blockButton({ variant: "ghost", size: "lg", block: true }),
              "no-underline flex-1 text-mc-text-dim hover:text-mc-accent",
            )}
          >
            Read the brochure ↗
          </a>
        </div>
      </div>
    </HomeSection>
  );
}

/**
 * One fee tier: name and window on the left, price on the right.
 *
 * The five rows were written out longhand and had already drifted apart from
 * each other and from `/registration-process`. They are one component and one
 * data source now, which is what stops that happening again.
 *
 * Three things here are doing alignment work:
 *
 *  - `items-baseline`, not `items-center`. The label is two lines and the price
 *    is one, so centring floated every price into the gap between a tier's name
 *    and its dates. On the baseline it sits on the name, where it belongs.
 *  - The window drops to 14px and `text-mc-text-dim/70`. At 17px against an
 *    18px label neither line was dominant and the row read as two equal facts.
 *  - `tabular-nums` plus a right-aligned `min-w`. `justify-between` alone
 *    right-aligns each price against ITS OWN label, so with five labels of
 *    different widths the prices never formed a straight edge; the min-width
 *    gives them a common column and tabular figures keep the digits on a grid.
 */
function FeeRow({
  label,
  window: validity,
  amountInr,
}: {
  label: string;
  window: string;
  amountInr: number;
}) {
  return (
    <li className="flex items-baseline justify-between gap-[calc(var(--mc-unit)*1.5)]">
      <div className="flex min-w-0 flex-col">
        <span className="text-[18px] leading-snug text-mc-text-dim">{label}</span>
        <span className="text-[14px] leading-snug text-mc-text-dim/70">
          {validity}
        </span>
      </div>
      <span className="shrink-0 min-w-[7ch] text-right font-pixel text-[16px] tabular-nums text-mc-accent md:text-[18px]">
        {inr(amountInr)}
      </span>
    </li>
  );
}
