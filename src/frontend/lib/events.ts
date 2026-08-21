/**
 * THE SINGLE SOURCE OF TRUTH FOR THE EVENT LINE-UP.
 *
 * Transcribed from the organisers' events sheet. A static file rather than a
 * `repo` call, deliberately and for now: `src/lib/data/index.ts` implements
 * `auth.*` against the real backend and answers every other domain from a
 * catch-all stub, so `repo.events.list()` returns `[]` here and anything built
 * on it renders empty. The line-up is also fixed for the edition and changes by
 * someone editing a spreadsheet, not by a user action — the same argument that
 * already puts the roster in `team.ts` and the photo set in `gallery.ts`.
 *
 * When the backend's `/api/v1/events` route is wired into the data layer, this
 * becomes the seed for it and the screens do not change: they consume
 * `eventsForTrack()` and `FEST_EVENTS`, never a literal.
 */

/**
 * The two halves of the line-up, and the modal's tabs.
 *
 * The sheet spells the non-technical side three ways across its rows
 * ("Non-Technical" and "Non Technical"), so the track is normalised to this
 * union on the way in rather than compared as free text at render time.
 */
export type EventTrack = "technical" | "non-technical";

export const EVENT_TRACKS: { id: EventTrack; label: string }[] = [
  { id: "technical", label: "Technical" },
  { id: "non-technical", label: "Non-Technical" },
];

export interface FestEvent {
  /** Stable key, derived from the name. Also the `/events/<slug>` handle. */
  slug: string;
  /** The event's own name — "24° Shift". */
  name: string;
  /**
   * WHAT KIND of event it is — "24 Hour Hackathon", "IT Quiz", "Photography".
   * The names are deliberately cryptic, so the card shows both: the name is the
   * identity and this is the only thing that tells a visitor what they would
   * actually be doing.
   */
  kind: string;
  track: EventTrack;
  description: string;
  /** "Individual", "Team of 2 Members", … — free text, the sheet varies. */
  participation: string;
  date: string;
  venue: string;
  /** Either may be "TBA"; `eventTime()` below folds that case. */
  timeFrom: string;
  timeTo: string;
  prizes: string;
  prizePool: string;
  /** Google Doc of the full rules. Absent if the sheet has no link. */
  rulesUrl?: string;
}

