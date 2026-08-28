"use client";

import { BlockPanel } from "@/frontend/components/mc";
import { eventSchedule, eventTimeOrTba, fetchFestEvents } from "@/frontend/lib/events";
import { useAsync } from "@/frontend/hooks/use-async";
import { cn } from "@/frontend/lib/utils";

/**
 * Fest schedule, grouped by day.
 *
 * Headless on purpose — no heading, no back link, no page padding. This list
 * renders in two places, the public /schedule page and /dashboard/schedule
 * inside the shell, which need different chrome around identical content.
 *
 * The homepage's `<ScheduleModal>` deliberately does NOT use this: it presents
 * the same data as day tabs rather than stacked sections. That is a different
 * view of the data, not a duplicate of this one.
 *
 * Source is `eventSchedule()`, not `repo.events.schedule()`. The data layer
 * answers that call from a stub and returns `[]`, so this list rendered empty
 * on both pages; `frontend/lib/events.ts` carries the real line-up. Times are
 * the organisers' own strings and are NOT parsed into Date objects — see the
 * note on `ScheduleDay` for why there is nothing here to convert.
 */
export function ScheduleList({ className }: { className?: string }) {
  const { data: allEventsData, loading } = useAsync(fetchFestEvents, []);
  const days = eventSchedule(allEventsData || []);

  return (
    <div className={cn("flex flex-col gap-[calc(var(--mc-unit)*1.5)]", className)}>
      {loading ? (
        <BlockPanel variant="slot" className="text-center p-8">
          <p className="text-mc-text-dim font-pixel text-[10px] uppercase">Loading schedule, please wait...</p>
        </BlockPanel>
      ) : days.length === 0 ? (
        <BlockPanel variant="slot" className="text-center p-8">
          <p className="text-mc-text-dim font-pixel text-[10px] uppercase">Schedule is empty.</p>
        </BlockPanel>
      ) : days.map((day) => (
        <section key={day.date}>
          {/* "Venue" is a COLUMN LABEL, not a value — it heads the right-hand
              column the rows below fill in. */}
          <div className="flex flex-wrap items-baseline justify-between gap-x-[var(--mc-unit)] gap-y-[2px]">
            <h3 className="schedule-date font-pixel text-[11px] uppercase text-mc-eyebrow">{day.date}</h3>
            <span className="font-pixel text-[9px] uppercase tracking-[0.1em] text-mc-text-dim">
              Venue
            </span>
          </div>
          <ol className="mt-[var(--mc-unit)] flex flex-col gap-[calc(var(--mc-unit)*0.5)]">
            {day.events.map((event) => (
              <li key={event.slug}>
                <BlockPanel
                  variant="panel"
                  padded="sm"
                  className="flex flex-wrap items-baseline gap-x-[var(--mc-unit)] gap-y-[2px]"
                >
                  {/* Not a <time>: "To be announced" is not a datetime, and a
                      <time> with no valid dateTime is worse than a span. */}
                  <span className="schedule-time font-pixel text-[10px] tabular-nums text-mc-accent-strong">
                    {eventTimeOrTba(event)}
                  </span>
                  <span className="flex-1 text-[19px] text-mc-text">
                    {event.name}
                    <span className="text-mc-text-dim"> — {event.kind}</span>
                  </span>
                  <span className="text-[17px] text-mc-text-dim">
                    {event.venue || "—"}
                  </span>
                </BlockPanel>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
