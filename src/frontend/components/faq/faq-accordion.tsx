"use client";

import { BlockPanel } from "@/frontend/components/mc";
import type { FaqEntry } from "@/frontend/lib/chatbot-faq";
import type { SignGroup } from "./faq-sign-layer";

/**
 * The FAQ as a plain accordion.
 *
 * NOT A FALLBACK BOLTED ON AFTERWARDS — this is what the server renders, what
 * every phone gets, what anyone who prefers reduced motion gets, and what is
 * left standing if WebGL is unavailable. The hanging signs replace it only once
 * every check in `faq-signs.tsx` has passed. A `/faq` with no JavaScript at all
 * is fully functional, because this is the baseline rather than the degradation.
 *
 * CONTROLLED, unlike the `<details>` element it is built on. `open` lives in
 * `faq-signs.tsx` and is shared with the 3D layer, so switching between the two
 * — on a resize across the breakpoint, or on the reduced-motion toggle —
 * preserves which answers the reader had open.
 */
export function FaqAccordion({
  groups,
  open,
  onToggle,
}: {
  groups: SignGroup[];
  open: ReadonlySet<string>;
  onToggle: (question: string) => void;
}) {
  return (
    <>
      {groups.map((group) => (
        <section key={group.category}>
          <h2 className="font-pixel text-[11px] uppercase text-mc-text-dim">{group.category}</h2>
          <ul className="mt-[var(--mc-unit)] flex flex-col gap-[var(--mc-unit)]">
            {group.entries.map((entry) => (
              <li key={entry.question}>
                <FaqItem
                  entry={entry}
                  open={open.has(entry.question)}
                  onToggle={() => onToggle(entry.question)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

/**
 * One collapsed question.
 *
 * Native `<details>`/`<summary>` rather than a div-and-state accordion: it is
 * keyboard-operable, announced correctly by screen readers, and findable by the
 * browser's own in-page search — all of which a hand-rolled version has to
 * rebuild and usually gets wrong.
 */
function FaqItem({
  entry,
  open,
  onToggle,
}: {
  entry: FaqEntry;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <BlockPanel variant="panel" padded="none">
      <details
        className="group"
        open={open}
        // `toggle` fires for clicks, keyboard activation AND find-in-page
        // auto-expansion, which a click handler on the summary would miss.
        // Guarded so echoing our own controlled state back is not a loop.
        onToggle={(e) => {
          if (e.currentTarget.open !== open) onToggle();
        }}
      >
        <summary
          className={
            // `list-none` plus the WebKit marker rule kills the default
            // disclosure triangle, which is an OS glyph and looks wrong next to
            // pixel type. The chevron below replaces it.
            "flex cursor-pointer list-none items-center justify-between gap-[calc(var(--mc-unit)*1.5)] " +
            "p-[calc(var(--mc-unit)*1.5)] min-h-11 " +
            "transition-colors hover:bg-mc-slot/40 " +
            "focus-visible:outline focus-visible:outline-[length:var(--mc-bevel)] " +
            "focus-visible:outline-mc-accent " +
            "[&::-webkit-details-marker]:hidden"
          }
        >
          <span className="text-[16px] leading-snug text-mc-text md:text-[18px]">
            {entry.question}
          </span>
          <Chevron />
        </summary>

        <div className="px-[calc(var(--mc-unit)*1.5)] pb-[calc(var(--mc-unit)*1.5)]">
          <p className="border-t-[length:var(--mc-bevel)] border-mc-border pt-[calc(var(--mc-unit)*1.25)] text-[16px] leading-relaxed text-mc-text-dim md:text-[18px]">
            {entry.answer}
          </p>
        </div>
      </details>
    </BlockPanel>
  );
}

/**
 * The open/close marker: a chevron pointing down at the row's right edge,
 * flipping to point up once the answer is out.
 *
 * Three stacked bars rather than an SVG or a font glyph — the same construction
 * the hero's scroll cue uses. A glyph would be drawn by whatever font the OS
 * substitutes and lands wherever its metrics put it; bars sized in --mc-unit
 * stay on the pixel grid at every --mc-scale.
 */
function Chevron() {
  return (
    <span
      aria-hidden
      className="flex shrink-0 flex-col items-center gap-0 transition-transform duration-150 group-open:rotate-180"
    >
      <span className="block h-[calc(var(--mc-unit)*0.5)] w-[calc(var(--mc-unit)*2.5)] bg-mc-accent" />
      <span className="block h-[calc(var(--mc-unit)*0.5)] w-[calc(var(--mc-unit)*1.5)] bg-mc-accent" />
      <span className="block h-[calc(var(--mc-unit)*0.5)] w-[calc(var(--mc-unit)*0.5)] bg-mc-accent" />
    </span>
  );
}
