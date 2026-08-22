"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { BlockButton, BlockModal } from "@/frontend/components/mc";
import { useReducedMotion } from "@/frontend/lib/animation/use-reduced-motion";
import { cn } from "@/frontend/lib/utils";

/**
 * The fest assistant — a voxel launcher and a chat console.
 *
 * Answers come from `/api/chat`, which is grounded in the site's own data and
 * refuses anything outside it. Nothing about the model, the key or the corpus
 * exists on this side: the widget posts a list of turns and renders a stream of
 * text back. That thinness is deliberate — swapping the provider server-side
 * never touches this file.
 *
 * The console follows the CraftBot layout: a chrome header carrying identity
 * and status, a recessed transcript on a block grid, quick replies, and a
 * chunky input bar. Two departures from the reference, both load-bearing:
 *
 *  - SURFACES ARE THEMED TOKENS, not the reference's literal browns and greys.
 *    A dark-stone panel dropped into the light theme's cream page is not a
 *    style, it is a bug — and this site has a real light theme.
 *  - The SPEAKERS keep literal colour. Green for the assistant, blue for you,
 *    is the one thing carrying meaning rather than decoration in that design,
 *    and material colours are theme-independent here by the same rule that
 *    keeps a gold button gold on both themes.
 *
 * History lives in component state for the session only. No persistence, no
 * conversation id — the API is stateless and the (short) history rides along
 * with each request.
 */

/**
 * `ssr: false` because Three.js touches WebGL at import time. It also keeps the
 * scene out of the initial payload of every public page — it only downloads
 * once the browser is idle enough to hydrate this component.
 */
const CraftBotScene = dynamic(() => import("./craft-bot-scene"), {
  ssr: false,
  loading: () => null,
});

interface Turn {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "How much is registration?",
  "Which events are non-technical?",
  "When is the hackathon?",
  "How do I register?",
];

const MAX_CHARS = 1_000;

