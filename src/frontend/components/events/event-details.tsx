/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { BlockPanel } from "@/frontend/components/mc";
import { eventTime, type FestEvent } from "@/frontend/lib/events";
import { EventRegistrationButton } from "./event-registration-button";

/**
 * One event, in full — description plus the facts grid.
 *
 * Shared by the homepage's `<EventsModal>` and the `/events` page, which show
 * the same information and must not drift. The rules link is deliberately NOT
 * here: both callers present it as a footer action next to their own back
 * control, and a second copy inside the body would double it up.
 */
export function EventDetails({ event }: { event: FestEvent }) {
  return (
    <div className="flex flex-col gap-[calc(var(--mc-unit)*1.25)]">
      <p className="event-kind font-pixel text-[8px] uppercase tracking-[0.1em] text-mc-success">
        {event.kind}
      </p>

      <p className="text-[19px] leading-snug text-mc-text">{event.description}</p>

      <BlockPanel variant="slot" padded="md">
        <dl className="grid gap-x-[calc(var(--mc-unit)*1.5)] gap-y-[var(--mc-unit)] sm:grid-cols-2">
          <Fact label="Participation" value={event.participation} />
          <Fact label="Date" value={event.date} />
          <Fact label="Time" value={eventTime(event)} />
          <Fact label="Venue" value={event.venue} />
          <Fact label="Prizes" value={event.prizes} />
          <Fact label="Prize pool" value={event.prizePool} />
          {event.maxSlots ? <Fact label="Maximum Slots" value={event.maxSlots} /> : null}
        </dl>
      </BlockPanel>
    </div>
  );
}

/**
 * One labelled fact. Renders nothing when the sheet has no value — an empty
 * row under a heading reads as a loading failure rather than as "unknown",
 * and "TBA" is a real value the organisers wrote, so it is shown as given.
 */
function Fact({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="font-pixel text-[8px] uppercase tracking-[0.1em] text-mc-eyebrow">
        {label}
      </dt>
      <dd className="mt-[calc(var(--mc-unit)*0.25)] text-[18px] leading-snug text-mc-text-dim">
        {value}
      </dd>
    </div>
  );
}
