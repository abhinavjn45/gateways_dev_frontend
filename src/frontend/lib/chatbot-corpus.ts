import { CHATBOT_FAQ } from "./chatbot-faq";
import { eventSchedule, eventTime, FEST_EVENTS } from "./events";
import { FEST, inr } from "./fest";
import { GALLERY_CHAPTERS } from "./gallery";
import {
  ADVISORY_COMMITTEE,
  COMMITTEE_HEADS,
  CORE_COMMITTEE,
  FACULTY_COORDINATORS,
  TECHNICAL_COMMITTEE,
  type TeamMember,
} from "./team";

/**
 * EVERYTHING THE CHATBOT IS ALLOWED TO KNOW, as one block of text.
 *
 * This is the whole of "retrieval" for the fest chatbot, and it is a string
 * concatenation rather than a vector database on purpose. The site's factual
 * data — fest, events, roster, gallery, FAQ — comes to about 2,500 tokens.
 * Embeddings, chunking and a similarity search exist to solve one problem, that
 * a corpus does not fit in the context window; this one fits many times over.
 * Sending all of it every time makes retrieval accuracy 100% by construction,
 * which is exactly what "answer only from these sources" needs — there is no
 * retrieval step left to miss the relevant chunk.
 *
 * Built FROM THE SAME EXPORTS THE PAGES RENDER, never from a copy. `inr()`
 * formats money the way the pricing panel does and `eventTime()` folds a
 * TBA window the way the schedule does, so the bot cannot quote a fee or a
 * time in a form no page ever shows. Adding an event to `events.ts` puts it in
 * the bot's knowledge on the next request, with no separate re-index.
 *
 * DETERMINISTIC BY CONTRACT. No `Date.now()`, no unordered iteration, no
 * randomness — the same data must produce a byte-identical string on every
 * call. Two reasons: a provider that caches prompt prefixes can only do so if
 * the prefix is stable, and a corpus that changes between requests makes the
 * bot's answers irreproducible when someone reports a wrong one.
 *
 * The one thing deliberately left out is which fee tier is open TODAY — see the
 * note in the fees section.
 */

/**
 * Strips a student's register number from their subtitle.
 *
 * `team.ts` stores these as "4 MSC AIML (2548556)" because the /about page
 * prints them — that is the roster's own record, shown to a visitor who
 * deliberately opened the credits page.
 *
 * The chatbot is a different setting entirely. Its corpus is sent to a
 * third-party API on every request, and anything in it can be read back to any
 * anonymous visitor who asks. A register number is a university identifier for
 * a named person; nobody needs the bot to recite one, and "what is Smitha's
 * register number" must not be a question it can answer. The class stays, since
 * that is what makes "who is on the core committee" a useful answer.
 */
function withoutRegisterNumber(subtitle: string): string {
  return subtitle.replace(/\s*\(\d{6,}\)\s*$/, "").trim();
}

/** Renders one roster group, or nothing at all if it is empty. */
function membersBlock(title: string, members: readonly TeamMember[]): string {
  if (members.length === 0) return "";
  const lines = members.map(
    (m) => `- ${m.name} — ${withoutRegisterNumber(m.subtitle)}`,
  );
  return `${title}:\n${lines.join("\n")}\n`;
}

