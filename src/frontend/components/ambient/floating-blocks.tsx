"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { seededRandom } from "@/frontend/lib/assets/placeholder";
import {
  INVISIBLE_MATERIAL,
  OUTLINE_GEOMETRY,
  SHADED_BOX,
} from "@/frontend/lib/ambient/block-geometry";
import { loadAmbientPack } from "@/frontend/lib/ambient/texture-loader";
import { playBreakSfx } from "@/frontend/lib/ambient/break-sfx";
import type { PageBand } from "@/frontend/lib/ambient/page-band";
import { BlockBreakFx, type BreakSpec } from "./block-break-fx";
import { useBlockPointer } from "./use-block-pointer";

/**
 * The drifting block field.
 *
 * MOTION LIVES IN A REF, IDENTITY LIVES IN STATE. That split is not stylistic:
 * render needs to know which block is which and which material it wears, and a
 * ref is not a rendering input; the frame loop needs to mutate positions sixty
 * times a second, and a state value is not a mutable buffer. So `seeds` (state)
 * carries the parts React draws with, `motion` (ref) carries everything that
 * changes per frame, and the only bridge between them is a `setSeeds` call when
 * a block respawns as a different type -- an event measured in seconds.
 *
 * This is the rule `voxel/village-scene.tsx` states explicitly: React is never
 * in the hot loop.
 *
 * BLOCKS LIVE IN VIEWPORT SPACE AND IGNORE SCROLL ENTIRELY. Each block owns a
 * `screenY` in viewport pixels; it drifts upward on its own clock and wraps at
 * the top. Nothing here reads `scrollY`.
 *
 * They used to be document-anchored — rising out of the footer and retiring at
 * the hero — so scrolling carried them past you. That tied every block to the
 * scroll path and made the field's density a function of page length. Detaching
 * them means the blocks simply hang in the air in front of whatever you have
 * scrolled to, and the frame loop no longer touches the document at all.
 *
 * SPAWN BANDS. Horizontally, blocks are confined to the outer margins, never
 * the centre column where the site's copy and CTAs live. That is the same
 * convention `decor/section-decor.tsx` follows for its sprites, and it is the
 * first line of defence for "must never fight the content" -- the pointer gate
 * in `use-block-pointer.ts` is the second, and painting the whole layer behind
 * the page (see `#ambient-blocks` in globals.css) is the third.
 */

/** Milliseconds for the full ten-stage crack. Short enough to feel like a tap. */
const CRACK_MS = 340;
/** Seconds before a broken block returns, low in the band. */
const RESPAWN_MIN = 2.5;
const RESPAWN_MAX = 6;

/** Upward drift, in DOCUMENT pixels per second. */
const RISE_MIN = 16;
const RISE_MAX = 34;

/** What React draws with. Changes only when a block respawns. */
interface BlockSeed {
  id: number;
  assetIndex: number;
}

/** What the frame loop mutates. Never read during render. */
interface BlockMotion {
  assetIndex: number;
  /** Horizontal position, in world units. */
  x: number;
  /** Vertical position, in VIEWPORT pixels from the top of the screen. */
  screenY: number;
  z: number;
  size: number;
  /** Viewport pixels per second, upward. */
  rise: number;
  swayAmp: number;
  swayFreq: number;
  swayPhase: number;
  spinX: number;
  spinY: number;
  state: "alive" | "cracking" | "gone";
  /** 0..1 across the crack sequence. */
  crackT: number;
  /** Clock time at which a gone block returns. */
  respawnAt: number;
  /** Eased 0..1 pop-in after a respawn. */
  popT: number;
}