export const FEST_EVENTS: FestEvent[] = [
  {
    slug: "24-shift",
    name: "24° Shift",
    kind: "24 Hour Hackathon",
    track: "technical",
    description: "A 24-hour build sprint where teams turn a cryptic brief into a working solution, pushing creativity, execution, and perspective to the limit.",
    participation: "Team of 2-4 Members",
    date: "30th September - 01st October, 2026",
    venue: "Online",
    timeFrom: "10:00 AM",
    timeTo: "10:00 AM",
    prizes: "Winner, 1st Runner-ups, and 2nd Runner-ups",
    prizePool: "TBA",
    rulesUrl: "https://docs.google.com/document/d/1-C9U3Aq6IbIum4RSiM3ztNYppbBjweacv4ugnNDGBlo/edit?usp=drive_link",
  },
  {
    slug: "deviation",
    name: "Deviation",
    kind: "IT Quiz",
    track: "technical",
    description: "A mind-bending IT quiz where familiar answers hide unexpected twists, testing how quickly you can spot what deviates from the obvious.",
    participation: "Team of 2 Members",
    date: "8th & 9th October 2026",
    venue: "Offline on-campus",
    timeFrom: "TBA",
    timeTo: "TBA",
    prizes: "Winner, 1st Runner-ups, and 2nd Runner-ups",
    prizePool: "TBA",
    rulesUrl: "https://docs.google.com/document/d/1wOYCyd_9Fpyp2wUl1wnsnkQOOYcCTGCcIfZc6bmHZ7o/edit?usp=sharing",
  },
  {
    slug: "pixel-paradox",
    name: "Pixel Paradox",
    kind: "UI/UX",
    track: "technical",
    description: "Design cutting edge interfaces for technologies, turning unconventional prompts into bold, intuitive experiences under time pressure.",
    participation: "Team of 2 Members",
    date: "8th & 9th October 2026",
    venue: "Offline on-campus",
    timeFrom: "TBA",
    timeTo: "TBA",
    prizes: "Winner, 1st Runner-ups, and 2nd Runner-ups",
    prizePool: "TBA",
    rulesUrl: "https://docs.google.com/document/d/1pBdmNK8FVUw2Ivlkftcm3NNeFz2PdTnpiH7MFUtXGAA/edit?usp=sharing",
  },
  {
    slug: "the-last-commit",
    name: "The Last Commit",
    kind: "Coding/Debugging",
    track: "technical",
    description: "Race against the clock to diagnose and fix deliberately broken code using strategic edits, where every bug could be hiding in plain sight.",
    participation: "Team of 2 Members",
    date: "8th & 9th October 2026",
    venue: "Offline on-campus",
    timeFrom: "TBA",
    timeTo: "TBA",
    prizes: "Winner, 1st Runner-ups, and 2nd Runner-ups",
    prizePool: "TBA",
    rulesUrl: "https://docs.google.com/document/d/1YsGG4V1yartshMuDNMZ6oIWTyZhhlekiRD9kBPmBd0c/edit?usp=sharing",
  },
  {
    slug: "promptx",
    name: "PromptX",
    kind: "Prompt Engineering",
    track: "technical",
    description: "Tackle ambiguous challenges by crafting precise prompts that push AI beyond predictable answers while navigating constraints, adversarial inputs, and hallucinations.",
    participation: "Individual",
    date: "8th & 9th October 2026",
    venue: "Offline on-campus",
    timeFrom: "TBA",
    timeTo: "TBA",
    prizes: "Winner, 1st Runner-up, and 2nd Runner-up",
    prizePool: "TBA",
    rulesUrl: "https://docs.google.com/document/d/1IEpiMRbgjr9f2OoUFNln7CR1U1X2HXJ6cyhRPbuajr4/edit?usp=sharing",
  },
  {
    slug: "renderrush",
    name: "RenderRush",
    kind: "3D Modelling",
    track: "technical",
    description: "Transform a themed brief into a polished 3D scene, asset, or product, where technical precision, visual depth, and storytelling all matter.",
    participation: "Team of 1 - 3 Members",
    date: "8th & 9th October 2026",
    venue: "Offline on-campus",
    timeFrom: "TBA",
    timeTo: "TBA",
    prizes: "Winner, 1st Runner-up, and 2nd Runner-up",
    prizePool: "TBA",
    rulesUrl: "https://docs.google.com/document/d/1spaDAdwrGFX-jculqUFEKS00wxd3xg9oHo0_1tMI_kk/edit?usp=sharing",
  },
  {
    slug: "alternate-thesis",
    name: "Alternate Thesis",
    kind: "Paper Presentation",
    track: "technical",
    description: "Present original research and defend your ideas, demonstrating technical depth, evidence, and the ability to approach questions from unexpected angles.",
    participation: "Individual",
    date: "8th & 9th October 2026",
    venue: "Offline on-campus",
    timeFrom: "TBA",
    timeTo: "TBA",
    prizes: "Winner, 1st Runner-up, and 2nd Runner-up",
    prizePool: "TBA",
    rulesUrl: "https://docs.google.com/document/d/1zsI1TyWFzXNG_Q99S-ewaExhK1XW0MBvqsGfC_JwOsw/edit?usp=sharing",
  },
  {
    slug: "in-perspective",
    name: "In Perspective",
    kind: "Poster Presentation",
    track: "technical",
    description: "Turn a complex technical idea into a compelling visual argument, balancing research, clarity, design, and the power to communicate at a glance.",
    participation: "Individual",
    date: "8th & 9th October 2026",
    venue: "Offline on-campus",
    timeFrom: "TBA",
    timeTo: "TBA",
    prizes: "Winner, 1st Runner-up, and 2nd Runner-up",
    prizePool: "TBA",
    rulesUrl: "https://docs.google.com/document/d/1wfGGeDVwkTsQvI5n4dApa9itqVB26PUsAuFksGfUe0w/edit?usp=sharing",
  },
  {
    slug: "the-twin-directive",
    name: "The Twin Directive",
    kind: "IT Manager",
    track: "non-technical",
    description: "Step into the role of an IT leader and navigate strategic challenges, making critical decisions that balance technology, people, and business.",
    participation: "Individual",
    date: "8th & 9th October 2026",
    venue: "Offline on-campus",
    timeFrom: "TBA",
    timeTo: "TBA",
    prizes: "Winner, 1st Runner-up, and 2nd Runner-up",
    prizePool: "TBA",
    rulesUrl: "https://docs.google.com/document/d/1HgCl8e4SZH38Ca1-ed5rJ7vqCnFKvS2fU-1lBZmAgQw/edit?usp=sharing",
  },
  {
    slug: "twin-protocol",
    name: "Twin Protocol",
    kind: "Treasure Hunt",
    track: "non-technical",
    description: "Follow a trail of clues where every discovery reveals another layer, shifting perspectives and connecting the pieces to uncover the final destination.",
    participation: "Team of 2 - 4 Members",
    date: "8th & 9th October 2026",
    venue: "Offline on-campus",
    timeFrom: "TBA",
    timeTo: "TBA",
    prizes: "Winner, 1st Runner-ups, and 2nd Runner-ups",
    prizePool: "TBA",
    rulesUrl: "https://docs.google.com/document/d/1u-BLiQApwGBniGpkfPP3OKziQmqzX1CLGptQV6XjOBk/edit?usp=sharing",
  },
  {
    slug: "pixel-quest",
    name: "Pixel Quest",
    kind: "Photography",
    track: "non-technical",
    description: "Turn your lens toward the unexpected, capturing fleeting moments, striking perspectives, and details that tell a story.",
    participation: "Individual",
    date: "8th & 9th October 2026",
    venue: "Offline on-campus",
    timeFrom: "TBA",
    timeTo: "TBA",
    prizes: "Winner, 1st Runner-up, and 2nd Runner-up",
    prizePool: "TBA",
    rulesUrl: "https://docs.google.com/document/d/1DepT640V7mRrxl7Nvevl7kbSiVWsMuMHKqKm_V6QpLg/edit?usp=sharing",
  },
  {
    slug: "mystery-block",
    name: "Mystery Block",
    kind: "Surprise Event",
    track: "non-technical",
    description: "A mystery challenge revealed only when you enter adapt quickly, think differently, and uncover what the event has in store.",
    participation: "Team of 2 - 4 Members",
    date: "8th & 9th October 2026",
    venue: "Offline on-campus",
    timeFrom: "TBA",
    timeTo: "TBA",
    prizes: "Winner, 1st Runner-ups, and 2nd Runner-ups",
    prizePool: "TBA",
    rulesUrl: "https://docs.google.com/document/d/1_vLLKsGzxKbf8QW4pxQKF-rfDzeq9r9Cw-QnnngyHXM/edit?usp=sharing",
  },
  {
    slug: "arcadia-x",
    name: "Arcadia X",
    kind: "Gaming",
    track: "non-technical",
    description: "Enter the arena for intense BGMI and Minecraft, where every move, decision, and goal could turn the game around.",
    participation: "BGMI - Team of 4 Members & Minecraft - TBD",
    date: "8th & 9th October 2026",
    venue: "Offline on-campus",
    timeFrom: "TBA",
    timeTo: "TBA",
    prizes: "Winner, 1st Runner-ups, and 2nd Runner-ups",
    prizePool: "TBA",
    rulesUrl: "https://docs.google.com/document/d/1m96IQtNmCcix-Hff3U_gDesVyc3yGVvkBBiQmWUbdbg/edit?usp=sharing",
  },];

