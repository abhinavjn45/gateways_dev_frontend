"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/frontend/lib/utils";
import { BlockButton } from "./block-button";

/**
 * Modal dialog.
 *
 * Built on Radix Dialog for the parts that are genuinely hard and easy to get
 * subtly wrong: focus trapping, focus restoration on close, scroll locking,
 * Escape handling, and aria-modal wiring. Everything visual is ours.
 *
 * Animation is Framer Motion (a component reacting to presence), per the
 * GSAP-vs-Framer split. The achievement-unlock cinematic layers an additional
 * GSAP timeline on its own contents — see achievement-modal.tsx — which is
 * allowed because it animates different elements, not the same properties.
 */

export interface BlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  /** Visually hidden description for screen readers when there is no body text. */
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: "panel" | "gold" | "portal";
  /** Hides the default close button — for flows that must be resolved. */
  hideClose?: boolean;
  className?: string;
}

const VARIANT_CLASSES = {
  panel: "bg-mc-panel border-mc-border",
  gold: "bg-mc-panel border-mc-gold",
  // Themed surface, material accent border — see the matching note on
  // BlockPanel's `portal` variant.
  portal: "bg-mc-panel border-mc-portal",
} as const;

export function BlockModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  variant = "panel",
  hideClose,
  className,
}: BlockModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {/* forceMount + AnimatePresence so the exit animation can play; without
          forceMount Radix removes the node instantly and the exit is skipped. */}
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                // --mc-scrim rather than black: on the light theme a 70% black
                // veil is heavier than the dialog it is meant to sit behind.
                className="fixed inset-0 z-50 bg-[var(--mc-scrim)] backdrop-blur-[2px]"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild forceMount>
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className={cn(
                  "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
                  "w-[calc(100vw-2rem)] max-w-lg max-h-[85vh] overflow-y-auto",
                  "border-[length:var(--mc-bevel)] bevel",
                  VARIANT_CLASSES[variant],
                  className,
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-between gap-[var(--mc-unit)]",
                    "px-[calc(var(--mc-unit)*1.5)] py-[var(--mc-unit)]",
                    // The header bar reads as recessed against the dialog body.
                    // bg-mc-slot rather than a black wash, which on the light
                    // theme would just be a grey stripe.
                    "border-b-[length:var(--mc-bevel)] border-inherit bg-mc-slot/60",
                  )}
                >
                  <Dialog.Title className="font-pixel text-[12px] uppercase tracking-wider">
                    {title}
                  </Dialog.Title>
                  {!hideClose ? (
                    <Dialog.Close asChild>
                      <BlockButton
                        variant="ghost"
                        size="icon"
                        aria-label="Close"
                        className="text-mc-redstone hover:text-mc-redstone-light"
                      >
                        <PixelCross size={22} />
                      </BlockButton>
                    </Dialog.Close>
                  ) : null}
                </div>

                {description ? (
                  <Dialog.Description className="sr-only">
                    {description}
                  </Dialog.Description>
                ) : null}

                <div className="p-[calc(var(--mc-unit)*2)]">{children}</div>

                {footer ? (
                  <div
                    className={cn(
                      "flex flex-wrap justify-end gap-[var(--mc-unit)]",
                      "px-[calc(var(--mc-unit)*2)] pb-[calc(var(--mc-unit)*2)]",
                    )}
                  >
                    {footer}
                  </div>
                ) : null}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}

/**
 * The close X, drawn rather than typed.
 *
 * It used to be a literal "✕" (U+2715), and that was the bug behind it looking
 * thin and off-brand: Press Start 2P has no glyph at that codepoint, so every
 * browser silently fell back to a system font and rendered a hairline vector
 * cross in the middle of an otherwise pixel-art UI.
 *
 * Same technique as the item glyphs in `item-icon.tsx` — 2px-wide arms on a
 * 16×16 grid with `shapeRendering="crispEdges"`, so it is real pixel art and
 * stays sharp at any `--mc-scale` instead of resampling like an <img> would.
 * `currentColor` keeps the colour with the button, so a variant change or a
 * hover state moves the X with it.
 */
function PixelCross({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      fill="currentColor"
      aria-hidden
      focusable="false"
    >
      {/* "\\" arm, top-left to bottom-right. */}
      <path d="M3 3h2v2H3z M4 4h2v2H4z M5 5h2v2H5z M6 6h2v2H6z M7 7h2v2H7z M8 8h2v2H8z M9 9h2v2H9z M10 10h2v2H10z M11 11h2v2H11z" />
      {/* "/" arm. The centre cell is already drawn above, so it is skipped here
          rather than painted twice. */}
      <path d="M11 3h2v2H11z M10 4h2v2H10z M9 5h2v2H9z M8 6h2v2H8z M6 8h2v2H6z M5 9h2v2H5z M4 10h2v2H4z M3 11h2v2H3z" />
    </svg>
  );
}
