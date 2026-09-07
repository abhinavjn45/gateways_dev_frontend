import { eventTime, type FestEvent } from "@/frontend/lib/events";
import type { RoomAnchor, RoomBinding } from "./engine-types";

/**
 * Binds the live event list onto the campus's numbered classroom slots.
 *
 * Pure and deterministic, so the same sheet always yields the same building:
 * technical events first, then non-technical, each in sheet order — and the
 * generator fills the wings north → east → west → south, so the technical
 * track ends up along the north wing and the rest wrap round from there.
 *
 * Slots left over after the events get the configured spare signage
 * (Sponsors' Pavilion, Leaderboard…) and then "Coming soon". Events beyond the
 * slot count are returned as `overflow` so the List view can still show them;
 * the world itself needs `world.slots` raised and `npm run mc:assets` rerun.
 */

export interface SpareSign {
  label: string;
  lines: string[];
}

export interface BindOptions {
  spare: readonly SpareSign[];
  comingSoon: SpareSign;
}

export interface BindResult {
  bindings: RoomBinding[];
  overflow: FestEvent[];
}

/** Greedy word wrap to `maxChars` per line, at most `maxLines` lines. */
export function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars) {
      cur = next;
      continue;
    }
    if (cur) out.push(cur);
    cur = w.length > maxChars ? `${w.slice(0, maxChars - 1)}…` : w;
    if (out.length === maxLines - 1) break;
  }
  if (cur && out.length < maxLines) out.push(cur);
  return out.length ? out : [""];
}

/** The order events take their rooms in: by track, then as the sheet lists them. */
export function orderForRooms(events: readonly FestEvent[]): FestEvent[] {
  const technical = events.filter((e) => e.track === "technical");
  const other = events.filter((e) => e.track !== "technical");
  return [...technical, ...other];
}

function boardLinesFor(event: FestEvent): string[] {
  const time = eventTime(event);
  return [
    event.kind,
    event.date,
    /^tba$/i.test(time) ? "" : time,
    event.venue ? `Venue: ${event.venue}` : "",
    event.prizePool ? `Prize pool: ${event.prizePool}` : "",
    event.participation,
  ].filter((line) => line && line.trim() !== "");
}

export function bindEventsToRooms(
  events: readonly FestEvent[],
  rooms: readonly RoomAnchor[],
  options: BindOptions,
): BindResult {
  const ordered = orderForRooms(events);
  const bindings: RoomBinding[] = [];
  let spareUsed = 0;

  rooms.forEach((room, i) => {
    const event = ordered[i];
    if (event) {
      bindings.push({
        index: room.index,
        slug: event.slug,
        label: event.name,
        signLines: wrapLines(event.name, 14, 3),
        boardLines: boardLinesFor(event),
        interactive: true,
      });
      return;
    }
    const sign = options.spare[spareUsed] ?? options.comingSoon;
    if (spareUsed < options.spare.length) spareUsed += 1;
    bindings.push({
      index: room.index,
      slug: null,
      label: sign.label,
      signLines: sign.lines,
      boardLines: [],
      interactive: false,
    });
  });

  return { bindings, overflow: ordered.slice(rooms.length) };
}

/** The slot an event was bound to, if it got one. */
export function roomIndexForEvent(bindings: readonly RoomBinding[], slug: string): number | null {
  const hit = bindings.find((b) => b.slug === slug);
  return hit ? hit.index : null;
}
