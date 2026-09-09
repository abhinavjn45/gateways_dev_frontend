"use client";

import { useFrame } from "@react-three/fiber";
import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/**
 * The assistant's face — a voxel bust that sits above the Ask launcher.
 *
 * A BUST, not the whole robot. The reference build is a full torso-and-head
 * figure, which is the right shape for a page-filling canvas; this one renders
 * at about 96px square in the corner of the screen, where a torso would be four
 * grey pixels under a head nobody can read. Everything identifying — the stone
 * shell, the green pixel eyes and smile, the teal ear modules, the forehead gem
 * and the grass block on top — is in the head, so the head is what we keep.
 *
 * BUILT TO BE CHEAP, because it renders on every public page:
 *
 *  - `shadows` off. A shadow map for a 96px canvas costs more than it shows.
 *  - `dpr` capped at 1.5 (the village scene uses 1.75 at full size).
 *  - `frameloop` is driven by the parent: it stops entirely when the tab is
 *    hidden or the user prefers reduced motion, so an idle page renders nothing.
 *  - Three materials and ~40 boxes, all `MeshLambertMaterial` — no PBR, no
 *    environment map, no tone mapping pass.
 *
 * Colours are literal rather than themed. This is a character, and a character
 * that changes colour with the site's theme reads as a bug; the site's own
 * material tokens (grass, stone, emerald) are theme-independent for exactly the
 * same reason — see the note on the palette in globals.css.
 */

const STONE = "#77736e";
const DARK_STONE = "#343332";
const SCREEN = "#050706";
const EMERALD = "#38ff4d";
const TEAL = "#0aa8a3";
const DIRT = "#684323";
const GRASS = "#64a832";

/** One voxel. `p` is the centre, `s` the size — same shape as a Minecraft block. */
function Box({
  p,
  s,
  color,
  emissive,
}: {
  p: [number, number, number];
  s: [number, number, number];
  color: string;
  emissive?: string;
}) {
  return (
    <mesh position={p}>
      <boxGeometry args={s} />
      <meshLambertMaterial color={color} emissive={emissive ?? "#000000"} />
    </mesh>
  );
}

/**
 * A pixel-art shape drawn on a grid, the way the face is authored.
 *
 * Cells are grid coordinates, so an eye is a list of squares rather than nine
 * hand-placed boxes with hand-computed offsets — the same trick `item-icon.tsx`
 * uses for its SVG glyphs, and it means the face can be edited by moving
 * numbers rather than by doing arithmetic.
 */
function PixelShape({
  cells,
  size,
  z,
  color,
  origin = [0, 0],
}: {
  cells: [number, number][];
  size: number;
  z: number;
  color: string;
  origin?: [number, number];
}) {
  return (
    <>
      {cells.map(([gx, gy], i) => (
        <Box
          key={i}
          p={[origin[0] + gx * size, origin[1] + gy * size, z]}
          s={[size, size, 0.06]}
          color={color}
          emissive={color}
        />
      ))}
    </>
  );
}

const LEFT_EYE: [number, number][] = [
  [-4, 2], [-3, 2],
  [-5, 1], [-4, 1], [-3, 1],
  [-5, 0], [-4, 0],
  [-4, -1], [-3, -1],
];

const RIGHT_EYE: [number, number][] = [
  [3, 2], [4, 2],
  [3, 1], [4, 1], [5, 1],
  [4, 0], [5, 0],
  [3, -1], [4, -1],
];

const SMILE: [number, number][] = [
  [-2, -4], [-1, -5], [0, -5], [1, -5], [2, -4],
];

