"use client";

import { Megaphone, AlertCircle, PartyPopper, TriangleAlert } from "lucide-react";

import { useSession } from "@/frontend/components/auth/session-provider";
import { BlockPanel, LoadingBlocks } from "@/frontend/components/mc";
import { useAsync } from "@/frontend/hooks/use-async";
import { repo } from "@/lib/data";
import { fetchAnnouncements, extractEventSlugFromAudience, Announcement } from "@/frontend/lib/announcements";

export function AnnouncementsScreen() {
  const { session } = useSession();
  const userId = session?.userId;

  const { data: announcements, loading: announcementsLoading, error: announcementsError } = useAsync(fetchAnnouncements, []);

  const { data: registrations, loading: regsLoading } = useAsync(
    async () => (userId ? repo.registrations.listForUser(userId) : []),
    [userId]
  );

  const { data: teams, loading: teamsLoading } = useAsync(
    async () => (userId ? repo.teams.listForUser(userId) : []),
    [userId]
  );

  const loading = announcementsLoading || regsLoading || teamsLoading;

  // Derive the set of event IDs the user is participating in
  const userEventIds = new Set<string>();
  registrations?.forEach(reg => userEventIds.add(reg.eventId));
  teams?.forEach(team => userEventIds.add(team.eventId));

  const filteredAnnouncements = announcements?.filter((a: Announcement) => {
    if (a.targetAudience.toLowerCase() === "everyone" || a.targetAudience.toLowerCase() === "participants") {
      return true;
    }
    
    const eventSlug = extractEventSlugFromAudience(a.targetAudience);
    if (eventSlug && userEventIds.has(eventSlug)) {
      return true;
    }

    return false;
  }) || [];

  return (
    <div className="flex flex-col gap-[calc(var(--mc-unit)*1.5)]">
      <h1 className="text-mc-accent text-base md:text-lg uppercase">Announcements</h1>

      {loading ? (
        <BlockPanel variant="slot"><LoadingBlocks label="Loading announcements" /></BlockPanel>
      ) : announcementsError ? (
        <BlockPanel variant="slot" className="border-mc-error">
          <p className="text-mc-error text-center">Failed to load announcements.</p>
        </BlockPanel>
      ) : filteredAnnouncements.length === 0 ? (
        <BlockPanel variant="slot" className="text-center">
          <p className="text-mc-text-dim">
            You have no new announcements right now!
          </p>
        </BlockPanel>
      ) : (
        <ul className="flex flex-col gap-[var(--mc-unit)]">
          {filteredAnnouncements.map((a) => {
            const category = a.badgeCategory?.trim().toLowerCase();
            const badgeText = a.badgeContent?.trim();
            
            let Icon = Megaphone;
            let badgeColor = "bg-mc-lapis text-mc-cloud-light";
            
            if (category === 'danger') {
              Icon = AlertCircle;
              badgeColor = "bg-mc-redstone-dark text-mc-gold-light";
            } else if (category === 'success') {
              Icon = PartyPopper;
              badgeColor = "bg-mc-emerald text-mc-obsidian";
            } else if (category === 'warning') {
              Icon = TriangleAlert;
              badgeColor = "bg-mc-gold text-mc-obsidian";
            }

            return (
              <li key={a.id}>
                <BlockPanel variant="panel" padded="lg" className="flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="font-pixel text-[12px] uppercase tracking-wide text-mc-gold">
                      {a.targetAudience}
                    </h3>
                    {badgeText && (
                      <span className={`flex shrink-0 items-center gap-[calc(var(--mc-unit)*0.5)] rounded-sm px-[calc(var(--mc-unit)*0.8)] py-[calc(var(--mc-unit)*0.4)] font-pixel text-[9px] uppercase tracking-wider ${badgeColor}`}>
                        <Icon size={12} strokeWidth={2.5} />
                        {badgeText}
                      </span>
                    )}
                  </div>
                  <p className="text-[16px] text-mc-text font-body leading-relaxed whitespace-pre-wrap">
                    {a.content}
                  </p>
                </BlockPanel>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
