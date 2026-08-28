import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { BlockButton, BlockModal, showToast } from "@/frontend/components/mc";
import { useSession } from "@/frontend/components/auth/session-provider";
import { useAsync } from "@/frontend/hooks/use-async";
import { repo } from "@/lib/data";
import type { FestEvent } from "@/frontend/lib/events";
import { cn } from "@/frontend/lib/utils";
import { CheckCircle, Copy, Share2 } from "lucide-react";

export function EventRegistrationButton({ event }: { event: FestEvent }) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");
  const { status, session } = useSession();
  const userId = session?.userId;

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);


  const [showTeamCreateModal, setShowTeamCreateModal] = useState(false);
  const [showTeamJoinModal, setShowTeamJoinModal] = useState(false);
  const [showTeamSuccessModal, setShowTeamSuccessModal] = useState(false);
  
  const [teamName, setTeamName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [createdTeamData, setCreatedTeamData] = useState<{ teamCode: string, teamName: string } | null>(null);

  const { data: receipt, loading: paymentLoading } = useAsync(

    async () => (userId ? repo.paymentReceipts.getByUser(userId) : null),
    [userId]
  );

  const { data: userRegistrations, loading: regsLoading, reload: refetchRegs } = useAsync(
    async () => (userId ? repo.registrations.listForUser(userId) : []),
    [userId]
  );

  const isLoading = status === "loading" || (userId && (paymentLoading || regsLoading));

  const participationLower = event.participation.toLowerCase();
  const isIndividual = participationLower.includes("individual");
  const isAlreadyRegistered = userRegistrations?.some(reg => reg.eventId === event.slug) ?? false;
  const paymentStatus = receipt?.status;

  const handleRegister = async () => {
    setErrorMsg(null);
    setIsRegistering(true);
    try {
      await repo.registrations.register(event.slug, userId!);
      setShowConfirmModal(false);
      setShowSuccessModal(true);
      refetchRegs();
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to register. Please try again.");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      setErrorMsg("Team Name is required");
      return;
    }
    setErrorMsg(null);
    setIsRegistering(true);
    try {
      const res = await repo.teams.create(event.slug, userId!, teamName);
      setCreatedTeamData({ teamCode: res.teamCode, teamName: teamName });
      setShowTeamCreateModal(false);
      setShowTeamSuccessModal(true);
      refetchRegs();
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to create team.");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!joinCode.trim()) {
      setErrorMsg("Join Code is required");
      return;
    }
    setErrorMsg(null);
    setIsRegistering(true);
    try {
      await repo.teams.join(joinCode, userId!);
      setShowTeamJoinModal(false);
      setShowSuccessModal(true);
      refetchRegs();
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to join team.");
    } finally {
      setIsRegistering(false);
    }
  };

  const copyCode = () => {
    if (createdTeamData?.teamCode) {
      navigator.clipboard.writeText(createdTeamData.teamCode);
      showToast({ title: "Copied!", body: "Code copied to clipboard.", severity: "success" });
    }
  };

  const shareInvite = async () => {
    if (createdTeamData?.teamCode) {
      const msg = `Hello Teammates,\n\nPlease join our team '${createdTeamData.teamName}' for '${event.name}' at Gateways 2026 by using the code: ${createdTeamData.teamCode}.\n\nThank You`;
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Join team ${createdTeamData.teamName}`,
            text: msg
          });
        } catch (err: any) {
          if (err.name !== "AbortError") {
            navigator.clipboard.writeText(msg);
            showToast({ title: "Copied!", body: "Invite message copied to clipboard.", severity: "success" });
          }
        }
      } else {
        navigator.clipboard.writeText(msg);
        showToast({ title: "Copied!", body: "Invite message copied to clipboard.", severity: "success" });
      }
    }
  };

  const renderButton = () => {
    if (isLoading) {
      return (
        <BlockButton variant="stone" disabled className="w-full">
          Loading...
        </BlockButton>
      );
    }

    if (!userId) {
      return (
        <Link href={`/login?next=/dashboard/explore`} className="w-full no-underline">
          <BlockButton variant="gold" className="w-full">
            Register Now
          </BlockButton>
        </Link>
      );
    }

    if (isAlreadyRegistered) {
      const btnLabel = isIndividual ? "View Registration" : "View Team Details";
      return (
        <Link href="/dashboard/events" className="w-full no-underline">
          <BlockButton variant="emerald" className="w-full">
            {btnLabel}
          </BlockButton>
        </Link>
      );
    }

    if (!paymentStatus || paymentStatus === "rejected") {
      const label = paymentStatus === "rejected" ? "Payment Clarification Required" : "Unlock Participation";
      return (
        <Link href="/dashboard/profile" className="w-full no-underline">
          <BlockButton variant={paymentStatus === "rejected" ? "stone" : "gold"} className="w-full">
            {label}
          </BlockButton>
        </Link>
      );
    }

    if (paymentStatus === "pending") {
      return (
        <BlockButton variant="stone" disabled className="w-full">
          Payment Verification Pending
        </BlockButton>
      );
    }

    if (paymentStatus === "verified") {
      const label = isIndividual ? "Participate" : "Create Team";

      if (!isDashboard) {
        return (
          <Link href="/dashboard/explore" className="w-full no-underline">
            <BlockButton variant="gold" className="w-full">
              {label}
            </BlockButton>
          </Link>
        );
      }

      return (
        <>
          {isIndividual ? (
            <BlockButton 
              variant="gold" 
              className="w-full"
              onClick={() => setShowConfirmModal(true)}
            >
              Participate
            </BlockButton>
          ) : (
            <div className="flex gap-[var(--mc-unit)] w-full">
              <BlockButton 
                variant="gold" 
                className="flex-1 whitespace-nowrap"
                size="sm"
                onClick={() => setShowTeamCreateModal(true)}
              >
                Create Team
              </BlockButton>
              <BlockButton 
                variant="emerald" 
                className="flex-1 whitespace-nowrap"
                size="sm"
                onClick={() => setShowTeamJoinModal(true)}
              >
                Join Team
              </BlockButton>
            </div>
          )}
        </>
      );
    }
    return null;
  };

  return (
    <>
      {renderButton()}

      {/* Confirmation Modal */}
      <BlockModal 
        open={showConfirmModal}
        onOpenChange={(open) => !open && !isRegistering && setShowConfirmModal(false)}
        title="Are you Sure?"
        footer={
          <div className="flex w-full justify-between gap-[var(--mc-unit)]">
            <BlockButton variant="stone" onClick={() => setShowConfirmModal(false)} disabled={isRegistering}>
              Cancel
            </BlockButton>
            <BlockButton variant="gold" onClick={handleRegister} disabled={isRegistering}>
              {isRegistering ? "Registering..." : "Confirm Participation"}
            </BlockButton>
          </div>
        }
      >
        <div className="py-[calc(var(--mc-unit)*2)] text-center text-[18px]">
          {errorMsg ? (
            <p className="text-mc-error mb-[var(--mc-unit)]">{errorMsg}</p>
          ) : null}
          <p className="text-mc-text-dim">
            By clicking on confirm participation you will get registered for 
          </p>
          <div className="mt-[var(--mc-unit)] text-mc-text">
            <span className="block font-bold text-xl">{event.name}</span>
            <span className="block text-md text-mc-gold">{event.kind}</span>
          </div>
        </div>
      </BlockModal>

      {/* Team Create Modal */}
      <BlockModal 
        open={showTeamCreateModal}
        onOpenChange={(open) => !open && !isRegistering && setShowTeamCreateModal(false)}
        title="Create Team"
        footer={
          <div className="flex w-full justify-between gap-[var(--mc-unit)]">
            <BlockButton variant="stone" onClick={() => setShowTeamCreateModal(false)} disabled={isRegistering}>
              Cancel
            </BlockButton>
            <BlockButton variant="gold" onClick={handleCreateTeam} disabled={isRegistering}>
              {isRegistering ? "Creating..." : "Create Team"}
            </BlockButton>
          </div>
        }
      >
        <div className="py-[calc(var(--mc-unit)*2)] text-[18px]">
          {errorMsg ? (
            <p className="text-mc-error mb-[var(--mc-unit)]">{errorMsg}</p>
          ) : null}
          <label className="block text-mc-text-dim mb-2 text-left text-sm uppercase font-bold tracking-widest">
            Team Name
          </label>
          <input 
            type="text" 
            className="w-full bg-mc-block border-2 border-mc-border p-3 text-mc-text rounded-md outline-none focus:border-mc-gold focus:shadow-mc-glow"
            placeholder="Enter your team name..."
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />
        </div>
      </BlockModal>

      {/* Team Join Modal */}
      <BlockModal 
        open={showTeamJoinModal}
        onOpenChange={(open) => !open && !isRegistering && setShowTeamJoinModal(false)}
        title="Join Team"
        footer={
          <div className="flex w-full justify-between gap-[var(--mc-unit)]">
            <BlockButton variant="stone" onClick={() => setShowTeamJoinModal(false)} disabled={isRegistering}>
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

      {/* Success Modal (Individual / Join Team) */}
      <BlockModal
        open={showSuccessModal}
        onOpenChange={(open) => !open && setShowSuccessModal(false)}
        title="Registration Successful!"
        footer={
          <div className="flex w-full justify-end">
            <Link href="/dashboard/events" className="no-underline">
              <BlockButton variant="emerald">
                View Registration
              </BlockButton>
            </Link>
          </div>
        }
      >
        <div className="flex flex-col items-center justify-center py-[calc(var(--mc-unit)*2)] text-center gap-[var(--mc-unit)]">
          <CheckCircle className="w-16 h-16 text-mc-success" />
          <p className="text-[18px] text-mc-text-dim">
            You have successfully registered for
          </p>
          <div className="text-mc-text">
            <span className="block font-bold text-xl">{event.name}</span>
            <span className="block text-md text-mc-gold">{event.kind}</span>
          </div>
        </div>
      </BlockModal>

      {/* Team Success Modal */}
      <BlockModal
        open={showTeamSuccessModal}
        onOpenChange={(open) => !open && setShowTeamSuccessModal(false)}
        title="Team Created!"
        footer={
          <div className="flex w-full justify-end">
            <Link href="/dashboard/events" className="no-underline">
              <BlockButton variant="emerald">
                View Team Details
              </BlockButton>
            </Link>
          </div>
        }
      >
        <div className="flex flex-col items-center justify-center py-[calc(var(--mc-unit)*2)] text-center gap-[var(--mc-unit)]">
          <CheckCircle className="w-16 h-16 text-mc-success" />
          <p className="text-[18px] text-mc-text-dim">
            Team <span className="font-bold text-mc-text">{createdTeamData?.teamName}</span> successfully created for
          </p>
          <div className="text-mc-text">
            <span className="block font-bold text-xl">{event.name}</span>
            <span className="block text-md text-mc-gold">{event.kind}</span>
          </div>
          
          <div className="mt-4 w-full p-4 bg-mc-block border-2 border-mc-gold/20 rounded-md">
            <p className="text-sm text-mc-text-dim uppercase tracking-widest mb-2">Team Join Code</p>
            <p className="text-3xl font-bold tracking-[0.2em] text-mc-gold mb-4">{createdTeamData?.teamCode}</p>
            <div className="flex gap-2 w-full">
              <BlockButton variant="stone" size="sm" className="flex-1 whitespace-nowrap" onClick={copyCode}>
                <Copy className="w-4 h-4" /> Copy Code
              </BlockButton>
              <BlockButton variant="gold" size="sm" className="flex-1 whitespace-nowrap" onClick={shareInvite}>
                <Share2 className="w-4 h-4" /> Share Invite
              </BlockButton>
            </div>
          </div>
        </div>
      </BlockModal>
    </>
  );
}