function Bot({ active }: { active: boolean }) {
  const head = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const gem = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (head.current) {
      // Bob, and turn toward the pointer. `state.pointer` is already normalised
      // to -1..1 over the canvas, so no listener and no cleanup needed.
      head.current.position.y = Math.sin(t * 1.6) * 0.06;
      const targetY = state.pointer.x * 0.5;
      const targetX = -state.pointer.y * 0.25;
      head.current.rotation.y += (targetY - head.current.rotation.y) * 0.08;
      head.current.rotation.x += (targetX - head.current.rotation.x) * 0.08;
    }
    // Eyes track a little further than the head, which is what sells it as
    // looking AT you rather than merely facing you.
    if (eyes.current) {
      const ex = THREE.MathUtils.clamp(state.pointer.x * 0.16, -0.09, 0.09);
      const ey = THREE.MathUtils.clamp(-state.pointer.y * 0.12, -0.06, 0.06);
      eyes.current.position.x += (ex - eyes.current.position.x) * 0.12;
      eyes.current.position.y += (ey - eyes.current.position.y) * 0.12;
    }
    // The gem pulses only while the assistant is working, so the launcher
    // doubles as a "thinking" indicator without any extra chrome.
    if (gem.current) {
      const m = gem.current.material as THREE.MeshLambertMaterial;
      m.emissiveIntensity = active ? 1.2 + Math.sin(t * 6) * 0.8 : 1;
    }
  });

  return (
    <group ref={head} scale={0.42}>
      {/* Shell and front plate */}
      <Box p={[0, 0, 0]} s={[5.4, 4.25, 3.2]} color={DARK_STONE} />
      <Box p={[0, 0, 1.49]} s={[5.15, 4.0, 0.42]} color={STONE} />
      {/* Face screen the pixels sit on */}
      <Box p={[0, -0.15, 1.75]} s={[3.95, 2.82, 0.18]} color={SCREEN} />
      {/* Brow */}
      <Box p={[0, 1.68, 1.72]} s={[4.7, 0.55, 0.36]} color={STONE} />

      <group ref={eyes}>
        <PixelShape cells={LEFT_EYE} size={0.3} z={1.92} color={EMERALD} />
        <PixelShape cells={RIGHT_EYE} size={0.3} z={1.92} color={EMERALD} />
      </group>
      <PixelShape cells={SMILE} size={0.27} z={1.92} color={EMERALD} />

      {/* Ear modules */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 3.0, 0.05, 0.1]}>
          <Box p={[0, 0, 0]} s={[0.72, 1.55, 1.65]} color={DARK_STONE} />
          <Box p={[0, 0, 0.98]} s={[0.24, 0.52, 0.12]} color={TEAL} emissive={TEAL} />
        </group>
      ))}

      {/* Forehead gem */}
      <Box p={[0, 1.4, 1.95]} s={[1.0, 1.0, 0.34]} color={DARK_STONE} />
      <mesh ref={gem} position={[0, 1.4, 2.18]}>
        <boxGeometry args={[0.56, 0.56, 0.16]} />
        <meshLambertMaterial color={EMERALD} emissive={EMERALD} />
      </mesh>

      {/* Grass block on top — the single most Minecraft thing about him */}
      <group position={[0, 2.56, 0]}>
        <Box p={[0, 0, 0]} s={[2.4, 0.75, 1.8]} color={DIRT} />
        <Box p={[0, 0.5, 0]} s={[2.48, 0.28, 1.88]} color={GRASS} />
        <Box p={[-0.8, 0.7, -0.5]} s={[0.42, 0.18, 0.42]} color={GRASS} />
        <Box p={[0.0, 0.7, 0.2]} s={[0.42, 0.18, 0.42]} color={GRASS} />
        <Box p={[0.75, 0.7, -0.35]} s={[0.42, 0.18, 0.42]} color={GRASS} />
      </group>
    </group>
  );
}

/**
 * The canvas. Default-exported so `next/dynamic` can pull it in one chunk.
 *
 * `frameloop` is the whole performance story: "demand" renders a single frame
 * and then stops, which is what a reduced-motion, backgrounded, or scrolled-away
 * page gets.
 *
 * THE SCROLLED-AWAY CASE WAS MISSING. This comment previously claimed the scene
 * stopped on a hidden tab, but nothing implemented it: the canvas ran
 * `frameloop="always"` on every non-excluded route, forever, whether or not the
 * launcher was on screen or the tab was in front. It is a small canvas, but a
 * continuously rendering WebGL context is never free — and it shares a page
 * with a second, full-viewport one.
 */
export default function CraftBotScene({
  active = false,
  animate = true,
  onReady,
}: {
  active?: boolean;
  animate?: boolean;
  /**
   * Fires once the WebGL context exists, i.e. the moment Pixey can actually be
   * drawn. The launcher holds itself hidden until then so the bot and its
   * speech bubble arrive together — `next/dynamic` otherwise paints the rest of
   * the launcher while this chunk is still downloading, and the bubble shows up
   * on its own next to an empty square.
   */
  onReady?: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    const node = host.current;
    if (!node) return;

    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), {
      rootMargin: "120px",
    });
    io.observe(node);

    // A backgrounded tab should not be rendering either.
    const onVisibility = () => setOnScreen(!document.hidden && Boolean(node.offsetParent));
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div ref={host} className="h-full w-full">
    <Canvas
      frameloop={animate && onScreen ? "always" : "demand"}
      dpr={[1, 1.5]}
      // Pulled in from z=5.2: the launcher canvas is now square and as small as
      // 64px, where the old framing left Pixey swimming in empty space. y=0.2
      // centres the head-plus-grass-block mass rather than the head alone.
      camera={{ position: [0, 0.2, 4.7], fov: 34 }}
      // antialias off: this is a 64-88px canvas of hard-edged voxels, where MSAA
      // buys nothing visible and costs a multisampled buffer on a context that
      // renders continuously.
      gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
      onCreated={() => onReady?.()}
    >
      <ambientLight intensity={1.6} />
      <directionalLight position={[3, 5, 6]} intensity={2.1} />
      <pointLight position={[-3, 1, 3]} intensity={12} distance={12} color="#00ffd5" />
      <Bot active={active} />
    </Canvas>
    </div>
  );
}
