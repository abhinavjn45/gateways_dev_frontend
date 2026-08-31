"use client";

import Link from "next/link";
import { BackLink, BlockPanel } from "@/frontend/components/mc";
import { EVENT_TRACKS, eventsForTrack, fetchFestEvents } from "@/frontend/lib/events";
import { useAsync } from "@/frontend/hooks/use-async";

/**
 * Rules & Regulations.
 *
 * Two layers, because that is how the fest actually works: a short set of
 * fest-wide rules that bind every participant, and then each event's own rules
 * document. The per-event links are read straight off the events sheet rather
 * than being listed here, so an event added to the sheet appears on this page
 * without anyone remembering to update it.
 *
 * Events are FETCHED, not imported: they come from a CSV at runtime, so this
 * renders the fest-wide rules immediately and fills the per-event grids in when
 * they arrive. Those rules are the half a visitor most often came for and they
 * do not depend on the sheet, so blocking the whole page on the fetch would be
 * the wrong trade.
 */
export function RulesScreen() {
  const { data: allEventsData, loading: eventsLoading } = useAsync(fetchFestEvents, []);
  const allEvents = allEventsData || [];

  const festWide = [
    "Registration is through this website only. A pass bought at one tier cannot be claimed at another.",
    "Carry your institution ID card and an undertaking letter from your institution to every event.",
    "Report at the venue at least 15 minutes before your event starts. Late entry is at the event head's discretion.",
    "Eligibility, team size and format are set per event — read that event's rules document before you register.",
    "Participants are responsible for any damage they cause to CHRIST (Deemed to be University) property.",
    "Failure to follow the decorum of the fest may lead to elimination from the event.",
    "The Organising Committee's decision on any dispute is final, and it reserves the right to amend these rules for the smooth conduct of the fest.",
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-[calc(var(--mc-unit)*2)] px-[calc(var(--mc-unit)*2)] py-[calc(var(--mc-unit)*2)]">
      <BackLink href="/" label="Home" />

      <header>
        <h1 className="text-mc-accent text-base md:text-lg">RULES &amp; REGULATIONS</h1>
        <p className="mt-[calc(var(--mc-unit)*0.5)] text-mc-text-dim">
          The rules that apply across Gateways 2026, and where to find the rules
          for each event.
        </p>
      </header>

      <section>
        <h2 className="font-pixel text-[11px] uppercase text-mc-text-dim">Fest-wide rules</h2>
        <BlockPanel variant="panel" padded="lg" className="mt-[var(--mc-unit)]">
          <ul className="flex list-decimal flex-col gap-[calc(var(--mc-unit)*1.25)] pl-[calc(var(--mc-unit)*2.5)] text-[16px] leading-relaxed text-mc-text md:text-[18px]">
            {festWide.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </BlockPanel>
      </section>

      {EVENT_TRACKS.map((track) => (
        <section key={track.id}>
          <h2 className="font-pixel text-[11px] uppercase text-mc-text-dim">
            {track.label} — event rules
          </h2>
          {/* Says which of the two empty states this is. A bare empty grid
              reads as "this track has no events", which is wrong while the
              sheet is still in flight and would send a visitor away. */}
          {eventsLoading ? (
            <p className="mt-[var(--mc-unit)] text-[17px] text-mc-text-dim">
              Loading events…
            </p>
          ) : null}
          <ul className="mt-[var(--mc-unit)] grid gap-[var(--mc-unit)] sm:grid-cols-2 lg:grid-cols-3">
            {eventsForTrack(allEvents, track.id).map((event) => (
              <li key={event.slug}>
                <BlockPanel
                  variant="panel"
                  padded="lg"
                  className="flex h-full flex-col gap-[calc(var(--mc-unit)*0.5)]"
                >
                  <p className="font-pixel text-[11px] text-mc-success">{event.name}</p>
                  <p className="text-[16px] text-mc-text-dim md:text-[18px]">{event.kind}</p>
                  <div className="mt-auto flex flex-wrap gap-[var(--mc-unit)] pt-[var(--mc-unit)]">
                    <Link
                      href={`/events/${event.slug}`}
                      className="font-pixel text-[9px] uppercase tracking-[0.1em] text-mc-accent no-underline hover:underline"
                    >
                      Event page
                    </Link>
                    {/* Absent for events whose sheet row has no document yet —
                        the link is dropped rather than rendered dead. */}
                    {event.rulesUrl ? (
                      <a
                        href={event.rulesUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-pixel text-[9px] uppercase tracking-[0.1em] text-mc-accent no-underline hover:underline"
                      >
                        Full rules ↗
                      </a>
                    ) : null}
                  </div>
                </BlockPanel>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
