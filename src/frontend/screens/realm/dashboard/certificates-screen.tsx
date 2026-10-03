"use client";

import { useSession } from "@/frontend/components/auth/session-provider";
import { BlockPanel, LoadingBlocks, BlockButton, showToast } from "@/frontend/components/mc";
import { useAsync } from "@/frontend/hooks/use-async";
import { repo } from "@/lib/data";
import { fetchFestEvents } from "@/frontend/lib/events";
import { Download } from "lucide-react";
import { useState } from "react";

export function CertificatesScreen() {
  const { session } = useSession();
  const userId = session?.userId;

  const { data: registrations, loading: regsLoading } = useAsync(
    async () => (userId ? repo.registrations.listForUser(userId) : []),
    [userId]
  );

  const { data: eventsList, loading: eventsLoading } = useAsync(fetchFestEvents, []);

  const loading = regsLoading || eventsLoading;
  const [downloading, setDownloading] = useState<string | null>(null);

  // Combine unique events the user has registered for and checked in
  const userEventIds = new Set<string>();
  registrations?.forEach(reg => {
    if (reg.status !== "cancelled" && reg.checkedInAt) {
      userEventIds.add(reg.eventId);
    }
  });

  const hasActiveRegistration = registrations?.some(reg => reg.status !== "cancelled");

  const events = Array.from(userEventIds).map(id => {
    const event = eventsList?.find(e => e.slug === id);
    return event || { slug: id, name: id, teamSizeMin: 1 };
  });

  async function downloadCertificate(eventId: string, eventTitle: string) {
    setDownloading(eventId);
    try {
      // Simulate download for now
      await new Promise(r => setTimeout(r, 1000));
      showToast({ title: "Coming Soon", body: "Certificate generation is disabled until the base design is provided.", severity: "info" });
    } catch (e) {
      showToast({ title: "Error", body: "Failed to download certificate", severity: "critical" });
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="flex flex-col gap-[calc(var(--mc-unit)*1.5)]">
      <h1 className="text-mc-accent text-base md:text-lg uppercase">Certificates</h1>

      <BlockPanel variant="panel" padded="lg" className="flex flex-col gap-2">
        <p className="text-[15px] text-mc-text font-body leading-relaxed">
          Download your participation certificates here. Certificates are generated for events where you have a verified attendance record.
        </p>
      </BlockPanel>

      {loading ? (
        <BlockPanel variant="slot"><LoadingBlocks label="Loading certificates" /></BlockPanel>
      ) : events.length === 0 ? (
        <BlockPanel variant="slot" className="text-center">
          <p className="text-mc-text-dim text-[15px]">
            {hasActiveRegistration 
              ? "You must attend at least one event to access certificates."
              : "You must register for at least one event to access certificates."}
          </p>
        </BlockPanel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--mc-unit)]">
          {events.map((event) => (
            <BlockPanel key={event.slug} variant="panel" padded="lg" className="flex flex-col justify-between gap-4">
              <div>
                <h3 className="font-pixel text-[13px] uppercase tracking-wide text-mc-gold">
                  {event.name}
                </h3>
                <p className="text-mc-text-dim text-[14px] mt-2">
                  Participation Certificate
                </p>
              </div>
              
              <BlockButton
                variant="primary"
                onClick={() => downloadCertificate(event.slug, event.name)}
                disabled={downloading === event.slug}
                className="w-full flex items-center justify-center gap-[calc(var(--mc-unit)*0.75)]"
              >
                <Download size={16} />
                {downloading === event.slug ? "Generating..." : "Download PDF"}
              </BlockButton>
            </BlockPanel>
          ))}
        </div>
      )}
    </div>
  );
}
