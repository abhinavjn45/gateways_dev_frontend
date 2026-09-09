"use client";

import { useEffect, useRef, useState } from "react";
import { BlockButton, BlockPanel, LoadingBlocks } from "@/frontend/components/mc";
import config from "@/frontend/lib/minecraft/config.json";
import type {
  EngineHandle,
  RoomBinding,
  WorldMeta,
} from "@/frontend/lib/minecraft/engine-types";
import { cn } from "@/frontend/lib/utils";

const SCRIPT_ID = "mc-gateways-engine";

/**
 * Downloads and boots the standalone voxel engine.
 *
 * The engine is deliberately NOT part of the Next bundle: it is ~5 MB raw
 * (~0.8 MB over the wire) and only the 3D view needs it, so it is injected as
 * a separate versioned script on demand and torn down when this unmounts.
 * `window.__MC_CDN_BASE` lets a CDN mirror `/prismarine` without any change
 * to the engine.
 *
 * The parent owns the events and the room bindings; this component only
 * hands them across and surfaces the engine handle (`setUiOpen`,
 * `teleportToRoom`) through `onReady` once the world is actually running.
 */
export interface McWorldProps {
  playerName: string;
  meta: WorldMeta;
  bindings: RoomBinding[];
  spawnRoom?: number;
  onOpenEvent: (slug: string) => void;
  onReady?: (handle: EngineHandle) => void;
  onExit: () => void;
  className?: string;
}

export function McWorld({
  playerName,
  meta,
  bindings,
  spawnRoom,
  onOpenEvent,
  onReady,
  onExit,
  className,
}: McWorldProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<EngineHandle | null>(null);
  const [status, setStatus] = useState<string>(config.runtime.downloading);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tip, setTip] = useState(config.loading.tips[0]);

  // Latest callbacks/bindings without re-booting the engine when they change.
  const latest = useRef({ onOpenEvent, onReady, bindings });
  useEffect(() => {
    latest.current = { onOpenEvent, onReady, bindings };
  }, [onOpenEvent, onReady, bindings]);

  // A sheet refresh re-signs the classrooms in place.
  useEffect(() => {
    handleRef.current?.setBindings(bindings);
  }, [bindings]);

  useEffect(() => {
    const id = setInterval(() => {
      const tips = config.loading.tips;
      setTip(tips[Math.floor(Math.random() * tips.length)]);
    }, 4200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      try {
        const engine = window.McGateways;
        if (!engine) throw new Error(config.runtime.unavailable);
        if (!containerRef.current) return;
        const handle = await engine.start({
          container: containerRef.current,
          config,
          playerName,
          meta,
          bindings: latest.current.bindings,
          spawnRoom,
          onOpenEvent: (slug) => latest.current.onOpenEvent(slug),
          onStatus: (msg) => {
            if (!cancelled) setStatus(msg);
          },
          onProgress: (t) => {
            if (!cancelled) setProgress(Math.max(0, Math.min(1, t)));
          },
        });
        if (cancelled) {
          handle.dispose();
          return;
        }
        handleRef.current = handle;
        latest.current.onReady?.(handle);
      } catch (err) {
        if (!cancelled) {
          setError(config.runtime.fatalPrefix + (err instanceof Error ? err.message : String(err)));
        }
      }
    };

    const resolveUrl = async () => {
      const cdn = process.env.NEXT_PUBLIC_MC_CDN_BASE?.replace(/\/+$/, "") ?? "";
      if (cdn) window.__MC_CDN_BASE = cdn;
      const path = (cdn ? `${cdn}/prismarine` : "/prismarine") + "/game.js";
      try {
        const res = await fetch("/prismarine/version.json", { cache: "no-store" });
        if (res.ok) {
          const { v } = (await res.json()) as { v?: string };
          if (v) return `${path}?v=${encodeURIComponent(v)}`;
        }
      } catch {
        /* fall through to a cache-busting stamp */
      }
      return `${path}?v=${Date.now().toString(36)}`;
    };

    const load = async () => {
      if (window.McGateways) {
        void boot();
        return;
      }

      const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener("load", () => void boot(), { once: true });
        existing.addEventListener("error", () => setError(config.runtime.downloadError), { once: true });
        return;
      }

      const src = await resolveUrl();
      if (cancelled) return;

      const el = document.createElement("script");
      el.id = SCRIPT_ID;
      el.src = src;
      el.async = true;
      el.addEventListener("load", () => {
        if (cancelled) return;
        if (!window.McGateways) {
          setError(config.runtime.unavailable);
          return;
        }
        setStatus(config.runtime.preparing);
        void boot();
      });
      el.addEventListener("error", () => {
        if (!cancelled) setError(config.runtime.downloadError);
      });
      document.body.appendChild(el);
    };

    void load();

    return () => {
      cancelled = true;
      handleRef.current?.dispose();
      handleRef.current = null;
    };
    // `meta` and `spawnRoom` are fixed for the life of a mount: the screen
    // keys this component on them, so a change remounts rather than reboots.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerName]);

  const ready = progress >= 1 && !error;

  return (
    <div className={cn("relative overflow-hidden bg-mc-obsidian", className)}>
      <div ref={containerRef} className="absolute inset-0" />

      {!ready ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-[calc(var(--mc-unit)*1.5)] bg-mc-void/95 px-[calc(var(--mc-unit)*2)]">
          <BlockPanel variant="panel" padded="lg" className="w-[min(460px,92vw)] flex flex-col items-center gap-[var(--mc-unit)]">
            <p className="font-pixel text-[11px] uppercase text-mc-accent-strong">
              {config.loading.heading}
            </p>

            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              className="h-[14px] w-full bg-mc-slot bevel-inset"
            >
              <div
                className="h-full bg-mc-emerald transition-[width] duration-200 ease-linear"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>

            <p
              className={cn(
                "text-center text-[17px] leading-snug",
                error ? "text-mc-danger" : "text-mc-text-dim",
              )}
            >
              {error ?? status}
            </p>

            {error ? (
              <div className="flex gap-[var(--mc-unit)]">
                <BlockButton variant="primary" size="sm" onClick={() => window.location.reload()}>
                  {config.loading.retry}
                </BlockButton>
                <BlockButton variant="ghost" size="sm" onClick={onExit}>
                  {config.loading.back}
                </BlockButton>
              </div>
            ) : (
              <>
                <LoadingBlocks label="" className="gap-0" />
                <p className="min-h-[2.4em] text-center text-[16px] text-mc-text-dim/70">{tip}</p>
                <BlockButton variant="ghost" size="sm" onClick={onExit}>
                  {config.loading.back}
                </BlockButton>
              </>
            )}
          </BlockPanel>
        </div>
      ) : null}
    </div>
  );
}
