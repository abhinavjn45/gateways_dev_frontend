"use client";

import { createContext, useContext } from "react";
import type * as THREE from "three";
import {
  BEAM_ANCHOR_Y,
  BOARD_H,
  DROP_S,
  LINK_H,
  MAX_LINKS,
  RAISE_S,
  SCALE,
  SETTLE_S,
  bounceY,
  dropY,
  fitFor,
  rigOffsetY,
  rowHeight,
  swayImpulse,
  swayZ,
} from "@/frontend/lib/sign/sign-motion";

/**
 * The mutable state of every sign on the page, and the one function that
 * advances it.
 *
 * DELIBERATELY NOT REACT STATE. All of this changes every frame during a drop,
 * and routing it through `useState` would re-render twenty rows sixty times a
 * second to move a box. React holds exactly one fact about a sign — the boolean
 * the button's `aria-expanded` reads — and this holds the rest. Same division
 * `floating-blocks.tsx` draws with its `BlockSeed` / `BlockMotion` split, and
 * the same rule: React is never in the hot loop.
 *
 * EVERY MUTATION IS A METHOD ON THIS OBJECT, and callers only ever call them.
 * That is not ceremony — the store reaches components through context, and
 * React's compiler rightly refuses to let them assign to a value a hook
 * returned. Keeping the writes in here satisfies that by construction, and has
 * the better side effect of making `step()` a pure-ish function of time that
 * can be reasoned about (and tested) without a WebGL context.
 */

export type SignPhase = "closed" | "dropping" | "open" | "retracting";

export interface SignHandle {
  /** The DOM row. `step` writes its height; nothing else touches it. */
  row: HTMLElement | null;
  /** The rig, pinned to the top of the row as the row grows beneath it. */
  group: THREE.Group | null;
  /** The board, parented to the swing pivot at the beam's underside. */
  board: THREE.Object3D | null;
  links: THREE.Object3D[];
  phase: SignPhase;
  /** 0 parked behind the beam, 1 hanging at rest. */
  progress: number;
  /** Seconds since the chain went taut, or -1 when nothing is ringing. */
  since: number;
  /** Seconds since the pointer arrived, or -1. */
  poke: number;
  /** Last measured row width, for the fit-to-width scale. */
  width: number;
}

export interface SignAttachment {
  row?: HTMLElement | null;
  group?: THREE.Group | null;
  board?: THREE.Object3D | null;
  links?: THREE.Object3D[];
}

export interface SignStore {
  attach(id: string, parts: SignAttachment): void;
  detach(id: string): void;
  /** Every row is the same width, so this is one call, not one per sign. */
  setWidth(width: number): void;
  widthOf(id: string): number;
  progressOf(id: string): number;
  /** Begin a drop or a retract. */
  setOpen(id: string, open: boolean): void;
  /**
   * Adopt an already-decided open state WITHOUT animating it.
   *
   * The open set is shared with the accordion and survives the swap between
   * them, so a sign can mount already open — resize a narrow window wide with
   * an answer showing, or turn reduced motion off. Without this the board would
   * sit parked behind its beam while `aria-expanded` said otherwise, and only a
   * second click would ever put them back in agreement.
   */
  restore(id: string, open: boolean): void;
  /** Disturb a hanging sign, on hover or focus. */
  nudge(id: string): void;
  /** Ask for a frame. The canvas runs on demand, so this is not optional. */
  wake(): void;
  setWake(fn: () => void): void;
  /** Advance every sign by `dt` seconds. Returns true while anything moves. */
  step(dt: number): boolean;
}

function blank(): SignHandle {
  return {
    row: null,
    group: null,
    board: null,
    links: [],
    phase: "closed",
    progress: 0,
    since: -1,
    poke: -1,
    width: 0,
  };
}

