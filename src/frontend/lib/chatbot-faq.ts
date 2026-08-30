/**
 * HAND-WRITTEN FEST FACTS FOR THE CHATBOT AND THE /faq PAGE.
 *
 * The chatbot answers only from the site's own data. Most of that data already
 * exists — `fest.ts` holds fees, dates, contacts and how to reach campus,
 * `events.ts` the line-up, `team.ts` the roster. This file is for the questions
 * visitors actually ask that no data file happens to hold.
 *
 * THREE RULES FOR EDITING THIS FILE.
 *
 * 1. Every answer must be TRUE. It is read to visitors as fact, and a wrong
 *    answer here is worse than no chatbot: the bot states it with the same
 *    confidence as a fee it read out of `fest.ts`.
 *
 * 2. Do not restate what another data file already holds. Duplicating the early
 *    bird fee here creates a second source that will disagree with `fest.ts`
 *    the first time the fee changes. The corpus builder feeds the model both,
 *    and the model will believe the wrong one half the time.
 *
 * 3. An unanswered question is fine — say so. Several entries below are
 *    deliberately "not announced yet, ask <contact>". That is a real, useful
 *    answer, and it is the honest one until the organisers decide. Replacing a
 *    placeholder with a guess is the one edit that must never happen here.
 *
 * This is DATA, not instruction. The corpus builder labels it as reference
 * material; nothing in an answer string is ever treated as a directive to the
 * model.
 *
 * TWO READERS, NOT ONE. These entries are also the /faq page, rendered verbatim
 * as an accordion. The chatbot rewrites an answer to fit the question it was
 * asked; the page does not, so each answer has to read as finished prose on its
 * own. Rule 2 above still holds — where an answer needs a fee, a date or a
 * count, it interpolates from the data file that owns it rather than retyping
 * the value.
 */

/**
 * The page groups by these, in this order, and shows a heading per group.
 * Ordered by what a first-time visitor needs first; "Still to be announced"
 * sits last because every answer in it is a deferral.
 */
import { FEST_EVENTS } from "./events";
import { FEST, inr } from "./fest";

/**
 * "5.6 km from R V Road (Green Line)" for a landmark in `FEST.host.reach`.
 *
 * Looked up by label rather than by index: the list is ordered for the contact
 * page's benefit, and an answer that silently starts quoting the airport
 * because a row moved is exactly the kind of wrong this file must not produce.
 */
function nearest(label: string): string {
  const stop = FEST.host.reach.nearest.find((n) => n.label === label);
  if (!stop) return "a short ride from the city centre";
  // "KSR Bengaluru City Jn." already ends in a full stop; letting the sentence
  // add its own produces "Jn..".
  return `${stop.distance} from ${stop.place.replace(/\.$/, "")}`;
}

export const FAQ_CATEGORIES = [
  "About the fest",
  "Registering & fees",
  "Events",
  "Travel & stay",
  "Still to be announced",
] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number];

export interface FaqEntry {
  /** The question, phrased the way a visitor would ask it. */
  question: string;
  /** The answer. Plain prose — the model rewrites it to fit what was asked. */
  answer: string;
  /**
   * Which group the question sits under on /faq. Required, not optional: an
   * untagged entry would silently vanish from the page, and the compiler
   * catching it is the whole point.
   */
  category: FaqCategory;
}

