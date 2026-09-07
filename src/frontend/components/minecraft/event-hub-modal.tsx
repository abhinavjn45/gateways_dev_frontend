"use client";

import { BlockModal, blockButton } from "@/frontend/components/mc";
import { EventDetails } from "@/frontend/components/events/event-details";
import { EventRegistrationButton } from "@/frontend/components/events/event-registration-button";
import type { FestEvent } from "@/frontend/lib/events";
import { cn } from "@/frontend/lib/utils";

/**
 * The event hub: what opens when the player presses E inside a classroom.
 *
 * Same body and footer as the Explore Events modal, so the two never drift —
 * details, the rules link, and the registration flow. `inline` on the button
 * is what lets a verified user register from here rather than being sent to
 * `/dashboard/explore` (the button otherwise gates on the pathname).
 */
export function EventHubModal({
  event,
  onClose,
}: {
  event: FestEvent | null;
  onClose: () => void;
}) {
  return (
    <BlockModal
      open={event !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={event?.name ?? ""}
      description={event ? `${event.kind}. Full details, rules and registration.` : ""}
      variant="panel"
      className="max-w-2xl"
      footer={
        event ? (
          <div className="flex w-full flex-wrap items-center justify-between gap-[var(--mc-unit)]">
            <div className="flex items-center">
              {event.rulesUrl ? (
                <a
                  href={event.rulesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(blockButton({ variant: "gold", size: "sm" }), "no-underline")}
                >
                  Read the rules ↗
                </a>
              ) : (
                <div />
              )}
            </div>
            <div className="flex-1 sm:flex-none sm:min-w-[200px]">
              <EventRegistrationButton event={event} inline />
            </div>
          </div>
        ) : null
      }
    >
      {event ? <EventDetails event={event} /> : null}
    </BlockModal>
  );
}