export function FloatingBlocks({ count, band }: { count: number; band: PageBand }) {
  const pack = use(loadAmbientPack());
  const { viewport, size, camera } = useThree();

  const meshes = useRef<Array<THREE.Mesh | null>>([]);
  const overlays = useRef<Array<THREE.Mesh | null>>([]);
  const outlineRef = useRef<THREE.LineSegments>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  const [breaks, setBreaks] = useState<BreakSpec[]>([]);
  /**
   * The band re-measures when the page reflows, but the frame loop must not
   * close over a stale prop. A ref synced in an effect keeps the loop reading
   * current bounds without re-subscribing `useFrame` on every measurement.
   */
  const bandRef = useRef(band);
  useEffect(() => {
    bandRef.current = band;
  }, [band]);
  const hoverId = useRef<number | null>(null);
  const nextBreakId = useRef(1);

  const rnd = useMemo(() => seededRandom("ambient:field:v1"), []);

  /**
   * Outer margins only: |x| between 58% and 96% of the half-width.
   *
   * `side` is forced for the initial layout and left random for respawns.
   * Letting the seed choose both at once produced a visibly lopsided field --
   * seven blocks on the right, two on the left -- which reads as a bug rather
   * than as randomness. Alternating the initial placement guarantees balance
   * without making the drift look regimented.
   */
  const pickX = useCallback(
    (halfW: number, side?: -1 | 1) => {
      const t = 0.58 + rnd() * 0.38;
      const sign = side ?? (rnd() < 0.5 ? -1 : 1);
      return sign * t * halfW;
    },
    [rnd],
  );

  /** Weighted so grass shows up more often than the ores. */
  const pickAsset = useCallback(() => {
    const total = pack.blocks.reduce((sum, b) => sum + (b.def.weight ?? 1), 0);
    let roll = rnd() * total;
    for (let i = 0; i < pack.blocks.length; i++) {
      roll -= pack.blocks[i].def.weight ?? 1;
      if (roll <= 0) return i;
    }
    return 0;
  }, [pack.blocks, rnd]);

  const [seeds, setSeeds] = useState<BlockSeed[]>(() =>
    Array.from({ length: count }, (_, i) => ({ id: i, assetIndex: pickAsset() })),
  );

  /**
   * Built on the first frame rather than during render, because building it
   * during render would mean either reading a ref there or mutating a state
   * value later -- both of which the React compiler rejects, and rightly.
   * R3F runs every `useFrame` subscriber before it renders the frame, so the
   * transforms below are applied before anything is ever drawn: there is no
   * flash of blocks stacked at the origin.
   */
  const motion = useRef<BlockMotion[] | null>(null);

  const buildMotion = useCallback((): BlockMotion[] => {
    const halfW = viewport.width / 2;
    const vh = size.height;
    return seeds.map((seed, i) => ({
      assetIndex: seed.assetIndex,
      x: pickX(halfW, i % 2 === 0 ? -1 : 1),
      // Spread evenly down the viewport with a little jitter, so the field is
      // already populated on first paint instead of drifting in from below.
      screenY: ((i + 0.5) / seeds.length) * vh + (rnd() - 0.5) * (vh / seeds.length),
      z: -rnd() * 4,
      size: 0.68 + rnd() * 0.18,
      rise: RISE_MIN + rnd() * (RISE_MAX - RISE_MIN),
      swayAmp: 0.08 + rnd() * 0.12,
      swayFreq: 0.25 + rnd() * 0.35,
      swayPhase: rnd() * Math.PI * 2,
      spinX: (rnd() - 0.5) * 0.16,
      spinY: (rnd() - 0.5) * 0.16,
      state: "alive",
      crackT: 0,
      respawnAt: 0,
      popT: 1,
    }));
  }, [pickX, rnd, seeds, size.height, viewport.width]);

  /** Which block, if any, sits under these client coordinates. */
  const hitTest = useCallback(
    (clientX: number, clientY: number): number | null => {
      const live = motion.current;
      if (!live) return null;
      // `size` rather than `getBoundingClientRect()`: the canvas is
      // `position: fixed; inset: 0` (see #ambient-blocks in globals.css), so its
      // box is the viewport and its origin is 0,0. R3F already tracks that size
      // and updates it on resize, so using it turns a forced layout read on the
      // pointer path into a property lookup.
      const ndc = new THREE.Vector2(
        (clientX / size.width) * 2 - 1,
        -(clientY / size.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);

      // `visible` matters as much as `state` here: Raycaster does not skip
      // hidden objects, so without this a block scrolled off screen would
      // still swallow clicks over whatever is actually under the pointer.
      const targets = meshes.current.filter(
        (m, i): m is THREE.Mesh => m !== null && m.visible && live[i]?.state === "alive",
      );
      const hit = raycaster.intersectObjects(targets, false)[0];
      if (!hit) return null;
      return meshes.current.findIndex((m) => m === hit.object);
    },
    [camera, size.width, size.height, raycaster],
  );

  const onHover = useCallback((id: number | null) => {
    hoverId.current = id;
  }, []);

  /**
   * Input arrives on the window thread; the simulation is owned by the frame
   * loop. Rather than let a pointer handler reach in and mutate a block mid
   * frame, handlers append a command here and `useFrame` drains it.
   *
   * That is not ceremony. It keeps every write to `motion` in exactly one
   * place, which is both what the React compiler's immutability rule asks for
   * and what stops a click landing between two frames from tearing the state
   * it half-updated. Commands are appended by REPLACING the array, never by
   * mutating it in place.
   */
  const pending = useRef<Array<{ id: number; kind: "press" | "cancel" }> | null>(null);

  const enqueue = useCallback((id: number, kind: "press" | "cancel") => {
    pending.current = [...(pending.current ?? []), { id, kind }];
  }, []);

  const onPress = useCallback(
    (id: number) => {
      const b = motion.current?.[id];
      if (!b || b.state !== "alive") return;
      // Sound fires here, not next frame, so the block answers the finger going
      // down rather than a frame later.
      playBreakSfx(pack.blocks[b.assetIndex].def.sfx);
      enqueue(id, "press");
    },
    [enqueue, pack.blocks],
  );

  const onCancel = useCallback(
    (id: number) => {
      enqueue(id, "cancel");
    },
    [enqueue],
  );

  useBlockPointer({ hitTest, onHover, onPress, onCancel, enabled: true });

  const removeBreak = useCallback((id: number) => {
    setBreaks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  useFrame((state, delta) => {
    const band = bandRef.current;
    const live = (motion.current ??= buildMotion());
    const dt = Math.min(delta, 1 / 30);
    const t = state.clock.elapsedTime;
    const halfW = viewport.width / 2;
    const shattered: BreakSpec[] = [];
    const retyped: Array<[number, number]> = [];

    // Pixels per world unit, derived rather than hard-coded so it stays correct
    // if the camera zoom is ever retuned.
    const ppu = size.height / viewport.height;

    // Drain input commands before stepping, so a click is honoured on the very
    // next frame rather than the one after.
    const commands = pending.current;
    if (commands) {
      pending.current = null;
      for (const cmd of commands) {
        const b = live[cmd.id];
        if (!b) continue;
        if (cmd.kind === "press" && b.state === "alive") {
          b.state = "cracking";
          b.crackT = 0;
        } else if (cmd.kind === "cancel" && b.state === "cracking") {
          b.state = "alive";
          b.crackT = 0;
          const overlay = overlays.current[cmd.id];
          if (overlay) overlay.visible = false;
        }
      }
    }

    for (let i = 0; i < live.length; i++) {
      const b = live[i];
      const mesh = meshes.current[i];
      if (!mesh) continue;

      const halfPx = (b.size * ppu) / 2;

      if (b.state === "gone") {
        mesh.visible = false;
        if (t >= b.respawnAt) {
          b.assetIndex = pickAsset();
          b.x = pickX(halfW);
          // Broken blocks re-enter from just below the fold.
          b.screenY = size.height + halfPx;
          b.state = "alive";
          b.crackT = 0;
          b.popT = 0;
          retyped.push([i, b.assetIndex]);
        }
        continue;
      }

      b.screenY -= b.rise * dt;
      // Wraps a half-block clear of the header so the reset happens out of
      // sight rather than popping in under the nav.
      if (b.screenY + halfPx < band.header) {
        b.screenY = size.height + halfPx;
        b.x = pickX(halfW);
      }

      // Still hidden while passing behind the sticky header — that is the one
      // piece of page chrome the blocks must not appear over.
      mesh.visible = b.screenY + halfPx > band.header;

      const worldY = viewport.height / 2 - b.screenY / ppu;
      mesh.position.set(b.x + Math.sin(t * b.swayFreq + b.swayPhase) * b.swayAmp, worldY, b.z);
      mesh.rotation.x += b.spinX * dt;
      mesh.rotation.y += b.spinY * dt;

      // Pop-in after a respawn, so a block never simply blinks into existence.
      if (b.popT < 1) {
        b.popT = Math.min(1, b.popT + dt / 0.22);
        mesh.scale.setScalar(b.size * (1 - Math.pow(1 - b.popT, 3)));
      } else {
        mesh.scale.setScalar(b.size);
      }

      const overlay = overlays.current[i];
      if (b.state === "cracking") {
        b.crackT += (dt * 1000) / CRACK_MS;
        if (pack.crackMaterials.length && overlay) {
          const stage = Math.min(pack.crackMaterials.length - 1, Math.floor(b.crackT * 10));
          overlay.material = pack.crackMaterials[stage];
          overlay.visible = true;
        }
        if (b.crackT >= 1) {
          if (overlay) overlay.visible = false;
          mesh.visible = false;
          b.state = "gone";
          b.respawnAt = t + RESPAWN_MIN + rnd() * (RESPAWN_MAX - RESPAWN_MIN);
          shattered.push({
            id: nextBreakId.current++,
            origin: mesh.position.clone(),
            size: b.size,
            def: pack.blocks[b.assetIndex].def,
            material: pack.blocks[b.assetIndex].shardMaterial,
          });
        }
      } else if (overlay?.visible) {
        overlay.visible = false;
      }
    }

    // Hover outline: one shared object, repositioned rather than re-created.
    const outline = outlineRef.current;
    if (outline) {
      const id = hoverId.current;
      const target = id !== null ? meshes.current[id] : null;
      const b = id !== null ? live[id] : null;
      if (target?.visible && b && b.state === "alive") {
        outline.visible = true;
        outline.position.copy(target.position);
        outline.rotation.copy(target.rotation);
        // Minecraft's own hover affordance: a wireframe box a touch larger than
        // the block. Chosen over a cursor swap because the site already uses a
        // pickaxe cursor everywhere, so changing the cursor would say nothing.
        outline.scale.setScalar(b.size * 1.04);
      } else {
        outline.visible = false;
      }
    }

    if (shattered.length) setBreaks((prev) => [...prev, ...shattered]);
    if (retyped.length) {
      setSeeds((prev) => {
        const next = prev.slice();
        for (const [i, assetIndex] of retyped) next[i] = { ...next[i], assetIndex };
        return next;
      });
    }
  });

  return (
    <>
      {seeds.map((seed, i) => (
        <mesh
          key={seed.id}
          ref={(el) => {
            meshes.current[i] = el;
          }}
          geometry={SHADED_BOX}
          material={pack.blocks[seed.assetIndex].material}
          renderOrder={0}
        >
          <mesh
            ref={(el) => {
              overlays.current[i] = el;
              // Visibility is driven imperatively and never as a prop: a
              // re-render caused by an unrelated block breaking would otherwise
              // reset a crack that is mid-sequence.
              if (el) el.visible = false;
            }}
            geometry={SHADED_BOX}
            // Scale AND polygonOffset (set on the material) against z-fighting.
            // Either one alone still flickers on a tumbling cube.
            scale={1.004}
            renderOrder={1}
            // Passed as a prop rather than as a child <primitive>: R3F allows a
            // primitive object to be mounted in exactly one place, and this same
            // material instance is deliberately shared by every block's overlay.
            // The frame loop swaps it per stage; this is only the initial value.
            material={pack.crackMaterials[0] ?? INVISIBLE_MATERIAL}
          />
        </mesh>
      ))}

      <lineSegments ref={outlineRef} geometry={OUTLINE_GEOMETRY} renderOrder={2} visible={false}>
        <lineBasicMaterial color="#000000" transparent opacity={0.35} depthWrite={false} />
      </lineSegments>

      {breaks.map((spec) => (
        <BlockBreakFx key={spec.id} spec={spec} onDone={removeBreak} />
      ))}
    </>
  );
}