export const CHATBOT_FAQ: FaqEntry[] = [
  {
    question: "Who can participate? Do I have to be a CHRIST student?",
    category: "Registering & fees",
    answer:
      "Gateways is an inter-collegiate fest and is open to students from any college, " +
      "not only CHRIST (Deemed to be University). CHRIST students ('Christites') have " +
      "their own registration rate, and there is a separate rate for international " +
      "participants — both are listed with the registration fees.",
  },
  {
    question: "Does one registration cover every event, or do I pay per event?",
    category: "Registering & fees",
    answer:
      "One pass. The registration fee is charged once and covers every event you enter — " +
      "you do not pay again per event. After the payment receipt is verified you can " +
      "register for as many events as you like, subject to each event's own team size.",
  },
  {
    question: "How do I pay, and how long does verification take?",
    category: "Registering & fees",
    answer:
      "Payment happens on the site before event registration: sign in, pay the fee, then " +
      "upload the receipt as a PDF. A member of the registration team verifies it manually, " +
      "so it is not instant. Once it is approved, event registration unlocks. If a receipt " +
      "is rejected you can upload a replacement. For anything stuck, contact the " +
      "Registration & Payments contact.",
  },
  {
    question: "Is accommodation provided?",
    category: "Travel & stay",
    answer:
      "Accommodation is available at a per-person, per-day rate, listed with the fest's " +
      "other costs. It is allotted first-come, first-served and is payable on arrival " +
      "rather than with the registration fee. Arrange it through the Hospitality contact.",
  },
  {
    question: "Can I take part in more than one event?",
    category: "Events",
    answer:
      "Yes. The pass covers all of them. The only real limit is the schedule — several " +
      "events run on the same two days, and most timings are still to be announced, so " +
      "check the schedule before committing to two things at once.",
  },
  {
    question: "What is the theme about?",
    category: "About the fest",
    answer:
      "The edition's theme is Parallax, built around digital twins — the idea of seeing " +
      "one reality from two vantage points at once, the physical world and its live " +
      "digital mirror. It is why the site is built as a Minecraft-style realm: the fest " +
      "and its digital twin, side by side. Several events take their names and briefs " +
      "from it.",
  },

  // ── Not decided yet ──────────────────────────────────────────────────────
  // Answer these honestly rather than plausibly. Replace an entry only when the
  // organisers have actually decided — not with a reasonable-sounding guess.
  {
    question: "Will I get a participation certificate?",
    category: "Still to be announced",
    answer:
      "Not confirmed yet. Certificates have not been announced for this edition. Ask the " +
      "General Enquiries contact closer to the fest.",
  },
  {
    question: "Can I get a refund if I cannot attend?",
    category: "Still to be announced",
    answer:
      "There is no published refund policy for this edition. Ask the Registration & " +
      "Payments contact before paying if this matters to you.",
  },
  {
    question: "What should I bring? Do I need my own laptop, or a college ID?",
    category: "Events",
    answer:
      "Bring your institution ID card and an undertaking letter from your institution — " +
      "both are required to participate, and that part is settled. Equipment is not: " +
      "individual events state their own requirements in their rules document, so check " +
      "the rules link on the event you are entering. For anything not covered there, ask " +
      "the General Enquiries contact.",
  },
  {
    question: "What are the exact timings for each event?",
    category: "Still to be announced",
    answer:
      "Only the hackathon's timing is confirmed so far. Every other event is scheduled " +
      "across the two fest days with the time still to be announced — the schedule page " +
      "shows exactly which are fixed and which are pending, and is updated as they are " +
      "decided.",
  },
  // ── Added for the /faq page ───────────────────────────────────────────────
  // Questions a participant asks that the entries above did not cover. Every
  // figure below is interpolated from the file that owns it.
  {
    question: "When and where is Gateways 2026?",
    category: "About the fest",
    answer:
      `The fest runs on ${FEST.dateLabel} at ${FEST.host.university}, ${FEST.host.city} — ` +
      `${FEST.host.address}. The hackathon runs ahead of it, online, on ` +
      `${FEST.hackathonDateLabel}. The schedule page lists which events fall on which day.`,
  },
  {
    question: "Who runs the fest?",
    category: "About the fest",
    answer:
      `Gateways is the annual inter-collegiate fest of the ${FEST.host.department} ` +
      `(${FEST.host.programmes}) at ${FEST.host.university}, and this is its ` +
      `${FEST.yearsRunning}th year. It is run by a student organising committee under ` +
      `faculty coordinators — the about page names everyone involved.`,
  },
  {
    question: "Is there a deadline to register, or can I sign up on the day?",
    category: "Registering & fees",
    answer:
      "You can register on the day — there is an on-the-spot rate for the fest days " +
      "themselves. What changes is the price, not the availability: the fee is tiered by " +
      "when you pay, so registering early costs less. The Registration Process page lists " +
      "every tier with the window it is valid in.",
  },
  {
    question: "I am an international participant — is the fee different for me?",
    category: "Registering & fees",
    answer:
      "Yes. There is a separate flat rate for international participants, and a separate " +
      "rate again for CHRIST students. Both are listed alongside the standard tiers on the " +
      "Registration Process page. It is still one pass covering every event.",
  },
  {
    question: "My payment receipt was rejected. What now?",
    category: "Registering & fees",
    answer:
      "Upload a replacement — a rejected receipt does not close your registration. " +
      "Receipts are checked by hand, so a rejection usually means the document was " +
      "unreadable, incomplete, or did not match the tier claimed. If it is rejected again, " +
      "contact the Registration & Payments contact directly rather than re-uploading.",
  },
  {
    question: "Do I need a team, or can I enter on my own?",
    category: "Events",
    answer:
      `Both exist. Several events are individual entries, others run in teams of two, ` +
      `and the hackathon takes teams of two to four. Each of the ${FEST_EVENTS.length} events states ` +
      `its own participation format on its event page — check it before you register, ` +
      `because the format is fixed per event and not negotiable on the day.`,
  },
  {
    question: "Where do I find the rules for an event?",
    category: "Events",
    answer:
      "On the event's own page, which links its full rules document, and on the Rules & " +
      "Regulations page, which lists every event's rules document in one place along with " +
      "the fest-wide rules that apply to everyone.",
  },
  {
    question: "What can I win?",
    category: "Events",
    answer:
      `The prize pool across the fest is ${inr(FEST.money.prizePoolInr)}. Most events award ` +
      `a winner and two runner-up places; the split for each individual event has not been ` +
      `published yet and shows as TBA on the event page until it is.`,
  },
  {
    question: "How do I get to the campus?",
    category: "Travel & stay",
    answer:
      `The campus is in ${FEST.host.city} — about ${nearest("Metro Station")}, and about ` +
      `${nearest("Railway Station")} — and plenty of BMTC routes stop nearby. ` +
      `${FEST.host.reach.busStopNote}, which is not always the name on the board. ` +
      `${FEST.host.reach.cabNote} The contact page has the full list of routes and distances.`,
  },
  {
    question: "Something has gone wrong on the day — who do I contact?",
    category: "Travel & stay",
    answer:
      "The contact page lists the organising team by role, with phone numbers: " +
      "registration and payment problems, hospitality and accommodation, and general " +
      "enquiries each have their own contact. Call the one that matches your problem " +
      "rather than the general line — it is faster.",
  },
];
