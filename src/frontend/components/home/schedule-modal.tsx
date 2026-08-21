"use client";

import Link from "next/link";
import { blockButton, BlockModal } from "@/frontend/components/mc";
import { ScheduleList } from "@/frontend/components/schedule/schedule-list";
import { cn } from "@/frontend/lib/utils";

/**
 * The running order, in a modal.
 *
 * One scrolling list with a section per date, not day tabs. Tabs made sense
 * when a day was a dense hour-by-hour column worth isolating; with two dates
 * and thirteen events the whole schedule is shorter than the tab strip made it
 * look, and hiding half of it behind a control meant a visitor could read the
 * modal and never learn the hackathon runs on a different date. Sections show
 * the shape of the fest in one pass. `BlockModal` is already
 * `max-h-[85vh] overflow-y-auto`, so the scroll is free.
 *
 * This now renders `<ScheduleList>` rather than its own markup. The two used to
 * differ deliberately — this one presented the same data as day tabs, which was
 * a genuinely different view — but with tabs gone they are the same list, and
 * keeping two copies of it only creates drift.
 */
export function ScheduleModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <BlockModal
      open={open}
      onOpenChange={onOpenChange}
      title="Schedule"
      description="Every event at the fest, grouped by date."
      variant="panel"
      className="max-w-2xl"
      footer={
        <Link
          href="/schedule"
          onClick={() => onOpenChange(false)}
          className={cn(blockButton({ variant: "emerald", size: "sm" }), "no-underline")}
        >
          Open full schedule
        </Link>
      }
    >
      <ScheduleList />
    </BlockModal>
  );
}