/** The events on one side of the line-up, in sheet order. */
export function eventsForTrack(track: EventTrack): FestEvent[] {
  return FEST_EVENTS.filter((e) => e.track === track);
}

/**
 * The time window as one readable string.
 *
 * Most rows are "TBA" in both columns, and rendering that literally gives
 * "TBA – TBA", which reads as two separate unknowns rather than one. Equal ends
 * collapse to a single value — that also covers the hackathon, which runs
 * 10:00 AM to 10:00 AM a day later and would otherwise look like a typo.
 */
export function eventTime(event: FestEvent): string {
  const { timeFrom, timeTo } = event;
  if (!timeFrom && !timeTo) return "TBA";
  if (!timeTo || timeFrom === timeTo) return timeFrom || timeTo;
  return `${timeFrom} – ${timeTo}`;
}

/**
 * A day of the fest, as the schedule surfaces render it.
 *
 * NOT `ScheduleSlot` from the data layer. That type is built on `startsAt` /
 * `endsAt` ISO timestamps, and this sheet has neither: dates arrive as prose
 * ("8th & 9th October 2026") and twelve of the thirteen rows have no time at
 * all. Forcing them into ISO would mean inventing a timestamp for every
 * unconfirmed event and then rendering it as though it were decided — the one
 * thing a schedule must never do. When the times are fixed and the backend
 * serves real slots, the schedule screens move back to `ScheduleSlot` and this
 * type goes away.
 */
export interface ScheduleDay {
  /** The sheet's date string, verbatim — the group key and the panel heading. */
  date: string;
  /** The same date minus the year, for the tab strip where space is tight. */
  label: string;
  events: FestEvent[];
}

/**
 * The line-up grouped into days, in sheet order.
 *
 * Grouped on the date STRING rather than a parsed date. These are ranges as
 * often as they are days ("30th September - 01st October, 2026"), so there is
 * no single date to parse, and the sheet's own grouping is the one the
 * organisers intend. Insertion order is preserved, which puts the hackathon
 * first because that is where the sheet puts it.
 */
export function eventSchedule(): ScheduleDay[] {
  const days = new Map<string, FestEvent[]>();
  for (const event of FEST_EVENTS) {
    const list = days.get(event.date);
    if (list) list.push(event);
    else days.set(event.date, [event]);
  }

  return [...days.entries()].map(([date, events]) => ({
    date,
    label: date.replace(/,?\s*20\d{2}\s*$/, ""),
    events,
  }));
}

/**
 * An event's time for the schedule, or the notice that there isn't one yet.
 *
 * Spelt out rather than left as the sheet's "TBA": the schedule is read by
 * people planning a day around it, and a bare acronym in a time column reads
 * like a code. Only the hackathon is confirmed at present.
 */
export function eventTimeOrTba(event: FestEvent): string {
  const time = eventTime(event);
  return /^tba$/i.test(time) ? "To be announced" : time;
}
