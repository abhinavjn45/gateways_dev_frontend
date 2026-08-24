"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BackLink,
  blockButton,
  BlockButton,
  BlockInput,
  BlockModal,
  BlockPanel,
} from "@/frontend/components/mc";

import { BiomeScene } from "@/frontend/components/scene";
import { useSession } from "@/frontend/components/auth/session-provider";
import { EventDetails } from "@/frontend/components/events/event-details";
import { useAsync } from "@/frontend/hooks/use-async";
import {
  EVENT_TRACKS,
  eventsForTrack,
  FEST_EVENTS,
  type FestEvent,
} from "@/frontend/lib/events";
import { repo } from "@/lib/data";
import { locationByKey } from "@/frontend/lib/world/world-locations";
import { cn } from "@/frontend/lib/utils";

/**
 * Events list, filterable by track and free-text search.
 *
 * The line-up comes from `frontend/lib/events.ts`, not `repo.events.list()` —
 * the data layer stubs that call and returns `[]`, which left this page showing
 * "No events match that search" against an empty grid. See that file's header.
 *
 * `?category=` is kept as the filter param rather than renamed: the world-map
 * signposts and the BackLink below already build URLs with it. Its values are
 * now the two track slugs.
 *
 * Picking an event opens its detail in a modal rather than navigating to
 * `/events/<slug>`. That route is the registration flow, which is repo-driven
 * and genuinely needs the backend; pointing thirteen cards at it today would
 * be thirteen dead ends. The modal shows the same `<EventDetails>` the
 * homepage does.
 */