export function createSignStore(): SignStore {
  const signs = new Map<string, SignHandle>();
  let width = 0;
  let wake = () => {};

  function get(id: string): SignHandle {
    let handle = signs.get(id);
    if (!handle) {
      handle = blank();
      handle.width = width;
      signs.set(id, handle);
    }
    return handle;
  }

  return {
    attach(id, parts) {
      const handle = get(id);
      if (parts.row !== undefined) handle.row = parts.row;
      if (parts.group !== undefined) handle.group = parts.group;
      if (parts.board !== undefined) handle.board = parts.board;
      if (parts.links !== undefined) handle.links = parts.links;
    },
    detach(id) {
      signs.delete(id);
    },
    setWidth(next) {
      width = next;
      for (const handle of signs.values()) handle.width = next;
    },
    widthOf(id) {
      return get(id).width || width;
    },
    progressOf(id) {
      return get(id).progress;
    },
    setOpen(id, open) {
      const handle = get(id);
      handle.phase = open ? "dropping" : "retracting";
      wake();
    },
    restore(id, open) {
      const handle = get(id);
      handle.phase = open ? "open" : "closed";
      handle.progress = open ? 1 : 0;
      // No `since`: this is a sign that has been hanging all along, not one
      // that just landed. Ringing it here would animate the very thing this
      // exists to avoid animating.
      handle.since = -1;
      wake();
    },
    nudge(id) {
      // Restart the impulse rather than adding to it, so re-entering the beam
      // repeatedly cannot stack pokes into a wild swing.
      get(id).poke = 0;
      wake();
    },
    wake: () => wake(),
    setWake(fn) {
      wake = fn;
    },

    step(dt) {
      let busy = false;

      for (const sign of signs.values()) {
        // ── clocks ────────────────────────────────────────────────────────
        if (sign.phase === "dropping") {
          sign.progress += dt / DROP_S;
          if (sign.progress >= 1) {
            sign.progress = 1;
            sign.phase = "open";
            // The chain has just gone taut. Everything springy starts here.
            sign.since = 0;
          }
          busy = true;
        } else if (sign.phase === "retracting") {
          sign.progress -= dt / RAISE_S;
          if (sign.progress <= 0) {
            sign.progress = 0;
            sign.phase = "closed";
            sign.since = -1;
            sign.poke = -1;
          }
          busy = true;
        } else if (sign.since >= 0) {
          sign.since += dt;
          if (sign.since > SETTLE_S) sign.since = -1;
          else busy = true;
        }

        if (sign.poke >= 0) {
          sign.poke += dt;
          if (sign.poke > SETTLE_S) sign.poke = -1;
          else busy = true;
        }

        // ── the DOM box and the scene inside it ───────────────────────────
        // Both read the SAME `sign.progress`, in the same statement block, in
        // the same frame. That is what makes it impossible for the row and the
        // board hanging inside it to disagree about how far the sign has come.
        if (sign.row) {
          sign.row.style.height = `${rowHeight(sign.width, sign.progress).toFixed(2)}px`;
        }

        const { group, board } = sign;
        if (!group || !board) continue;

        const fit = fitFor(sign.width) * SCALE;
        group.scale.setScalar(fit);
        // In pixels, because the group's own scale converts sign units to them.
        group.position.y = rigOffsetY(sign.progress) * fit;

        const settling = sign.since >= 0;
        const boardY = dropY(sign.progress) + (settling ? bounceY(sign.since) : 0);

        board.position.y = boardY - BEAM_ANCHOR_Y;
        board.visible = sign.progress > 0.001;

        // The board and its chains share one pivot at the beam's underside, so
        // rotating that pivot swings them together the way a real hanging sign
        // moves — no per-link lean to keep in sync with a board it is not
        // attached to.
        const swing = board.parent;
        if (swing) {
          swing.rotation.z =
            (settling ? swayZ(sign.since) : 0) + (sign.poke >= 0 ? swayImpulse(sign.poke) : 0);
        }

        // Links are fixed-pitch and appear as the chain pays out: a chain gets
        // longer by gaining links, not by its links stretching.
        const span = BEAM_ANCHOR_Y - (boardY + BOARD_H / 2);
        const shown = Math.min(MAX_LINKS, Math.max(0, Math.ceil(span / LINK_H)));
        for (let i = 0; i < sign.links.length; i++) {
          // The array is flat but the links come in PAIRS — one per chain at
          // the same height — so the row is `i >> 1`, not `i`. Comparing the
          // flat index against the row count lights the left and right link of
          // row 0 and calls that a two-link chain, which reads on screen as a
          // board floating below a stub of chain that never reaches it.
          sign.links[i].visible = board.visible && i >> 1 < shown;
        }
      }

      return busy;
    },
  };
}

export const SignStoreContext = createContext<SignStore | null>(null);

export function useSignStore(): SignStore {
  const store = useContext(SignStoreContext);
  if (!store) throw new Error("useSignStore must be used inside the FAQ sign layer");
  return store;
}
