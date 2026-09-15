import { SessionProvider } from "@/frontend/components/auth/session-provider";
import { PortalTransitionProvider } from "@/frontend/components/portal/portal-transition-overlay";
import { BackLink } from "@/frontend/components/mc/back-link";
import { AnimatedBackground } from "@/frontend/components/scene";

/**
 * Auth screens sit on the "realm-gate" scene — deliberately the quietest one in
 * the set, and at reduced intensity, because a busy parallax behind a login form
 * fights the thing the user is actually trying to do.
 *
 * `PortalTransitionProvider` is here because /entering is where a signed-out
 * visitor lands, and it covers the screen before handing off to /login. Without
 * a provider on this side, nothing consumed the "covering" flag: login cut in
 * with no transition AND the flag stayed in sessionStorage, so the NEXT visit to
 * any portal route opened fully opaque and faded — a purple flash on load.
 *
 * THREE LAYERS, IN THIS ORDER, so the floating blocks (root layout,
 * `#ambient-blocks`, z-index 1 on /login) can sit between the scene and the
 * form. The scene used to WRAP the form, but `AnimatedBackground` is an
 * isolated stacking context: anything inside it is either entirely above or
 * entirely below the blocks. So the scene is now a sibling filling this box
 * (z auto), and the content is lifted above the blocks with `z-10`.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <PortalTransitionProvider>
        <div className="relative flex flex-1 flex-col">
          <AnimatedBackground
            scene="realm-gate"
            intensity={0.5}
            className="absolute inset-0"
          />
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-[calc(var(--mc-unit)*2)]">
            <BackLink
              href="/"
              label="Home"
              className="absolute left-[calc(var(--mc-unit)*2)] top-[calc(var(--mc-unit)*2)] z-20"
            />
            {children}
          </div>
        </div>
      </PortalTransitionProvider>
    </SessionProvider>
  );
}
