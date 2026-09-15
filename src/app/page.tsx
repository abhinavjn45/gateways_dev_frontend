import type { Metadata } from "next";
import { MotionConfig } from "framer-motion";
import { HomeScreen } from "@/frontend/screens/home/home-screen";
import { PortalTransitionProvider } from "@/frontend/components/portal/portal-transition-overlay";
import { SessionProvider } from "@/frontend/components/auth/session-provider";
import { BlockToaster } from "@/frontend/components/mc";
import { FEST } from "@/frontend/lib/fest";

export const metadata: Metadata = {
  title: `${FEST.edition} — ${FEST.theme.name}`,
  description: "Welcome to Gateways 2026, the premier IT Fest in Bangalore hosted by Christ University. Register for our massive hackathons and coding events.",
  keywords: [
    "Gateways 2026 Home",
    "Best IT Fest Bangalore",
    "Christ University Tech Events",
    "Hackathon India 2026",
    "MCA Inter-collegiate Fest",
    "Digital Twins Events",
    "Parallax Theme Tech Fest",
    "Bangalore Coding Competitions",
  ],
};

/**
 * The homepage.
 *
 * `MotionConfig` is mounted HERE, not inherited: the root layout has none, and
 * `/` sits outside the (public) route group that provides it for the other
 * public pages. Without it every Framer scroll reveal on this page would ignore
 * the operating system's reduced-motion setting.
 *
 * `PortalTransitionProvider` supplies the cover-then-navigate wipe that the
 * hero's "Start the Journey" button fires on its way to /entering.
 *
 * `FestChat` is mounted here, and on /contact, and nowhere else. It is scoped
 * to the two pages where a visitor is actually looking for an answer rather
 * than reading one — everywhere else it was a floating button over content that
 * already said what it had to say.
 *
 * `SessionProvider` and `BlockToaster` are here for the SAME REASON as
 * `MotionConfig`: `/` lives outside every route group, so it inherits none of
 * what the group layouts provide, and the root layout provides none of it
 * either. The events modal on this page now renders `EventRegistrationButton`,
 * which calls `useSession()` and `showToast()` — without the provider that is
 * a hard "useSession must be used inside <SessionProvider>" crash, and without
 * the toaster its confirmations are swallowed in silence.
 *
 * This is exactly the case the (public) layout describes when it explains why
 * it mounts the provider on pages that gate nothing: so a signed-in visitor
 * gets a register button rather than a prompt.
 */
export default function Home() {
  return (
    // SessionProvider outermost, matching all four route-group layouts.
    <SessionProvider>
      <PortalTransitionProvider>
        <MotionConfig reducedMotion="user">
          <HomeScreen />
          <BlockToaster />
        </MotionConfig>
      </PortalTransitionProvider>
    </SessionProvider>
  );
}