export function FestChat() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  /** Flips once the WebGL context exists, so bot and bubble arrive together. */
  const [ready, setReady] = useState(false);
  /** Session-only. Dismissing the bubble leaves the bot, which is the control. */
  const [bubbleDismissed, setBubbleDismissed] = useState(false);
  const reducedMotion = useReducedMotion();


  /**
   * Keep the newest turn in view as tokens stream in.
   *
   * An effect is right here, unlike the render-phase reset in `EventsModal`:
   * this synchronises React state to something outside React — the scroll
   * offset of a DOM node — which is what effects are for.
   */
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [turns, busy]);

  async function send(question: string) {
    const text = question.trim();
    if (!text || busy) return;

    const next: Turn[] = [...turns, { role: "user", content: text }];
    setTurns(next);
    setDraft("");
    setError(null);
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok || !res.body) {
        // The route answers every failure with a readable `error` string — not
        // configured, rate limited, provider down. Show that rather than a
        // status code, which tells a visitor nothing.
        const payload = await res.json().catch(() => null);
        setError(payload?.error ?? "Something went wrong. Please try again.");
        return;
      }

      // Append an empty assistant turn, then grow it as chunks arrive, so the
      // answer types itself out instead of landing all at once.
      setTurns((t) => [...t, { role: "assistant", content: "" }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setTurns((t) => {
          const copy = [...t];
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { ...last, content: last.content + chunk };
          return copy;
        });
      }
    } catch {
      setError("Could not reach the assistant. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* ── Launcher ──────────────────────────────────────────────────────
          A row, not one button. The bubble used to live INSIDE the bot's
          <button>, which was fine until it needed a dismiss control of its own —
          a <button> inside a <button> is invalid HTML, and the inner click
          would fire the outer one too. So the bubble and the bot are siblings
          now, and each owns its own controls.

          The whole row fades and lifts in together, once the WebGL context
          exists. Before, `next/dynamic` streamed the bubble in immediately
          while the scene chunk was still downloading, so the bubble arrived
          alone and the bot popped in after it. */}
      <div
        className={cn(
          "fixed bottom-[calc(var(--mc-unit)*1.5)] right-[calc(var(--mc-unit)*1.5)] z-30",
          "sm:bottom-[calc(var(--mc-unit)*2)] sm:right-[calc(var(--mc-unit)*2)]",
          "flex items-center gap-[calc(var(--mc-unit)*1.25)]",
          "transition-[opacity,transform] duration-300 ease-out",
          ready
            ? "translate-y-0 opacity-100"
            : // Not just invisible — untouchable, so nothing can be clicked
              // before it is on screen.
              "pointer-events-none translate-y-3 opacity-0",
          // Reduced motion keeps the fade and drops the travel; a thing that
          // appears with no transition at all reads as a glitch.
          reducedMotion && "translate-y-0 duration-150",
        )}
      >
        {/* Speech bubble, desktop only.
            Hidden below `sm` because a phone has no room beside a corner FAB —
            and a 64px bot in the corner of a small screen is self-explanatory
            in a way it is not on a wide desktop, where he could read as
            decoration. Unmounted while the panel is open: the interface is
            already on screen, so a floating "Ask Pixey" behind it invites the
            visitor to do the thing they are already doing. */}
        {!open && !bubbleDismissed ? (
          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn(
                "cursor-pointer appearance-none whitespace-nowrap border-0",
                "bg-mc-panel text-mc-text [--bevel-light:var(--color-mc-panel-light)]",
                "[--bevel-dark:var(--color-mc-panel-dark)] bevel",
                "px-[calc(var(--mc-unit)*1.25)] py-[calc(var(--mc-unit)*0.75)]",
                "font-pixel text-[9px] uppercase tracking-[0.12em]",
                "transition-[filter] duration-75 hover:brightness-110",
              )}
            >
              Ask Pixey
            </button>

            {/* The tail: a plain square nub rather than a rotated triangle.
                A 45° tail antialiases into a soft grey wedge, which is the one
                thing a pixel UI cannot have. */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-full top-1/2 h-[8px] w-[8px] -translate-y-1/2 bg-mc-panel"
            />

            {/* Dismiss, on the bubble's left corner. Overhangs the corner so it
                reads as attached to the bubble rather than as part of its
                label. */}
            <button
              type="button"
              onClick={() => setBubbleDismissed(true)}
              aria-label="Dismiss"
              className={cn(
                "absolute -left-[9px] -top-[9px] grid h-[20px] w-[20px] place-items-center",
                // `cursor-hand`, not `cursor-pointer`: globals.css captures
                // `.cursor-pointer` along with every <button> and paints the
                // themed pickaxe over it. See the rule in globals.css.
                "cursor-hand appearance-none border-0",
                "bg-mc-panel-dark text-mc-redstone",
                "border-[length:var(--mc-bevel)] border-mc-border",
                "transition-[filter] duration-75 hover:brightness-125",
              )}
            >
              <PixelX />
            </button>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ask Pixey about the fest"
          className={cn(
            "cursor-pointer appearance-none border-0 bg-transparent p-0",
            "h-[64px] w-[64px] sm:h-[88px] sm:w-[88px]",
            "transition-transform duration-75 active:translate-y-[2px]",
          )}
        >
          <CraftBotScene
            active={busy}
            animate={!reducedMotion}
            onReady={() => setReady(true)}
          />
        </button>
      </div>

      <BlockModal
        open={open}
        onOpenChange={setOpen}
        title="Gateways Assistant"
        description="Answers come from this site's own information."
        variant="panel"
        // Wider and taller on a phone — a centred dialog with 2rem of margin
        // wastes a third of a small screen on backdrop. `dvh`, not `vh`: the
        // on-screen keyboard shrinks the visual viewport when the input is
        // focused, and `vh` ignores that, so the send button ends up under the
        // keyboard exactly when it is needed.
        className={cn(
          "w-[calc(100vw-0.75rem)] max-h-[92dvh]",
          "sm:w-[calc(100vw-2rem)] sm:max-w-xl sm:max-h-[85vh]",
        )}
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-[var(--mc-unit)]">
            <span className="text-[15px] text-mc-text-dim/80">
              Answers come only from this site.
            </span>
            {turns.length > 0 ? (
              <BlockButton
                variant="stone"
                size="sm"
                onClick={() => {
                  setTurns([]);
                  setError(null);
                }}
              >
                Clear
              </BlockButton>
            ) : null}
          </div>
        }
      >
        <div className="flex flex-col gap-[var(--mc-unit)]">
          {/* ── Status strip ─────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-[var(--mc-unit)]">
            {/* PIXEY carries the emphasis through SIZE and COLOUR, not
                `font-bold`. Both pixel faces ship a single weight, so a bold
                declaration would make the browser synthesise one by smearing
                the glyphs sideways — on a bitmap face that reads as a
                rendering fault, not as emphasis. */}
            <p className="font-pixel text-[13px] uppercase tracking-[0.18em] text-mc-accent">
              PIXEY
            </p>
            <span
              className={cn(
                "inline-flex items-center gap-[calc(var(--mc-unit)*0.5)]",
                "border-[length:var(--mc-bevel)] border-mc-border bg-mc-slot",
                "px-[calc(var(--mc-unit)*0.75)] py-[calc(var(--mc-unit)*0.25)]",
                "font-pixel text-[8px] uppercase tracking-[0.1em]",
                busy ? "text-mc-gold" : "text-mc-success",
              )}
            >
              <span aria-hidden>●</span>
              {busy ? "Thinking" : "Online"}
            </span>
          </div>

          {/* ── Transcript ───────────────────────────────────────────────── */}
          <div
            ref={logRef}
            aria-live="polite"
            aria-atomic="false"
            className={cn(
              "flex flex-col gap-[var(--mc-unit)]",
              "max-h-[42dvh] min-h-[132px] sm:max-h-[46vh] sm:min-h-[180px]",
              "overflow-y-auto border-[length:var(--mc-bevel)] border-mc-border",
              "bg-mc-slot p-[var(--mc-unit)]",
              // The block grid from the reference, as a token-tinted overlay
              // rather than a literal brown — it reads on both themes.
              "[background-image:repeating-linear-gradient(0deg,transparent_0_31px,rgba(128,128,128,.07)_31px_32px),repeating-linear-gradient(90deg,transparent_0_31px,rgba(128,128,128,.06)_31px_32px)]",
            )}
          >
            {turns.length === 0 ? (
              <Bubble speaker="bot">
                Hey! I&apos;m the Gateways assistant. Ask me about events, fees,
                dates, or how to register.
                {"\n\n"}
                I only know what&apos;s on this site — for anything else, the
                contact page has the organisers.
              </Bubble>
            ) : (
              turns.map((turn, i) => (
                <Bubble key={i} speaker={turn.role === "user" ? "you" : "bot"}>
                  {/* An assistant turn is empty for the beat between the
                      request landing and the first token. A caret fills it so
                      the bubble never flashes empty. */}
                  {turn.content || (turn.role === "assistant" ? "▍" : "")}
                </Bubble>
              ))
            )}

            {error ? (
              <div className="border-[length:var(--mc-bevel)] border-mc-redstone bg-mc-panel p-[var(--mc-unit)]">
                <p className="text-[18px] text-mc-redstone">{error}</p>
              </div>
            ) : null}
          </div>

          {/* ── Quick replies ───────────────────────────────────────────── */}
          {/* One horizontally scrollable row on a phone rather than four
              buttons wrapping to three lines — the standard mobile chat
              affordance, and it keeps the input above the fold. `-mx` + `px`
              lets the row bleed to the panel edge so the last chip is visibly
              cut off, which is what signals it scrolls. */}
          <div
            className={cn(
              "flex gap-[calc(var(--mc-unit)*0.5)]",
              "-mx-[calc(var(--mc-unit)*2)] px-[calc(var(--mc-unit)*2)]",
              "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              "sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0",
            )}
          >
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy}
                onClick={() => void send(s)}
                className={cn(
                  "appearance-none cursor-pointer",
                  "border-[length:var(--mc-bevel)] border-mc-border bg-mc-panel",
                  "px-[var(--mc-unit)] py-[calc(var(--mc-unit)*0.5)] min-h-[36px]",
                  // Chips must not shrink or they compress into unreadable
                  // slivers instead of scrolling.
                  "shrink-0 whitespace-nowrap sm:whitespace-normal",
                  "text-[16px] text-mc-text-dim",
                  "transition-colors hover:text-mc-text hover:border-mc-gold",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* ── Input bar ───────────────────────────────────────────────── */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(draft);
            }}
            className="flex items-stretch gap-[calc(var(--mc-unit)*0.75)]"
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={MAX_CHARS}
              disabled={busy}
              placeholder="Type a message…"
              aria-label="Your question"
              className={cn(
                "min-h-[44px] w-full flex-1 bg-mc-slot px-[var(--mc-unit)]",
                "border-[length:var(--mc-bevel)] border-mc-border",
                "text-[18px] text-mc-text placeholder:text-mc-text-dim/70",
                "focus:outline-none focus-visible:border-mc-gold",
                "disabled:opacity-60",
              )}
            />
            <BlockButton
              type="submit"
              variant="emerald"
              size="sm"
              disabled={busy || draft.trim().length === 0}
            >
              {busy ? "…" : "Send ➤"}
            </BlockButton>
          </form>
        </div>
      </BlockModal>
    </>
  );
}

