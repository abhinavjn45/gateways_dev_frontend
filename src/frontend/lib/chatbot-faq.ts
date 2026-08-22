/**
 * HAND-WRITTEN FEST FACTS FOR THE CHATBOT.
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
 */

export interface FaqEntry {
  /** The question, phrased the way a visitor would ask it. */
  question: string;
  /** The answer. Plain prose — the model rewrites it to fit what was asked. */
  answer: string;
}

export const CHATBOT_FAQ: FaqEntry[] = [
  {
    question: "Who can participate? Do I have to be a CHRIST student?",
    answer:
      "Gateways is an inter-collegiate fest and is open to students from any college, " +
      "not only CHRIST (Deemed to be University). CHRIST students ('Christites') have " +
      "their own registration rate, and there is a separate rate for international " +
      "participants — both are listed with the registration fees.",
  },
  {
    question: "Does one registration cover every event, or do I pay per event?",
    answer:
      "One pass. The registration fee is charged once and covers every event you enter — " +
      "you do not pay again per event. After the payment receipt is verified you can " +
      "register for as many events as you like, subject to each event's own team size.",
  },
  {
    question: "How do I pay, and how long does verification take?",
    answer:
      "Payment happens on the site before event registration: sign in, pay the fee, then " +
      "upload the receipt as a PDF. A member of the registration team verifies it manually, " +
      "so it is not instant. Once it is approved, event registration unlocks. If a receipt " +
      "is rejected you can upload a replacement. For anything stuck, contact the " +
      "Registration & Payments contact.",
  },
  {
    question: "Is accommodation provided?",
    answer:
      "Accommodation is available at a per-person, per-day rate, listed with the fest's " +
      "other costs. It is allotted first-come, first-served and is payable on arrival " +
      "rather than with the registration fee. Arrange it through the Hospitality contact.",
  },
  {
    question: "Can I take part in more than one event?",
    answer:
      "Yes. The pass covers all of them. The only real limit is the schedule — several " +
      "events run on the same two days, and most timings are still to be announced, so " +
      "check the schedule before committing to two things at once.",
  },
  {
    question: "What is the theme about?",
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
    answer:
      "Not confirmed yet. Certificates have not been announced for this edition. Ask the " +
      "General Enquiries contact closer to the fest.",
  },
  {
    question: "Can I get a refund if I cannot attend?",
    answer:
      "There is no published refund policy for this edition. Ask the Registration & " +
      "Payments contact before paying if this matters to you.",
  },
  {
    question: "What should I bring? Do I need my own laptop, or a college ID?",
    answer:
      "Not published yet. Individual events state their own requirements in their rules " +
      "document, so check the rules link on the event you are entering. For anything not " +
      "covered there, ask the General Enquiries contact.",
  },
  {
    question: "What are the exact timings for each event?",
    answer:
      "Only the hackathon's timing is confirmed so far. Every other event is scheduled " +
      "across the two fest days with the time still to be announced — the schedule page " +
      "shows exactly which are fixed and which are pending, and is updated as they are " +
      "decided.",
  },
];
