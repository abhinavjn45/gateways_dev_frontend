import type { Metadata } from "next";
import { MotionConfig } from "framer-motion";
import { HomeScreen } from "@/frontend/screens/home/home-screen";
import { PortalTransitionProvider } from "@/frontend/components/portal/portal-transition-overlay";
import { FestChat } from "@/frontend/components/chat/fest-chat";
import { FEST } from "@/frontend/lib/fest";

export const metadata: Metadata = {
  title: `${FEST.edition} — ${FEST.theme.name}`,
  description: FEST.theme.tagline,
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
 */
export default function Home() {
  return (
    <PortalTransitionProvider>
      <MotionConfig reducedMotion="user">
        <HomeScreen />
        <FestChat />
      </MotionConfig>
    </PortalTransitionProvider>
  );
}
