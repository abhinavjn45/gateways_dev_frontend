"use client";

import { useState, useSyncExternalStore } from "react";
import { BlockButton, BlockPanel, showToast } from "@/frontend/components/mc";
import { useSession } from "@/frontend/components/auth/session-provider";
import {
  getStoredReduceMotion,
  setReduceMotionPreference,
} from "@/frontend/lib/animation/use-reduced-motion";
import { useTheme, type ThemePreference } from "@/frontend/lib/theme/use-theme";
import {
  getMutedServerSnapshot,
  readMuted,
  subscribeMuted,
  writeMuted,
} from "@/frontend/lib/audio/music-store";
import { MUSIC_TRACK } from "@/frontend/lib/audio/track";

/**
 * Settings.
 *
 * Both controls here are three-state rather than checkboxes: "follow my system
 * setting" is the correct default, and a two-state toggle cannot express it — it
 * would silently override the OS preference. The nav's ThemeToggle is the
 * two-state quick switch; this is where "go back to following the system" lives,
 * because that is the option you set once rather than reach for.
 */
export function SettingsScreen() {
  const { session, character } = useSession();
  const { preference: themePref, setPreference: setThemePref } = useTheme();
  // Read from their external stores in the initializer rather than an effect —
  // this component only renders client-side (it is inside the realm guard), so
  // there is no server pass to mismatch against.
  const [motion, setMotion] = useState<"system" | "on" | "off">(() => {
    const stored = getStoredReduceMotion();
    return stored === null ? "system" : stored ? "off" : "on";
  });
  const [osReduce] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  /**
   * Mute, read live rather than snapshotted into `useState` like the two rows
   * above. It is a genuine external store: the floating widget on the public
   * pages writes it, and so does another tab through the `storage` event, so a
   * value copied once at mount would go stale while this screen sat open.
   */
  const muted = useSyncExternalStore(subscribeMuted, readMuted, getMutedServerSnapshot);

  function applyMusic(next: boolean) {
    writeMuted(next);
    showToast({
      title: next ? "Music off" : "Music on",
      body: next ? "Background music muted." : `${MUSIC_TRACK.label} is playing.`,
      severity: "success",
    });
  }

  function applyMotion(next: "system" | "on" | "off") {
    setMotion(next);
    setReduceMotionPreference(next === "system" ? null : next === "off");
    showToast({
      title: "Motion preference saved",
      body:
        next === "system"
          ? "Following your system setting."
          : next === "off"
            ? "Animations reduced."
            : "Animations enabled.",
      severity: "success",
    });
  }

  function applyTheme(next: ThemePreference) {
    setThemePref(next);
    showToast({
      title: "Theme saved",
      body:
        next === null
          ? "Following your system setting."
          : `Switched to the ${next} theme.`,
      severity: "success",
    });
  }

  return (
    <div className="flex flex-col gap-[calc(var(--mc-unit)*1.5)]">
      <h1 className="text-mc-accent text-base md:text-lg">SETTINGS</h1>

      <BlockPanel variant="panel" title="Appearance">
        <fieldset className="border-0 p-0">
          <legend className="font-pixel text-[10px] uppercase text-mc-text-dim">
            Colour theme
          </legend>
          <p className="mt-[calc(var(--mc-unit)*0.5)] text-[18px] text-mc-text-dim">
            The switch in the sidebar flips straight between light and dark.
            Choose <strong className="text-mc-text">Follow system</strong> here to
            hand the decision back to your device.
          </p>

          <div className="mt-[var(--mc-unit)] flex flex-wrap gap-[calc(var(--mc-unit)*0.5)]">
            {(
              [
                { id: null, label: "Follow system" },
                { id: "light", label: "Light" },
                { id: "dark", label: "Dark" },
              ] as const
            ).map((opt) => (
              <BlockButton
                key={opt.label}
                size="sm"
                variant={themePref === opt.id ? "primary" : "ghost"}
                aria-pressed={themePref === opt.id}
                onClick={() => applyTheme(opt.id)}
              >
                {opt.label}
              </BlockButton>
            ))}
          </div>
        </fieldset>
      </BlockPanel>

      <BlockPanel variant="panel" title="Accessibility">
        <fieldset className="border-0 p-0">
          <legend className="font-pixel text-[10px] uppercase text-mc-text-dim">
            Animations
          </legend>
          <p className="mt-[calc(var(--mc-unit)*0.5)] text-[18px] text-mc-text-dim">
            Your system currently requests{" "}
            <strong className="text-mc-text">
              {osReduce ? "reduced motion" : "full motion"}
            </strong>
            .
          </p>

          <div className="mt-[var(--mc-unit)] flex flex-wrap gap-[calc(var(--mc-unit)*0.5)]">
            {(
              [
                { id: "system", label: "Follow system" },
                { id: "on", label: "Full motion" },
                { id: "off", label: "Reduce motion" },
              ] as const
            ).map((opt) => (
              <BlockButton
                key={opt.id}
                size="sm"
                variant={motion === opt.id ? "primary" : "ghost"}
                aria-pressed={motion === opt.id}
                onClick={() => applyMotion(opt.id)}
              >
                {opt.label}
              </BlockButton>
            ))}
          </div>
        </fieldset>
      </BlockPanel>

      {/* The dashboard and the 3D world deliberately do NOT show the floating
          music widget — this is the control for both of them. */}
      <BlockPanel variant="panel" title="Music">
        <fieldset className="border-0 p-0">
          <legend className="font-pixel text-[10px] uppercase text-mc-text-dim">
            Background music
          </legend>
          <p className="mt-[calc(var(--mc-unit)*0.5)] text-[18px] text-mc-text-dim">
            <strong className="text-mc-text">{MUSIC_TRACK.label}</strong> plays while you
            browse the site. Your choice is remembered on this device.
          </p>

          <div className="mt-[var(--mc-unit)] flex flex-wrap gap-[calc(var(--mc-unit)*0.5)]">
            {(
              [
                { id: "on", label: "Music on", muted: false },
                { id: "off", label: "Music off", muted: true },
              ] as const
            ).map((opt) => (
              <BlockButton
                key={opt.id}
                size="sm"
                variant={muted === opt.muted ? "primary" : "ghost"}
                aria-pressed={muted === opt.muted}
                onClick={() => applyMusic(opt.muted)}
              >
                {opt.label}
              </BlockButton>
            ))}
          </div>
        </fieldset>
      </BlockPanel>

      <BlockPanel variant="panel" title="Account">
        <dl className="flex flex-col gap-[calc(var(--mc-unit)*0.5)] text-[19px]">
          <div className="flex flex-wrap gap-x-[var(--mc-unit)]">
            <dt className="text-mc-text-dim">Email</dt>
            <dd>{session?.email ?? "—"}</dd>
          </div>
          <div className="flex flex-wrap gap-x-[var(--mc-unit)]">
            <dt className="text-mc-text-dim">Player</dt>
            <dd>{character?.playerName ?? "—"}</dd>
          </div>
          <div className="flex flex-wrap gap-x-[var(--mc-unit)]">
            <dt className="text-mc-text-dim">Roles</dt>
            <dd>{session?.roles.join(", ") ?? "—"}</dd>
          </div>
        </dl>
      </BlockPanel>
    </div>
  );
}
