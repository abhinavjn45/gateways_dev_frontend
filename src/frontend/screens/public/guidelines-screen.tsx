"use client";

import { BackLink, BlockPanel } from "@/frontend/components/mc";

export function GuidelinesScreen() {
  const guidelines = [
    "Details of participant eligibility can be found on the respective event pages.",
    "Accommodation for participants will be provided from 8 to 9 October 2026, on a first-come, first-served basis. Accommodation is only available for participants coming outside of Bangalore.",
    "Participants must bring an undertaking letter and ID card from their institution to participate.",
    "Participants are requested to register through the website only.",
    "Students are required to follow the decorum of the event. Failure to adhere to the rules may lead to elimination.",
    "Participants are advised to clarify their doubts with the respective event heads before the event.",
    "Participants are requested to be well-groomed and assemble at the venue of their events 15 minutes before the event starts.",
    "If eliminated, participants are welcome to participate in other events, keeping the time constraint in mind.",
    "Participants will be held responsible for any damage caused by their actions during the fest to Christ University property.",
    "Details about Mystery Block (Surprise Event) will be provided on the spot.",
    "The Organizing Committee reserves the right to change rules at any point for smooth conduct of the events.",
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-[calc(var(--mc-unit)*2)] px-[calc(var(--mc-unit)*2)] py-[calc(var(--mc-unit)*2)]">
      <BackLink href="/" label="Home" />

      <header>
        <h1 className="text-mc-accent text-base md:text-lg">PARTICIPANT&apos;S GUIDELINES</h1>
        <p className="mt-[calc(var(--mc-unit)*0.5)] text-mc-text-dim">
          Important rules and instructions for all Gateways 2026 attendees.
        </p>
        <p className="mt-[calc(var(--mc-unit)*1)] text-[12px] uppercase text-mc-text-dim tracking-widest font-pixel">
          Last Updated: August 25, 2026
        </p>
      </header>

      <section className="mt-[calc(var(--mc-unit)*2)]">
        <BlockPanel variant="panel" padded="lg">
          <ul className="list-decimal pl-[calc(var(--mc-unit)*2.5)] flex flex-col gap-[calc(var(--mc-unit)*1.5)] text-[16px] md:text-[18px] text-mc-text leading-relaxed">
            {guidelines.map((guideline, i) => (
              <li key={i}>{guideline}</li>
            ))}
          </ul>
        </BlockPanel>
      </section>
    </div>
  );
}
