"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BlockButton } from "@/frontend/components/mc";
import { cn } from "@/frontend/lib/utils";

const STORAGE_KEY = "mc-gateways:audio-muted";
const AMBIENT_SRC = "/audio/ambient.ogg";

/**
 * Ambient loop with a mute toggle.
 *
 * The track is optional and not in the repository: drop an NCS release at
 * `public/audio/ambient.ogg` (with its attribution in
 * `public/prismarine/CREDITS.txt`) and the button appears. Until then this
 * renders nothing. Browsers block autoplay until the user interacts, so
 * playback is armed on the first pointer/key event.
 */
export function AudioControl({ className }: { className?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(AMBIENT_SRC, { method: "HEAD" })
      .then((r) => {
        if (cancelled) return;
        setAvailable(r.ok);
        let stored: string | null = null;
        try {
          stored = localStorage.getItem(STORAGE_KEY);
        } catch {
          /* private mode */
        }
        setMuted(stored === null ? true : stored === "1");
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!available || muted) return;
    const el = audioRef.current;
    if (!el) return;
    const tryPlay = () => {
      el.play().catch(() => {
        /* still blocked */
      });
    };
    tryPlay();
    window.addEventListener("pointerdown", tryPlay, { once: true });
    window.addEventListener("keydown", tryPlay, { once: true });
    return () => {
      window.removeEventListener("pointerdown", tryPlay);
      window.removeEventListener("keydown", tryPlay);
    };
  }, [available, muted]);

  const toggle = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      const el = audioRef.current;
      if (el) {
        if (next) el.pause();
        else el.play().catch(() => {});
      }
      return next;
    });
  }, []);

  if (!available) return null;

  return (
    <>
      <audio ref={audioRef} src={AMBIENT_SRC} loop preload="auto" aria-hidden="true" />
      <BlockButton
        size="icon"
        variant="ghost"
        onClick={toggle}
        aria-label={muted ? "Enable sound" : "Mute sound"}
        title={muted ? "Enable sound" : "Mute sound"}
        aria-pressed={!muted}
        className={cn(muted && "opacity-60", className)}
      >
        {muted ? "♪̸" : "♪"}
      </BlockButton>
    </>
  );
}