export function EventsScreen({ basePath = "/events", isDashboard = false }: { basePath?: string; isDashboard?: boolean }) {
  const params = useSearchParams();
  const categorySlug = params.get("category") ?? undefined;
  const [search, setSearch] = useState("");

  const { session } = useSession();
  const userId = session?.userId;

  const [selected, setSelected] = useState<FestEvent | null>(null);
  /**
   * The grid contents: the track from `?category=`, narrowed by the search box.
   *
   * Search covers name, kind and description together — the names give nothing
   * away on their own ("24° Shift", "Deviation"), so a visitor looking for the
   * hackathon is far more likely to type its KIND than its name.
   */
  const activeTrack = EVENT_TRACKS.find((t) => t.id === categorySlug)?.id;
  const query = search.trim().toLowerCase();
  const events = (activeTrack ? eventsForTrack(activeTrack) : FEST_EVENTS).filter(
    (e) =>
      !query ||
      `${e.name} ${e.kind} ${e.description}`.toLowerCase().includes(query),
  );
  const {
    data: userReceipt,
    loading: paymentLoading,
    reload: reloadReceipt,
  } = useAsync(
    async () => (userId ? repo.paymentReceipts.getByUser(userId) : null),
    [userId],
  );

  const activeLabel = EVENT_TRACKS.find((t) => t.id === activeTrack)?.label;
  // Pinned rather than derived from the filter: scene keys are the world-map
  // biomes ("hackathon-mine"), and the track slugs are not among them —
  // passing one would ask BiomeScene for art that does not exist and render an
  // empty banner.
  const bannerScene = "portal-approach";

  return (
    <div className={cn(
      "mx-auto flex w-full flex-col gap-[calc(var(--mc-unit)*1.5)]",
      isDashboard ? "" : "max-w-5xl px-[calc(var(--mc-unit)*2)] py-[calc(var(--mc-unit)*1.5)] md:p-[calc(var(--mc-unit)*2)]"
    )}>

      {!isDashboard && (
        <BackLink
          href={
            !userId
              ? "/"
              : // Only deep-link to a marker that exists. The filter slugs are
                // now `technical` / `non-technical`, which are not map keys —
                // passing one would have asked the map to focus a location it has
                // never heard of.
                categorySlug && locationByKey(categorySlug)
                ? `/world?view=map&location=${encodeURIComponent(categorySlug)}`
                : "/world?view=map"
          }
        />
      )}

      {!isDashboard ? (
        <BiomeScene
          scene={bannerScene}
          className="min-h-[160px] border-[length:var(--mc-bevel)] border-mc-border bevel-inset"
        >
          <header className="mt-auto flex flex-col p-[calc(var(--mc-unit)*1.5)]">
            <h1
              className="text-mc-accent text-base md:text-lg"
              style={{ textShadow: "3px 3px 0 rgba(0,0,0,0.7)" }}
            >
              {activeLabel ? activeLabel.toUpperCase() : "ALL EVENTS"}
            </h1>
            <p
              className="mt-[calc(var(--mc-unit)*0.5)] text-mc-text"
              style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.8)" }}
            >
              {events.length} {events.length === 1 ? "event" : "events"}
            </p>
          </header>
        </BiomeScene>
      ) : (
        <header>
          <h1 className="text-mc-accent text-base md:text-lg">
            {activeLabel ? activeLabel.toUpperCase() : "EXPLORE EVENTS"}
          </h1>
          <p className="mt-[calc(var(--mc-unit)*0.5)] text-mc-text-dim">
            {events.length} {events.length === 1 ? "event" : "events"}
          </p>
        </header>
      )}

      {!isDashboard && !paymentLoading && userReceipt?.status !== "verified" ? (
        <BlockPanel
          variant="slot"
          className="flex flex-col items-start justify-between gap-[var(--mc-unit)] border-l-4 border-mc-gold p-[var(--mc-unit)] sm:flex-row sm:items-center"
        >
          <div>
            <p className="font-pixel text-[11px] uppercase text-mc-gold">
              One-time Gateways pass
            </p>
            <p className="mt-[calc(var(--mc-unit)*0.5)] text-[17px]">
              {!userId
                ? "Sign in to make the one-time payment and register for events."
                : userReceipt?.status === "pending"
                  ? "You have submitted your Payment Details, our team will review it and you'll get the confirmation within 24 hours."
                  : userReceipt?.status === "rejected"
                    ? "Your receipt was rejected. Upload a new receipt before registering for events."
                    : "Make the one-time payment and upload your receipt. You can register after it is verified."}
            </p>
          </div>
          {userId ? (
            userReceipt?.status === "pending" ? (
              <span className="shrink-0 font-pixel text-[10px] uppercase text-mc-text-dim">
                Awaiting verification
              </span>
            ) : (
              <Link href="/dashboard/profile" className="shrink-0 no-underline">
                <BlockButton
                  variant="gold"
                  size="sm"
                  className="w-full"
                >
                  {userReceipt?.status === "rejected" ? "Re-upload receipt" : "Make Payment"}
                </BlockButton>
              </Link>
            )
          ) : (
            <Link href={`/login?next=${basePath}`} className="shrink-0 no-underline">
              <BlockButton variant="gold" size="sm">
                Sign in
              </BlockButton>
            </Link>
          )}
        </BlockPanel>
      ) : null}

      <BlockInput
        label="Search"
        placeholder="Search events…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <nav aria-label="Event tracks" className="flex flex-wrap gap-[calc(var(--mc-unit)*0.5)]">
        <CategoryChip
          href={basePath}
          label={`All (${FEST_EVENTS.length})`}
          active={!activeTrack}
        />
        {EVENT_TRACKS.map((t) => (
          <CategoryChip
            key={t.id}
            href={`${basePath}?category=${t.id}`}
            label={`${t.label} (${eventsForTrack(t.id).length})`}
            active={t.id === activeTrack}
          />
        ))}
      </nav>

      {events.length === 0 ? (
        <BlockPanel variant="slot" className="text-center">
          <p className="text-mc-text-dim">No events match that search.</p>
        </BlockPanel>
      ) : (
        <ul className="grid gap-[var(--mc-unit)] sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <li key={e.slug}>
              <button
                type="button"
                onClick={() => setSelected(e)}
                // appearance-none for the same reason as the nav's modal
                // triggers: a native widget repaints on every `color-scheme`
                // flip, which reads as a flash when the theme is toggled.
                className="block h-full w-full appearance-none border-0 bg-transparent p-0 text-left"
              >
                <BlockPanel
                  variant="panel"
                  padded="md"
                  className="h-full transition-[filter,transform] duration-100 hover:brightness-115 hover:-translate-y-[2px]"
                >
                  <p className="font-pixel text-[11px] text-mc-success">{e.name}</p>
                  {/* The kind, not a tagline: these names are deliberately
                      cryptic, so this is the only line that tells a visitor
                      what they would actually be doing. */}
                  <p className="mt-[calc(var(--mc-unit)*0.5)] text-[18px] text-mc-text-dim">
                    {e.kind}
                  </p>
                  <dl className="mt-[var(--mc-unit)] flex flex-wrap gap-x-[var(--mc-unit)] text-[17px] text-mc-text-dim">
                    <div>
                      <dt className="sr-only">Date</dt>
                      <dd>{e.date}</dd>
                    </div>
                    <div>
                      <dt className="sr-only">Participation</dt>
                      <dd className="text-mc-accent-strong">{e.participation}</dd>
                    </div>
                  </dl>
                </BlockPanel>
              </button>
            </li>
          ))}
        </ul>
      )}

      <BlockModal
        open={selected !== null}
        onOpenChange={(next) => {
          if (!next) setSelected(null);
        }}
        title={selected?.name ?? ""}
        description={selected ? `${selected.kind}. Full details, rules and prizes.` : ""}
        variant="panel"
        className="max-w-2xl"
        footer={
          selected?.rulesUrl ? (
            <a
              href={selected.rulesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(blockButton({ variant: "gold", size: "sm" }), "no-underline")}
            >
              Read the rules ↗
            </a>
          ) : null
        }
      >
        {selected ? <EventDetails event={selected} /> : null}
      </BlockModal>

    </div>
  );
}

function CategoryChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-[44px] min-w-11 items-center justify-center px-[var(--mc-unit)] no-underline",
        "font-pixel text-[9px] uppercase tracking-wide",
        active
          ? "bg-mc-portal text-white [--bevel-light:var(--color-mc-portal-light)] [--bevel-dark:var(--color-mc-portal-dark)] bevel"
          : "bg-mc-panel text-mc-text-dim [--bevel-light:var(--color-mc-panel-light)] [--bevel-dark:var(--color-mc-panel-dark)] bevel hover:text-mc-text",
      )}
    >
      {label}
    </Link>
  );
}
