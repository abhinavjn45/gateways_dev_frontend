"use client";

import { useState } from "react";
import { BackLink, BlockPanel, PixelAvatar } from "@/frontend/components/mc";
import { cn } from "@/frontend/lib/utils";
import {
  skinFor,
  FACULTY_COORDINATORS,
  CORE_COMMITTEE,
  ADVISORY_COMMITTEE,
  COMMITTEE_HEADS,
  TECHNICAL_COMMITTEE,
  type TeamMember,
  type CommitteeHead,
} from "@/frontend/lib/team";

/**
 * The people behind the fest — faculty coordinators, the core committee,
 * committee heads, and the technical committee. A standalone page rather than a
 * homepage section: this is the credits list you link directly, not
 * something a first-time visitor needs mid-pitch.
 */
export function AboutScreen() {
  return (
    <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-[calc(var(--mc-unit)*2)] px-[calc(var(--mc-unit)*2)] py-[calc(var(--mc-unit)*2)]">
      <BackLink href="/" label="Home" />

      <header>
        <h1 className="text-mc-accent text-base md:text-lg">ABOUT</h1>
        <p className="mt-[calc(var(--mc-unit)*0.5)] text-mc-text-dim">
          The faculty, students, and builders running the realm.
        </p>
      </header>

      <TeamSection title="Advisory Committee" members={ADVISORY_COMMITTEE} />
      <TeamSection title="Faculty Coordinators" members={FACULTY_COORDINATORS} />
      <TeamSection title="Core Committee" members={CORE_COMMITTEE} />
      <CommitteeHeadsSection />
      <TeamSection title="Technical Committee" members={TECHNICAL_COMMITTEE} />
    </div>
  );
}

function TeamSection({ title, members }: { title: string; members: TeamMember[] }) {
  return (
    <section>
      <h2 className="font-pixel text-[11px] uppercase text-mc-text-dim">{title}</h2>
      <ul className="mt-[var(--mc-unit)] grid gap-[var(--mc-unit)] sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <li key={m.name}>
            <MemberCard member={m} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Committee heads group by the team they run: one labelled card grid per team. */
function CommitteeHeadsSection() {
  const groups = new Map<string, CommitteeHead[]>();
  for (const head of COMMITTEE_HEADS) {
    const group = groups.get(head.team) ?? [];
    group.push(head);
    groups.set(head.team, group);
  }

  return (
    <section>
      <h2 className="font-pixel text-[11px] uppercase text-mc-text-dim">Committee Heads</h2>
      <div className="mt-[var(--mc-unit)] flex flex-col gap-[calc(var(--mc-unit)*1.5)]">
        {[...groups.entries()].map(([team, heads]) => (
          <div key={team}>
            <h3 className="text-[15px] text-mc-eyebrow">{team}</h3>
            {/* Each team gets the full width and the same three-up card grid as
                the other sections, rather than a narrow stacked column: the
                team name is the only thing that needs its own row. */}
            <ul className="mt-[calc(var(--mc-unit)*0.5)] grid gap-[var(--mc-unit)] sm:grid-cols-2 lg:grid-cols-3">
              {heads.map((head) => (
                <li key={head.name}>
                  <MemberCard member={head} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function MemberCard({ member }: { member: TeamMember }) {
  return (
    <BlockPanel
      variant="panel"
      padded="lg"
      className="flex h-full items-center gap-[calc(var(--mc-unit)*1.5)]"
    >
      {/* 88px, not the 48 this started at: these are real faces in a square
          crop, and at 48 a head occupies about thirty pixels — recognisable as
          a person, not as WHICH person, which is the entire job of a portrait
          on a credits page. */}
      <MemberPortrait member={member} size={88} />
      <div className="min-w-0">
        <p className="font-pixel text-[11px] text-mc-success">{member.name}</p>
        <p className="mt-[calc(var(--mc-unit)*0.25)] text-[18px] text-mc-text-dim">
          {member.subtitle}
        </p>
        {member.blurb ? (
          <p className="mt-[calc(var(--mc-unit)*0.25)] text-[18px] text-mc-text">{member.blurb}</p>
        ) : null}
      </div>
    </BlockPanel>
  );
}

/**
 * A member's face: their photograph where one exists, and the deterministic
 * pixel avatar everywhere else.
 *
 * The fallback is on `onError`, not on the absence of a path, and that is the
 * point — faculty entries in `team.ts` carry their photo path BEFORE the file
 * is added, so a missing photo degrades to the avatar the roster already used
 * instead of a broken frame, and dropping the file in is the only step needed
 * to make it appear.
 *
 * A plain <img> rather than next/image for that same reason: the optimizer
 * answers a source it cannot fetch with a 500, while <img> fires `onError`,
 * which is what this fallback listens for. The frame is a fixed square that
 * never exceeds 48px, so there is no meaningful optimization being given up.
 */
function MemberPortrait({ member, size }: { member: TeamMember; size: number }) {
  const [failed, setFailed] = useState(false);

  if (!member.image || failed) {
    return <PixelAvatar skinId={skinFor(member.name)} size={size} alt="" />;
  }

  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden",
        // A hard border rather than the `bevel-inset` well this used to wear.
        // The inset bevel draws its two edges OVER the content, so on a photo
        // it reads as a scuff along the top-left of someone's face; a real
        // border sits outside the image and frames it. Width in --mc-bevel so
        // it thickens with --mc-scale like every other edge in the UI.
        "border-[length:var(--mc-bevel)] border-mc-portrait-frame bg-mc-slot",
      )}
      style={{ width: size, height: size }}
    >
      {/* A plain <img> is deliberate — see the component doc comment. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={member.image}
        alt={member.name}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        // object-top, not the default centre: the faculty photographs are 2:3
        // portraits and the frame is a square, so a centred crop takes the
        // middle third and slices the top of the head off. Anchoring to the top
        // keeps the face in frame, which is the whole point of the portrait.
        className="h-full w-full object-cover object-top"
      />
    </span>
  );
}
