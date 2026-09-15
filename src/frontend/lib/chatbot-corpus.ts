import { CHATBOT_FAQ } from "./chatbot-faq";
import { eventTime, fetchFestEvents, type FestEvent } from "./events";
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
 * Deliberately simple retrieval: no vector database, no embeddings. The fixed
 * core (fest, fees, contacts, a one-line index of every event) goes out on
 * every request; the heavy parts — event write-ups, the roster, the FAQ — are
 * picked by plain keyword overlap with the visitor's question. See
 * `buildCorpus` for why the whole thing is no longer sent every time.
 *
 * Built FROM THE SAME EXPORTS THE PAGES RENDER, never from a copy. `inr()`
 * formats money the way the pricing panel does and `eventTime()` folds a
 * TBA window the way the schedule does, so the bot cannot quote a fee or a
 * time in a form no page ever shows. Adding an event to `events.ts` puts it in
 * the bot's knowledge on the next request, with no separate re-index.
 *
 * DETERMINISTIC BY CONTRACT. No `Date.now()`, no unordered iteration, no
 * randomness — the same data and question must produce a byte-identical string
 * on every call. Two reasons: a provider that caches prompt prefixes can only do so if
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

/**
 * Lowercase words, accents and punctuation gone — "⁠RenderRush", " In
 * Perspective" and "UI/UX" arrive from the sheet with invisible characters and
 * stray spaces, and a match has to survive all of that.
 */
function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Words too common to say anything about which section a question needs. */
const STOPWORDS = new Set(
  "the and for are you can how what when where which who why does did have has with this that from will about there their them into your our any all get got its not but was were been being out per one two".split(
    " ",
  ),
);

/** Content words of a text, crudely de-pluralised so "prizes" meets "prize". */
function keywords(text: string): Set<string> {
  const out = new Set<string>();
  for (const word of normalize(text).split(" ")) {
    if (word.length < 3 || STOPWORDS.has(word)) continue;
    out.add(word.length > 4 ? word.replace(/(es|s)$/, "") : word);
  }
  return out;
}

function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const word of a) if (b.has(word)) n++;
  return n;
}

/**
 * One line per event — everything a "which / when / where / how much" question
 * needs, and nothing that only matters once someone asks about THAT event.
 *
 * This used to be a block per event with the full marketing paragraph and the
 * Google Docs rules link, plus a schedule that repeated every date and time:
 * ~4,000 tokens, over half the prompt, on every question including "hi". The
 * paragraphs now arrive only via `eventDetails`, the doc links (40-odd tokens
 * each — random IDs tokenise badly) are replaced by the site's own pages, and
 * the schedule is dropped because each line already carries date and time.
 */
function eventsIndex(events: FestEvent[]): string {
  return [
    `## Events (${events.length} in total)`,
    `Event NAMES are deliberately cryptic; the kind in brackets is what a participant actually does.`,
    `Format: name (kind, track) — participation; date; time; venue; prize pool; page.`,
    ...events.map((e) => {
      const track = e.track === "technical" ? "Technical" : "Non-Technical";
      const facts = [
        e.participation.replace(/\s+/g, " "),
        e.date,
        eventTime(e),
        e.venue,
        `prize pool ${e.prizePool}`,
        `/events/${e.slug}`,
      ];
      return `- ${e.name.trim()} (${e.kind}, ${track}) — ${facts.join("; ")}`;
    }),
    `Full rules for every event: /rules. Event list: /events. Schedule: /schedule.`,
  ].join("\n");
}

/**
 * The long description, prize split and rules link — only for events the
 * question actually names, by name or by kind ("the quiz", "treasure hunt").
 * Capped so "tell me about the presentations" cannot pull in half the list.
 */
const MAX_EVENT_DETAILS = 3;
const GENERIC_KIND_WORDS = new Set(["hour", "event", "team"]);

