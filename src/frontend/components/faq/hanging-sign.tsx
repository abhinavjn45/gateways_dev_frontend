"use client";

import { useEffect, useRef, useState } from "react";
import type * as THREE from "three";
import { SHADED_BOX } from "@/frontend/lib/ambient/block-geometry";
import { BEAM_MAT, BOARD_MAT, IRON_MAT, PLATE_SHADE, UNIT_PLANE } from "@/frontend/lib/sign/sign-geometry";
import {
  BEAM_ANCHOR_Y,
  BEAM_D,
  BEAM_H,
  BEAM_W,
  BOARD_D,
  BOARD_H,
  BOARD_W,
  CHAIN_X,
  HIDDEN_Y,
  LINK_H,
  MAX_LINKS,
  STRAP_OVERHANG,
  STRAP_W,
} from "@/frontend/lib/sign/sign-motion";
import { getBeamTexture, getBoardTexture } from "@/frontend/lib/sign/sign-textures";
import { useSignStore } from "./sign-store";

/**
 * One sign, as a scene graph. No animation lives here — `sign-driver.tsx` owns
 * every per-frame write, and this component's only job is to build the objects
 * and hand their references to the store.
 *
 * THE PIVOT IS THE POINT. The chains and the board sit inside a `swing` group
 * whose origin is the beam's underside, so rotating that one group swings the
 * board and its chains together the way a hanging sign actually moves. The
 * alternative — rotating the board and then leaning each link to match — is
 * what the reference sketch does, and it needs the links to re-derive a lean
 * from a board they are not attached to on every frame.
 */
export function HangingSign({
  id,
  question,
  answer,
  open,
}: {
  id: string;
  question: string;
  answer: string;
  open: boolean;
}) {
  const store = useSignStore();
  const group = useRef<THREE.Group>(null);
  const board = useRef<THREE.Group>(null);
  const links = useRef<THREE.Mesh[]>([]);

  /**
   * Both textures are fetched DURING RENDER, not from an effect.
   *
   * They come out of a module-level cache, so this is a lookup after the first
   * call — the same shape as the ambient layer's `use(loadAmbientPack())`. An
   * effect would need `setState` to publish the result, which costs a second
   * render pass to show something that was available all along.
   */
  const beamMap = getBeamTexture(question, () => store.wake());

  /**
   * The board's texture is 2.5MB and is only worth baking once a sign has been
   * opened. `everOpened` is adjusted during render rather than in an effect —
   * React's documented pattern for state derived from props, and it keeps the
   * texture available on the very first frame of the drop instead of one frame
   * late.
   */
  const [everOpened, setEverOpened] = useState(open);
  if (open && !everOpened) setEverOpened(true);
  const boardMap = everOpened ? getBoardTexture(answer, () => store.wake()) : null;

  // Publish the objects the store's `step` mutates. Refs, not state: nothing
  // in here may cause a render.
  useEffect(() => {
    store.attach(id, { group: group.current, board: board.current, links: links.current });
    // The canvas renders on demand. Without this the sign is fully built and
    // then never drawn, because nothing else on an idle page asks for a frame.
    store.wake();
    return () => store.attach(id, { group: null, board: null, links: [] });
  }, [store, id]);

  return (
    <group ref={group}>
      {/* Turned a few degrees off square. Without it the camera is dead-on and
          the sign is a flat rectangle: no top face, no side face, none of the
          per-face shading that makes a box read as a box. Small enough (≈7°)
          that the baked text loses under half a percent to foreshortening. */}
      <group rotation={[0.055, -0.12, 0]}>
        <mesh geometry={SHADED_BOX} material={BEAM_MAT} scale={[BEAM_W, BEAM_H, BEAM_D]} />
        <mesh geometry={UNIT_PLANE} scale={[BEAM_W, BEAM_H, 1]} position={[0, 0, BEAM_D / 2 + 0.01]}>
          {/* Declared in JSX so R3F owns its lifecycle and disposes it on
              unmount — the same reason `block-break-fx.tsx` does it here
              rather than building materials by hand in an effect. */}
          <meshBasicMaterial map={beamMap} color={PLATE_SHADE} toneMapped={false} />
        </mesh>

        {/* The straps the chains run behind, at the same x as the chains. */}
        {[-CHAIN_X, CHAIN_X].map((x) => (
          <mesh
            key={x}
            geometry={SHADED_BOX}
            material={IRON_MAT}
            scale={[STRAP_W, BEAM_H + STRAP_OVERHANG, BEAM_D + 0.1]}
            position={[x, 0, 0]}
          />
        ))}

        <group position={[0, BEAM_ANCHOR_Y, 0]}>
          {/* Fixed-pitch links. The driver shows and hides them as the chain
              pays out, so a link is always exactly one link tall — a chain gets
              longer by gaining links, not by its links stretching. */}
          {Array.from({ length: MAX_LINKS }).map((_, i) =>
            [-CHAIN_X, CHAIN_X].map((x, side) => (
              <mesh
                key={`${i}:${x}`}
                // Assigned by index, never pushed: a ref callback fires again
                // on every re-render, and a push would grow the array forever.
                ref={(node) => {
                  if (node) links.current[i * 2 + side] = node;
                }}
                geometry={SHADED_BOX}
                material={IRON_MAT}
                // Alternating quarter-turns. The cross-section is deliberately
                // NOT square (0.20 × 0.13) — a square one looks identical after
                // a 90° turn, and the twist that says "chain" disappears.
                rotation={[0, i % 2 ? Math.PI / 2 : 0, 0]}
                scale={[0.2, LINK_H * 0.86, 0.13]}
                position={[x, -(i + 0.5) * LINK_H, 0]}
                visible={false}
              />
            )),
          )}

          <group ref={board} position={[0, HIDDEN_Y - BEAM_ANCHOR_Y, 0]} visible={false}>
            <mesh
              geometry={SHADED_BOX}
              material={BOARD_MAT}
              scale={[BOARD_W, BOARD_H, BOARD_D]}
            />
            <mesh
              geometry={UNIT_PLANE}
              scale={[BOARD_W, BOARD_H, 1]}
              position={[0, 0, BOARD_D / 2 + 0.01]}
            >
              <meshBasicMaterial map={boardMap} color={PLATE_SHADE} toneMapped={false} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}
