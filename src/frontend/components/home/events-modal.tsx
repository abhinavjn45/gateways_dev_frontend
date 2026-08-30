"use client";

import { useState } from "react";
import Link from "next/link";
import { blockButton, BlockButton, BlockModal, BlockPanel } from "@/frontend/components/mc";
import {
  EVENT_TRACKS,
  eventsForTrack,
  fetchFestEvents,
  type EventTrack,
  type FestEvent,
} from "@/frontend/lib/events";
import { useAsync } from "@/frontend/hooks/use-async";
import { EventRegistrationButton } from "@/frontend/components/events/event-registration-button";
import { EventDetails } from "@/frontend/components/events/event-details";
import { cn } from "@/frontend/lib/utils";

/**
 * The full event list, in a modal.
 *
 * Deliberately not an inline homepage section: the fest has 13 events, and
 * dropping that table into the middle of the pitch pushes the registration
 * call-to-action far below the fold. A visitor who wants the list asks for it;
 * everyone else keeps scrolling the story.
 *
 * TWO LEVELS, one modal. The list is a browse surface — name and kind only,
 * enough to decide what to open — and picking one swaps the same modal over to
 * that event's full detail. Detail lives here rather than at `/events/<slug>`
 * because the visitor opened this from the homepage: sending them to a route
 * costs the modal, the scroll position, and the pitch they were reading, to
 * show information that fits in the panel already on screen.
 *
 * Data is `FEST_EVENTS`, not `repo` — see the note at the top of
 * `frontend/lib/events.ts` for why, and what changes when the backend's events
 * route is wired up (nothing here).
 */
/**
 * What the tab strip filters by.
 *
 * `"all"` is a VIEW, not a track, so it lives here rather than in
 * `EVENT_TRACKS` — that array describes how the fest is actually organised and
 * a third fake track in it would leak into anything else reading the data.
 */
type EventFilter = "all" | EventTrack;

const EVENT_FILTERS: { id: EventFilter; label: string }[] = [
  { id: "all", label: "All" },
  ...EVENT_TRACKS,
];

/** The events one tab shows. "All" is sheet order — which runs the eight
 *  technical events and then the five non-technical ones, the organisers' own
 *  sequence rather than a re-sort into something tidier. */
function eventsForFilter(allEvents: FestEvent[], filter: EventFilter): FestEvent[] {
  return filter === "all" ? allEvents : eventsForTrack(allEvents, filter);
}

export function EventsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [filter, setFilter] = useState<EventFilter>("all");
  const [selected, setSelected] = useState<FestEvent | null>(null);

  /**
   * Reopening lands on the list, never on whatever was last read.
   *
   * Adjusted during render rather than in an effect. An effect would be a
   * cascading render the compiler rightly rejects, and it would also have to
   * fire on CLOSE — `open` is owned by the parent, so no callback tells this
   * component it was reopened. Resetting on close means the panel swaps from
   * detail back to list underneath the exit animation, in full view. React
   * re-runs this render before painting, so the reset is invisible.
   */
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSelected(null);
  }

  const { data: allEventsData, loading } = useAsync(fetchFestEvents, []);
  const allEvents = allEventsData || [];

  const shown = eventsForFilter(allEvents, filter);

  return (
    <BlockModal
      open={open}
      onOpenChange={onOpenChange}
      // The heading follows the level, so the modal always says where it is.
      title={selected ? selected.name : "Events"}
      description={
        selected
          ? `${selected.kind}. Full details, rules and prizes.`
          : "Every event at the fest, split into technical and non-technical."
      }
      variant="panel"
      className="max-w-2xl"
      footer={
        selected ? (
          <div className="flex w-full flex-wrap items-center justify-between gap-[var(--mc-unit)]">
            <div className="flex flex-wrap items-center gap-[var(--mc-unit)]">
              <BlockButton variant="stone" size="sm" onClick={() => setSelected(null)}>
                ← All events
              </BlockButton>
              {selected.rulesUrl ? (
                <a
                  href={selected.rulesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    blockButton({ variant: "gold", size: "sm" }),
                    "no-underline",
                  )}
                >
                  Read the rules ↗
                </a>
              ) : null}
            </div>
            <div className="flex-1 sm:flex-none sm:min-w-[200px]">
              <EventRegistrationButton event={selected} />
            </div>
          </div>
        ) : (
          // The cva function rather than <BlockButton>: this navigates, so it
          // must be an anchor. Nesting a <Link> inside the component's <button>
          // would be invalid HTML and would break keyboard activation.
          <Link
            href="/events"
            onClick={() => onOpenChange(false)}
            className={cn(blockButton({ variant: "emerald", size: "sm" }), "no-underline")}
          >
            Open full events page
          </Link>
        )
      }
    >
      {selected ? (
        <EventDetails event={selected} />
      ) : loading ? (
        <div className="py-12 text-center text-mc-text-dim font-pixel text-[10px] uppercase">
          Loading events, please wait...
        </div>
      ) : (
        <>
          <nav
            aria-label="Filter events"
            className="mb-[calc(var(--mc-unit)*1.5)] flex flex-wrap gap-[calc(var(--mc-unit)*0.5)]"
          >
            {EVENT_FILTERS.map((f) => (
              <FilterTab
                key={f.id}
                label={f.label}
                count={eventsForFilter(allEvents, f.id).length}
                active={filter === f.id}
                onClick={() => setFilter(f.id)}
              />
            ))}
          </nav>

          <ul className="flex flex-col gap-[calc(var(--mc-unit)*0.75)]">
            {shown.map((e) => (
              <li key={e.slug}>
                <button
                  type="button"
                  onClick={() => setSelected(e)}
                  className="block w-full text-left"
                >
                  <BlockPanel
                    variant="slot"
                    padded="md"
                    className="transition-[filter] duration-75 hover:brightness-125"
                  >
                    <div className="flex flex-col gap-[calc(var(--mc-unit)*0.25)]">
                      <div className="flex flex-wrap items-baseline justify-between gap-[var(--mc-unit)]">
                        <h3 className="text-[10px] uppercase text-mc-accent md:text-[12px]">
                          {e.name}
                        </h3>
                        {/* The kind, not the name, is what tells a visitor what
                            they would be doing — these names give nothing away. */}
                        <span className="event-kind font-pixel text-[8px] uppercase tracking-[0.1em] text-mc-success">
                          {e.kind}
                        </span>
                      </div>
                      <p className="mt-[calc(var(--mc-unit)*0.5)] text-[16px] text-mc-text-dim">
                        {e.date}
                      </p>
                      <p className="text-[17px] text-mc-text-dim/80">
                        {e.participation}
                      </p>
                    </div>
                  </BlockPanel>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </BlockModal>
  );
}

function FilterTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "border-[length:var(--mc-bevel)] px-[var(--mc-unit)] py-[calc(var(--mc-unit)*0.5)]",
        "font-pixel text-[8px] uppercase tracking-[0.1em] transition-colors md:text-[9px]",
        active
          ? "border-mc-gold bg-mc-panel-light text-mc-accent"
          : "border-mc-border bg-mc-slot text-mc-text-dim hover:text-mc-text",
      )}
    >
      {label} <span className="text-mc-text-dim/70">({count})</span>
    </button>
  );
}
