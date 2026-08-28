/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Link from "next/link";
import { BlockButton, BlockPanel, LoadingBlocks, BlockModal } from "@/frontend/components/mc";
import { useSession } from "@/frontend/components/auth/session-provider";
import { useAsync } from "@/frontend/hooks/use-async";
import { repo } from "@/lib/data";
import { fetchFestEvents, type FestEvent } from "@/frontend/lib/events";
import type { Registration } from "@/lib/data/types";
import { cn } from "@/frontend/lib/utils";

/** Registered events */
export function MyEventsScreen() {
  const { session } = useSession();
  const userId = session?.userId;

  const { data: regs, loading: regsLoading } = useAsync(
    async () => (userId ? repo.registrations.listForUser(userId) : []),
    [userId],
  );
  const { data: events, loading: eventsLoading } = useAsync(fetchFestEvents, []);

  const [now] = useState(() => Date.now());

  const [selectedReg, setSelectedReg] = useState<{ reg: Registration; event: FestEvent } | null>(null);

  const [showJoinTeamModal, setShowJoinTeamModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleJoinTeam = async () => {
    if (!joinCode.trim()) {
      setErrorMsg("Join Code is required");
      return;
    }
    setErrorMsg(null);
    setIsRegistering(true);
    try {
      await repo.teams.join(joinCode, userId!);
      setShowJoinTeamModal(false);
      window.location.reload();
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to join team.");
    } finally {
      setIsRegistering(false);
    }
  };

  const loading = regsLoading || eventsLoading;

  const rows = (regs ?? [])
    .filter((r) => r.status !== "cancelled")
    .map((r) => ({ reg: r, event: events?.find((e) => e.slug === r.eventId) }))
    .filter((x): x is { reg: Registration; event: FestEvent } => Boolean(x.event));

  const upcoming = rows.filter((x) => {
    // If no valid date, default to upcoming
    if (!x.event.date) return true;
    const eventTime = new Date(`${x.event.date} ${x.event.timeTo || "23:59:59"}`).getTime();
    return isNaN(eventTime) ? true : eventTime >= now;
  });
  
  const past = rows.filter((x) => {
    if (!x.event.date) return false;
    const eventTime = new Date(`${x.event.date} ${x.event.timeTo || "23:59:59"}`).getTime();
    return !isNaN(eventTime) && eventTime < now;
  });

  return (
    <div className="flex flex-col gap-[calc(var(--mc-unit)*1.5)]">
      <div className="flex items-center justify-between">
        <h1 className="text-mc-accent text-base md:text-lg">MY EVENTS</h1>
        <BlockButton variant="emerald" onClick={() => setShowJoinTeamModal(true)} size="sm">
          Join Team
        </BlockButton>
      </div>

      {loading ? (
        <BlockPanel variant="slot"><LoadingBlocks label="Loading" /></BlockPanel>
      ) : rows.length === 0 ? (
        <BlockPanel variant="slot" className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-[18px] text-mc-text-dim mb-[calc(var(--mc-unit)*1.5)]">
            You haven&apos;t registered for any events yet.
          </p>
          <Link href="/dashboard/explore" className="no-underline">
            <BlockButton variant="gold">
              Register Now
            </BlockButton>
          </Link>
        </BlockPanel>
      ) : (
        <>
          <Group title="Upcoming" rows={upcoming} empty="No upcoming events." onManage={(reg, event) => setSelectedReg({ reg, event })} />
          <Group title="Past" rows={past} empty="No past events yet." onManage={(reg, event) => setSelectedReg({ reg, event })} />
        </>
      )}

      {/* Team Join Modal */}
      <BlockModal 
        open={showJoinTeamModal}
        onOpenChange={(open) => !open && !isRegistering && setShowJoinTeamModal(false)}
        title="Join Team"
        footer={
          <div className="flex w-full justify-between gap-[var(--mc-unit)]">
            <BlockButton variant="stone" onClick={() => setShowJoinTeamModal(false)} disabled={isRegistering}>
              Cancel
            </BlockButton>
            <BlockButton variant="gold" onClick={handleJoinTeam} disabled={isRegistering}>
              {isRegistering ? "Joining..." : "Join Team"}
            </BlockButton>
          </div>
        }
      >
        <div className="py-[calc(var(--mc-unit)*2)] text-[18px]">
          {errorMsg ? (
            <p className="text-mc-error mb-[var(--mc-unit)]">{errorMsg}</p>
          ) : null}
          <label className="block text-mc-text-dim mb-2 text-left text-sm uppercase font-bold tracking-widest">
            Team Join Code
          </label>
          <input 
            type="text" 
            className="w-full bg-mc-block border-2 border-mc-border p-3 text-mc-text rounded-md outline-none focus:border-mc-gold focus:shadow-mc-glow uppercase"
            placeholder="e.g. A1B2C3"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
        </div>
      </BlockModal>
      {selectedReg && (
        <ManageRegistrationModal
          reg={selectedReg.reg}
          event={selectedReg.event}
          userId={userId!}
          onClose={() => setSelectedReg(null)}
        />
      )}
    </div>
  );
}

function Group({
  title,
  rows,
  empty,
  onManage,
}: {
  title: string;
  rows: Array<{ reg: Registration; event: FestEvent }>;
  empty: string;
  onManage: (reg: Registration, event: FestEvent) => void;
}) {
  return (
    <section>
      <h2 className="font-pixel text-[11px] uppercase text-mc-text-dim">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-[calc(var(--mc-unit)*0.5)] text-[18px] text-mc-text-dim">{empty}</p>
      ) : (
        <ul className="mt-[var(--mc-unit)] grid gap-[var(--mc-unit)] sm:grid-cols-2">
          {rows.map(({ reg, event }) => {
            const pType = (event.participation || "").toLowerCase();
            let maxTeamSize = 1;
            if (pType.includes("-")) {
              const match = pType.match(/-(\d+)/);
              if (match) maxTeamSize = parseInt(match[1], 10);
            } else if (pType.includes("team")) {
              const match = pType.match(/team of (\d+)/);
              if (match) maxTeamSize = parseInt(match[1], 10);
              else maxTeamSize = 2;
            }
            
            const isTeam = maxTeamSize > 1;
            const memberCount = reg.teamMemberCount || 1;
            const isComplete = memberCount >= maxTeamSize;

            return (
              <li key={reg.id}>
                <button 
                  onClick={() => onManage(reg, event)}
                  className="w-full text-left block h-full no-underline cursor-pointer"
                >
                  <BlockPanel variant="panel" padded="md" className="h-full hover:brightness-115 flex flex-col justify-between transition-all">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-pixel text-[11px] text-mc-success leading-tight">{event.name}</p>
                        <div className="bg-mc-panel-light text-mc-text-dim text-[14px] px-2 py-1 rounded-sm shadow-sm capitalize font-bold">
                          {reg.status}
                        </div>
                      </div>
                      
                      <p className="mt-[calc(var(--mc-unit)*0.75)] text-[16px] text-mc-text-dim">
                        {event.date} • {event.timeFrom}
                      </p>
                      
                      <p className="mt-[calc(var(--mc-unit)*0.25)] text-[17px] capitalize text-mc-accent-strong">
                        {event.participation}
                      </p>
                    </div>

                    {isTeam && reg.teamId && (
                      <div className="mt-[calc(var(--mc-unit)*1)] bg-mc-panel-light p-2 bevel-inset">
                        <p className="text-[17px] text-mc-text flex items-center justify-between">
                          <span>Team: <strong className="text-mc-gold">{reg.teamName}</strong></span>
                        </p>
                        <p className={cn("text-[16px] mt-1", isComplete ? "text-mc-emerald-light" : "text-mc-gold")}>
                          {isComplete ? "Status: Complete" : `Status: Incomplete (${memberCount}/${maxTeamSize} members)`}
                        </p>
                      </div>
                    )}
                  </BlockPanel>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ManageRegistrationModal({ reg, event, userId, onClose }: { reg: Registration, event: FestEvent, userId: string, onClose: () => void }) {
  const { data: members, loading } = useAsync(async () => {
    if (reg.teamId) return await repo.teams.members(reg.teamId);
    return [];
  }, [reg.teamId]);

  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [confirmAction, setConfirmAction] = useState<{ type: 'leave' | 'disband' | 'remove', targetUserId?: string, targetUserName?: string } | null>(null);

  const executeAction = async () => {
    if (!confirmAction) return;
    setIsCancelling(true);
    setErrorMsg(null);
    try {
      if (confirmAction.type === 'remove') {
        await repo.teams.removeMember(reg.teamId!, confirmAction.targetUserId!);
      } else {
        await repo.registrations.cancel(reg.id, confirmAction.type);
      }
      window.location.reload();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to perform action');
      setIsCancelling(false);
      setConfirmAction(null);
    }
  };

  const isTeam = !!reg.teamId;
  const myMemberInfo = members?.find(m => m.userId === userId);
  const isLeader = myMemberInfo?.role === 'leader';
  const memberCount = members?.length || 1;

  const copyCode = () => {
    if (reg.teamCode) {
      navigator.clipboard.writeText(reg.teamCode);
      // Ideally we would show a toast here
    }
  };

  const shareInvite = async () => {
    if (reg.teamCode) {
      const msg = `Hello Teammates,\n\nPlease join our team '${reg.teamName}' for '${event.name}' at Gateways 2026 by using the code: ${reg.teamCode}.\n\nThank You`;
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Join team ${reg.teamName}`,
            text: msg
          });
        } catch (err: any) {
          if (err.name !== "AbortError") {
            navigator.clipboard.writeText(msg);
          }
        }
      } else {
        navigator.clipboard.writeText(msg);
      }
    }
  };

  return (
    <BlockModal 
      open={true} 
      onOpenChange={(open) => !open && !isCancelling && onClose()} 
      title="Manage Registration"
      footer={
        <div className="flex w-full justify-between gap-[var(--mc-unit)] flex-wrap">
          <BlockButton variant="stone" onClick={onClose} disabled={isCancelling}>
            Close
          </BlockButton>
          {!isTeam ? (
            <BlockButton variant="danger" onClick={() => setConfirmAction({ type: 'leave' })} disabled={isCancelling} className="whitespace-nowrap">
              {isCancelling ? "Cancelling..." : "Cancel Registration"}
            </BlockButton>
          ) : (
            <div className="flex flex-wrap justify-end gap-[var(--mc-unit)] flex-1">
              {isLeader && memberCount > 1 && (
                <BlockButton variant="danger" onClick={() => setConfirmAction({ type: 'disband' })} disabled={isCancelling} className="whitespace-nowrap">
                  {isCancelling ? "Cancelling..." : "Cancel Team"}
                </BlockButton>
              )}
              <BlockButton variant="danger" onClick={() => setConfirmAction({ type: 'leave' })} disabled={isCancelling} className="whitespace-nowrap">
                {isCancelling ? "Leaving..." : (isLeader && memberCount === 1 ? "Cancel Team" : "Leave Team")}
              </BlockButton>
            </div>
          )}
        </div>
      }
    >
      {confirmAction && (
        <BlockModal
          open={true}
          onOpenChange={(open) => !open && !isCancelling && setConfirmAction(null)}
          title="Confirm Action"
          footer={
            <div className="flex w-full justify-between gap-[var(--mc-unit)]">
              <BlockButton variant="stone" onClick={() => setConfirmAction(null)} disabled={isCancelling}>
                No, Go Back
              </BlockButton>
              <BlockButton variant="danger" onClick={executeAction} disabled={isCancelling}>
                {isCancelling ? "Processing..." : "Yes, Confirm"}
              </BlockButton>
            </div>
          }
        >
          <div className="py-4">
            <p className="text-[18px] text-mc-text">
              {confirmAction.type === 'leave' && "Are you sure you want to leave this team? Your registration will be cancelled."}
              {confirmAction.type === 'disband' && "Are you sure you want to cancel the entire team? All members' registrations will be cancelled."}
              {confirmAction.type === 'remove' && `Are you sure you want to remove ${confirmAction.targetUserName} from the team?`}
            </p>
          </div>
        </BlockModal>
      )}
      <div className="py-[calc(var(--mc-unit)*2)]">
        {errorMsg ? (
          <p className="text-mc-error mb-[var(--mc-unit)]">{errorMsg}</p>
        ) : null}
        
        <h3 className="text-mc-accent text-[20px]">{event.name}</h3>
        <p className="text-mc-text-dim text-[16px] capitalize mb-[calc(var(--mc-unit)*2)]">
          {event.participation} Event
        </p>

        {isTeam && reg.teamCode && (
          <div className="bg-mc-panel p-4 mb-[calc(var(--mc-unit)*2)] rounded-md">
            <p className="text-[16px] text-mc-text-dim mb-2 uppercase font-pixel tracking-wider">Team Details</p>
            <p className="text-[18px] text-mc-text mb-4">Team: <strong className="text-mc-gold">{reg.teamName}</strong></p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-[12px] text-mc-text-dim uppercase font-bold tracking-widest mb-1">Invite Code</p>
                <div className="bg-mc-block border-2 border-mc-border p-2 text-center text-mc-gold font-pixel text-xl tracking-widest rounded-md">
                  {reg.teamCode}
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <BlockButton variant="stone" size="sm" onClick={copyCode}>Copy Code</BlockButton>
                <BlockButton variant="emerald" size="sm" onClick={shareInvite}>Share Invite</BlockButton>
              </div>
            </div>
          </div>
        )}

        {isTeam && (
          <div className="bg-mc-panel p-4 rounded-md">
            <p className="text-[16px] text-mc-text-dim mb-4 uppercase font-pixel tracking-wider">Team Roster</p>
            {loading ? (
              <p className="text-mc-text-dim">Loading members...</p>
            ) : members?.length === 0 ? (
              <p className="text-mc-text-dim">No members found.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {members?.map((m: any, idx: number) => (
                  <li key={m.userId || idx} className="flex justify-between items-center bg-mc-panel-light p-2 text-[16px] rounded-sm">
                    <span className="text-mc-text">{m.playerName} {m.userId === userId && "(You)"}</span>
                    <div className="flex items-center gap-4">
                      {m.role === 'leader' ? (
                        <span className="text-mc-gold font-bold text-[14px]">Leader</span>
                      ) : (
                        <span className="text-mc-text-dim font-bold text-[14px]">Member</span>
                      )}
                      
                      {isLeader && m.userId !== userId && (
                        <BlockButton 
                          variant="danger" 
                          size="sm" 
                          className="px-2 py-1 text-[10px]" 
                          onClick={() => setConfirmAction({ type: 'remove', targetUserId: m.userId, targetUserName: m.playerName })}
                        >
                          Remove
                        </BlockButton>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </BlockModal>
  );
}