function festSection(): string {
  const { theme, host, money } = FEST;
  const fees = money.registration;

  return [
    `## The fest`,
    `Name: ${FEST.edition}. Theme: ${theme.name} — ${theme.subject}.`,
    `Tagline: ${theme.tagline}`,
    `In one line: ${theme.blurb}`,
    `Dates: ${FEST.dateLabel}. The hackathon runs ${FEST.hackathonDateLabel}.`,
    `This is the ${FEST.yearsRunning}th year of the fest.`,
    ``,
    `Hosted by the ${host.department} (${host.programmes}), ${host.university}, ${host.city}.`,
    `Address: ${host.address}`,
    ``,
    `## Registration fees`,
    `One pass covers every event a participant enters.`,
    `- Early bird: ${inr(fees.earlyBirdInr)}`,
    `- Standard: ${inr(fees.standardInr)}`,
    `- On the spot: ${inr(fees.onSpotInr)}`,
    `- CHRIST students (Christites): ${inr(fees.christiteInr)}`,
    `- International participants: ${inr(fees.internationalInr)}`,
    `Accommodation: ${inr(money.accommodationPerDayInr)} — ${money.accommodationNote}.`,
    `Total prize pool across the fest: ${inr(money.prizePoolInr)}.`,
    /**
     * Which tier is OPEN right now is deliberately left out.
     *
     * `openRegistrationTiers()` reads the clock, and this string has to be
     * identical on every request. Worse, a request served from a cached prefix
     * would state yesterday's tier as today's fact. The rates above are stable;
     * which one applies on a given day is a question for the fees panel on the
     * page, which recomputes it per render.
     */
    `Which tier is currently open depends on the date — the registration page shows the live rate.`,
    ``,
    `## How to register`,
    ...FEST.registerSteps.map((step, i) => `${i + 1}. ${step}`),
    ``,
    `## Contacts`,
    ...FEST.contacts.map((c) => {
      const ways = [c.phone, c.email].filter(Boolean).join(", ");
      return `- ${c.name} (${c.role})${ways ? ` — ${ways}` : ""}`;
    }),
    ``,
    `## Getting to campus`,
    ...host.reach.nearest.map(
      (n) => `- ${n.label}: ${n.place}, about ${n.distance} away.`,
    ),
    host.reach.busStopNote ? `- ${host.reach.busStopNote}` : "",
    ``,
    `## Social links`,
    ...FEST.socials.map((s) => `- ${s.label}: ${s.href}`),
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function eventsSection(): string {
  const lines = [
    `## Events (${FEST_EVENTS.length} in total)`,
    `Each event is either Technical or Non-Technical. Event NAMES are deliberately`,
    `cryptic; the "kind" is what says what a participant actually does.`,
    ``,
  ];

  for (const e of FEST_EVENTS) {
    lines.push(
      `### ${e.name} — ${e.kind}`,
      `Track: ${e.track === "technical" ? "Technical" : "Non-Technical"}`,
      `What it is: ${e.description}`,
      `Participation: ${e.participation}`,
      `Date: ${e.date}. Time: ${eventTime(e)}. Venue: ${e.venue}`,
      `Prizes: ${e.prizes}. Prize pool: ${e.prizePool}`,
      e.rulesUrl ? `Full rules: ${e.rulesUrl}` : "",
      ``,
    );
  }

  lines.push(`## Schedule`);
  for (const day of eventSchedule()) {
    lines.push(`${day.date}:`);
    for (const e of day.events) {
      lines.push(`- ${eventTime(e)} — ${e.name} (${e.kind})`);
    }
    lines.push(``);
  }

  return lines.filter((line) => line !== "").join("\n");
}

function teamSection(): string {
  const heads = COMMITTEE_HEADS.map(
    (h) => `- ${h.name} — ${h.team}, ${withoutRegisterNumber(h.subtitle)}`,
  ).join("\n");

  return [
    `## The team`,
    membersBlock("Advisory committee", ADVISORY_COMMITTEE),
    membersBlock("Faculty coordinators", FACULTY_COORDINATORS),
    membersBlock("Core committee", CORE_COMMITTEE),
    `Committee heads:\n${heads}\n`,
    membersBlock("Technical committee (website and application)", TECHNICAL_COMMITTEE),
  ]
    .filter(Boolean)
    .join("\n");
}

function gallerySection(): string {
  const chapters = GALLERY_CHAPTERS.filter((c) => c.moments.length > 0).map(
    (c) => `- ${c.title}: ${c.blurb} (${c.moments.length} photos)`,
  );
  if (chapters.length === 0) return "";

  return [
    `## Gallery`,
    `The gallery holds photographs from the LAST fest, not this one — this`,
    `edition has not happened yet.`,
    ...chapters,
  ].join("\n");
}

function faqSection(): string {
  return [
    `## Frequently asked`,
    ...CHATBOT_FAQ.flatMap((f) => [`Q: ${f.question}`, `A: ${f.answer}`, ``]),
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/**
 * The complete corpus. Pure — same output every call, for the same data.
 *
 * Section order is fixed and hand-chosen rather than alphabetical: the fest
 * basics and fees answer the most common questions, so they come first and stay
 * first. Reordering churns the whole string and throws away any prefix cache.
 */
export function buildCorpus(): string {
  return [
    festSection(),
    eventsSection(),
    teamSection(),
    gallerySection(),
    faqSection(),
  ]
    .filter(Boolean)
    .join("\n\n");
}