/**
 * Strips Markdown syntax the model emitted anyway.
 *
 * The system prompt asks for plain text, and that is the real fix — but an
 * instruction is a request, not a guarantee, and every model slips back into
 * `**bold**` when it lists facts. The bubble renders text literally (there is
 * no Markdown renderer here, and none is wanted: the pixel body font ships a
 * single weight, so "bold" has nowhere to go), which turned every slip into
 * visible asterisks.
 *
 * So this is the belt to the prompt's braces. It removes the MARKERS and keeps
 * the words, which is the correct trade when emphasis cannot be rendered at
 * all: the sentence survives, the syntax does not.
 */
function stripMarkdown(text: string): string {
  return (
    text
      // **bold** and __bold__ → bold. Non-greedy, so two emphasised runs in one
      // line do not swallow the text between them.
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/__(.+?)__/g, "$1")
      // `code` → code. Backticks read as noise in a chat bubble.
      .replace(/`([^`]+)`/g, "$1")
      // Leading # heading markers, which sometimes open a list.
      .replace(/^#{1,6}\s+/gm, "")
      // A single * or _ used for italics, but ONLY when it wraps a word — a
      // bare asterisk can be legitimate text, and 2 * 3 must not become 2 3.
      .replace(/(^|\s)\*(\S[^*]*?\S|\S)\*(?=\s|[.,!?)]|$)/g, "$1$2")
  );
}

/**
 * One turn.
 *
 * Speaker colour is a literal, not a token — see the note at the top of the
 * file. The hard offset shadow and the 78% max width are what make two voices
 * legible at a glance without avatars on every row.
 */
function Bubble({
  speaker,
  children,
}: {
  speaker: "bot" | "you";
  children: React.ReactNode;
}) {
  const bot = speaker === "bot";
  return (
    <div
      className={cn(
        "flex items-start gap-[calc(var(--mc-unit)*0.5)] sm:gap-[calc(var(--mc-unit)*0.75)]",
        // Wider on a phone: 88% of a 360px screen leaves a bubble narrow
        // enough that answers wrap every three or four words.
        "max-w-[94%] sm:max-w-[88%]",
        bot ? "self-start" : "self-end",
      )}
    >
      {/* Pixey's signpost marks every answer. `aria-hidden` because the bubble
          already says who is speaking — announcing the sign as well would read
          the speaker twice to a screen reader. */}
      {bot ? <PixeyFace className="mt-[2px] h-[26px] w-[26px] shrink-0 sm:h-[34px] sm:w-[34px]" /> : null}

      <div
        className={cn(
          "min-w-0 border-[length:var(--mc-bevel)] p-[var(--mc-unit)]",
          "shadow-[4px_4px_0_rgba(0,0,0,.35)]",
          bot ? "border-[#203c18] bg-[#4f8f3d]" : "border-[#1f3759] bg-[#3e6aa7]",
        )}
      >
        <span className="block font-pixel text-[8px] uppercase tracking-[0.1em] text-white/75">
          {bot ? "Pixey" : "You"}
        </span>
        <p className="mt-[calc(var(--mc-unit)*0.5)] whitespace-pre-wrap text-[18px] leading-snug text-white">
          {typeof children === "string" ? stripMarkdown(children) : children}
        </p>
      </div>
    </div>
  );
}

/**
 * Pixey's face, flat.
 *
 * The launcher's Pixey is a live WebGL bust; this is the same character drawn
 * as pixel art for the places a canvas has no business being. Every answer gets
 * an avatar, so a 3D one would mean one WebGL context per message — browsers cap
 * those in the low teens and start evicting, and it would cost a render loop per
 * bubble to show something 34px wide.
 *
 * Same technique as `item-icon.tsx`, `PixelCross` and `PixelLock`: a 12×12 grid
 * with `shapeRendering="crispEdges"`, so it is genuinely pixel art at any size
 * rather than a vector that resamples. Colours are the scene's own constants, so
 * the flat face and the 3D one read as one character.
 */
function PixeyFace({ className }: { className?: string }) {
  const STONE = "#77736e";
  const DARK = "#343332";
  const SCREEN = "#050706";
  const EMERALD = "#38ff4d";
  const TEAL = "#0aa8a3";
  const DIRT = "#684323";
  const GRASS = "#64a832";

  return (
    <svg
      viewBox="0 0 12 12"
      shapeRendering="crispEdges"
      aria-hidden
      focusable="false"
      className={className}
    >
      {/* Grass block on his head — the fastest read that this is Pixey. */}
      <rect x="3" y="0" width="6" height="1" fill={GRASS} />
      <rect x="3" y="1" width="6" height="1" fill={DIRT} />

      {/* Ear modules, with their teal lamps. */}
      <rect x="0" y="5" width="1" height="3" fill={DARK} />
      <rect x="11" y="5" width="1" height="3" fill={DARK} />
      <rect x="0" y="6" width="1" height="1" fill={TEAL} />
      <rect x="11" y="6" width="1" height="1" fill={TEAL} />

      {/* Shell, front plate, face screen. */}
      <rect x="1" y="2" width="10" height="9" fill={DARK} />
      <rect x="2" y="3" width="8" height="7" fill={STONE} />
      <rect x="3" y="4" width="6" height="5" fill={SCREEN} />

      {/* Forehead gem. */}
      <rect x="5" y="3" width="2" height="1" fill={EMERALD} />

      {/* Eyes and smile. Symmetric about the screen's centre line: the eyes sit
          at x=4 and x=7 with a two-cell gap, so the face stays centred when the
          avatar is scaled. */}
      <rect x="4" y="5" width="1" height="2" fill={EMERALD} />
      <rect x="7" y="5" width="1" height="2" fill={EMERALD} />
      <rect x="4" y="8" width="4" height="1" fill={EMERALD} />
    </svg>
  );
}


/**
 * The bubble's dismiss cross, drawn on an 8×8 grid.
 *
 * Not a "✕" character: Press Start 2P has no glyph at U+2715, so every browser
 * silently falls back to a system font and renders a hairline vector cross in
 * the middle of pixel art — the same bug the modal's close button had.
 */
function PixelX() {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 8 8"
      shapeRendering="crispEdges"
      fill="currentColor"
      aria-hidden
      focusable="false"
    >
      <path d="M1 1h2v2H1z M3 3h2v2H3z M5 5h2v2H5z" />
      <path d="M5 1h2v2H5z M1 5h2v2H1z" />
    </svg>
  );
}