function eventDetails(events: FestEvent[], question: string): string {
  const text = ` ${normalize(question)} `;
  const words = keywords(question);

  const named = events.filter((e) => {
    const name = normalize(e.name);
    if (name && text.includes(` ${name} `)) return true;
    const kindWords = [...keywords(e.kind)].filter((w) => !GENERIC_KIND_WORDS.has(w));
    const nameWords = [...keywords(e.name)];
    return [...kindWords, ...nameWords].some((w) => w.length >= 4 && words.has(w));
  });
  if (named.length === 0) return "";

  return [
    `## Event details`,
    ...named.slice(0, MAX_EVENT_DETAILS).flatMap((e) => [
      `### ${e.name.trim()}`,
      e.description,
      `Prizes: ${e.prizes}.${e.maxSlots ? ` Slots: ${e.maxSlots}.` : ""}`,
      e.rulesUrl ? `Rules document: ${e.rulesUrl}` : "",
    ]),
  ]
    .filter(Boolean)
    .join("\n");
}

/** Words that mean the visitor is asking about the people behind the fest. */
const TEAM_WORDS = keywords(
  "committee committees coordinator coordinators organiser organizer organisers organizers organising organizing head heads faculty advisory core convenor convener volunteer volunteers developer developers website teacher professor",
);

/** Every roster name part long enough to be distinctive ("Darshan", "Heble"). */
const ROSTER_NAME_WORDS = keywords(
  [
    ...ADVISORY_COMMITTEE,
    ...FACULTY_COORDINATORS,
    ...CORE_COMMITTEE,
    ...COMMITTEE_HEADS,
    ...TECHNICAL_COMMITTEE,
  ]
    .map((m) => m.name)
    .join(" "),
);

function asksAboutTeam(question: string): boolean {
  const words = keywords(question);
  if (overlap(words, TEAM_WORDS) > 0) return true;
  // "team" and "members" on their own are usually about team SIZE for an event
  // ("how big are teams?"); with "who" they are about the organisers.
  if (/\bwho\b/.test(normalize(question)) && (words.has("team") || words.has("member"))) return true;
  return [...words].some((w) => w.length >= 4 && ROSTER_NAME_WORDS.has(w));
}

/**
 * The roster, ~900 tokens, sent only when the question is about people. Every
 * other question gets one line saying where the team is listed.
 */
function teamSection(question: string): string {
  if (!asksAboutTeam(question)) {
    return `## The team\nThe full organising team (advisory, faculty coordinators, core, committee heads, technical committee) is listed on /about. Ask about the team to get names.`;
  }

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

/**
 * The FAQ entries that share the most words with the question — at most
 * `MAX_FAQ`, and none at all for a question that shares nothing ("hi").
 *
 * All twenty used to go out every time, ~1,500 tokens. Words in an entry's
 * QUESTION count double: visitors phrase things the way the FAQ questions are
 * phrased far more often than the way the answers are.
 */
const MAX_FAQ = 4;

function faqSection(question: string): string {
  const words = keywords(question);
  if (words.size === 0) return "";

  const picked = CHATBOT_FAQ.map((f, index) => ({
    f,
    index,
    score: 2 * overlap(words, keywords(f.question)) + overlap(words, keywords(f.answer)),
  }))
    .filter((x) => x.score > 0)
    // Ties keep file order, so the same question always picks the same entries.
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, MAX_FAQ);
  if (picked.length === 0) return "";

  return [
    `## Frequently asked`,
    ...picked.flatMap(({ f }) => [`Q: ${f.question}`, `A: ${f.answer}`]),
  ].join("\n");
}

/**
 * The corpus for ONE question.
 *
 * Two halves. The first — fest basics, fees, contacts, the one-line event
 * index, gallery — is identical on every request, comes first, and answers the
 * large majority of questions by itself; keeping it byte-stable keeps it
 * cacheable. The second is chosen from `question` (the visitor's latest
 * messages): full details of the events it names, the roster if it is about
 * people, and the closest FAQ entries.
 *
 * Why not send everything, as this used to: the provider's free tier allows
 * 8,000 tokens per MINUTE for the whole key, counting the prompt plus the
 * reply budget. The full corpus was ~7,200 tokens, so a single question used
 * nearly the entire minute and the second one was refused. This is ~1,500–
 * 2,500 depending on the question.
 */
export async function buildCorpus(question = ""): Promise<string> {
  const events = await fetchFestEvents();
  return [
    festSection(),
    eventsIndex(events),
    gallerySection(),
    eventDetails(events, question),
    teamSection(question),
    faqSection(question),
  ]
    .filter(Boolean)
    .join("\n\n");
}
