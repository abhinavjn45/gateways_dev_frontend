import * as THREE from "three";
import { SHARD_GEOMETRIES } from "./block-geometry";

/**
 * Shard and particle integration for a breaking block.
 *
 * Pure: no scene graph, no React, no three objects beyond Vector3/Euler as
 * plain maths containers. The caller owns the meshes and copies these values
 * onto them each frame. Keeping it separate is what makes the motion testable
 * without a WebGL context, in the spirit of `lib/voxel/image-to-voxel.test.ts`.
 *
 * NO PHYSICS LIBRARY. Twenty non-colliding cubes under constant gravity is
 * four lines of Euler integration; rapier or cannon would add ~300kB of wasm
 * to a decorative overlay to solve a problem that has a closed form.
 */

/** Blocks are one world unit; this is tuned to look like Minecraft, not Earth. */
export const GRAVITY = 9;
/** Per-second velocity retention, applied as pow(DRAG, dt) so it is framerate independent. */
export const DRAG = 0.86;
/**
 * Longest timestep we will integrate.
 *
 * A backgrounded tab or a long GC pause delivers one enormous `delta`. Without
 * this clamp a single 2-second frame launches every shard past the far plane
 * and the burst never appears. Clamping makes a stutter look like slow motion,
 * which nobody notices, instead of like a bug.
 */
export const MAX_STEP = 1 / 30;

export interface Shard {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Euler;
  spin: THREE.Vector3;
  size: number;
  variant: number;
  life: number;
  maxLife: number;
}

export interface Burst {
  positions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
  life: Float32Array;
  maxLife: Float32Array;
  count: number;
}

const SHARD_GRID = 3; // 3x3x3 minus a few = ~20

export function spawnShards(origin: THREE.Vector3, blockSize: number, rnd: () => number): Shard[] {
  const shards: Shard[] = [];
  const step = blockSize / SHARD_GRID;

  for (let x = 0; x < SHARD_GRID; x++) {
    for (let y = 0; y < SHARD_GRID; y++) {
      for (let z = 0; z < SHARD_GRID; z++) {
        // Drop the fully-enclosed centre cell and thin the count a little --
        // a solid 27 reads as a grid dissolving, not as a block shattering.
        if (x === 1 && y === 1 && z === 1) continue;
        if (rnd() < 0.22) continue;

        const local = new THREE.Vector3(
          (x - 1) * step,
          (y - 1) * step,
          (z - 1) * step,
        );
        // Radial from the centre, so the cloud opens outward.
        const dir = local.clone().normalize();
        if (dir.lengthSq() === 0) dir.set(0, 1, 0);
        const speed = 1.4 + rnd() * 1.8;

        const maxLife = 0.9 + rnd() * 0.4;
        shards.push({
          pos: origin.clone().add(local),
          vel: dir.multiplyScalar(speed).add(new THREE.Vector3(0, 1.8, 0)),
          rot: new THREE.Euler(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI),
          spin: new THREE.Vector3(
            (rnd() - 0.5) * 8,
            (rnd() - 0.5) * 8,
            (rnd() - 0.5) * 8,
          ),
          size: step * (0.8 + rnd() * 0.35),
          variant: Math.floor(rnd() * SHARD_GEOMETRIES.length),
          life: maxLife,
          maxLife,
        });
      }
    }
  }
  return shards;
}

/** Advance every shard. Returns true once they are all dead. */
export function stepShards(shards: Shard[], delta: number): boolean {
  const dt = Math.min(delta, MAX_STEP);
  const retain = Math.pow(DRAG, dt);
  let alive = false;

  for (const s of shards) {
    if (s.life <= 0) continue;
    alive = true;
    s.vel.y -= GRAVITY * dt;
    s.vel.multiplyScalar(retain);
    s.pos.addScaledVector(s.vel, dt);
    s.rot.x += s.spin.x * dt;
    s.rot.y += s.spin.y * dt;
    s.rot.z += s.spin.z * dt;
    s.life -= dt;
  }
  return !alive;
}

/**
 * Shrink factor for a shard, 1 -> 0 over the tail of its life.
 *
 * WHY SHRINK RATHER THAN FADE: fading needs `material.opacity`, which is a
 * per-material property. Every shard of a block shares ONE material, so two
 * simultaneous breaks would fight over the same opacity value; fixing that
 * needs a `material.clone()` per break and a matching `dispose()` to avoid a
 * leak. Shrinking is visually equivalent, keeps every shard in the opaque pass
 * (so there is no transparency sorting), and needs neither.
 */
export function shardScale(s: Shard): number {
  const tail = s.maxLife * 0.35;
  if (s.life >= tail) return 1;
  const t = Math.max(0, s.life / tail);
  return t * t * (3 - 2 * t); // smoothstep
}

const BURST_COUNT = 24;

export function spawnBurst(
  origin: THREE.Vector3,
  palette: readonly [string, string, string],
  rnd: () => number,
): Burst {
  const positions = new Float32Array(BURST_COUNT * 3);
  const velocities = new Float32Array(BURST_COUNT * 3);
  const colors = new Float32Array(BURST_COUNT * 3);
  const life = new Float32Array(BURST_COUNT);
  const maxLife = new Float32Array(BURST_COUNT);
  const c = new THREE.Color();

  for (let i = 0; i < BURST_COUNT; i++) {
    positions[i * 3] = origin.x + (rnd() - 0.5) * 0.4;
    positions[i * 3 + 1] = origin.y + (rnd() - 0.5) * 0.4;
    positions[i * 3 + 2] = origin.z + (rnd() - 0.5) * 0.4;

    const speed = 0.8 + rnd() * 1.6;
    const theta = rnd() * Math.PI * 2;
    const phi = Math.acos(2 * rnd() - 1);
    velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
    velocities[i * 3 + 1] = Math.abs(Math.cos(phi)) * speed + 0.9;
    velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;

    c.set(palette[Math.floor(rnd() * palette.length)]);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;

    maxLife[i] = 0.45 + rnd() * 0.3;
    life[i] = maxLife[i];
  }

  return { positions, velocities, colors, life, maxLife, count: BURST_COUNT };
}

/** Advance the burst in place. Returns true once every particle is dead. */
export function stepBurst(b: Burst, delta: number): boolean {
  const dt = Math.min(delta, MAX_STEP);
  const retain = Math.pow(DRAG, dt);
  let alive = false;

  for (let i = 0; i < b.count; i++) {
    if (b.life[i] <= 0) continue;
    alive = true;
    b.velocities[i * 3 + 1] -= GRAVITY * dt;
    for (let a = 0; a < 3; a++) {
      b.velocities[i * 3 + a] *= retain;
      b.positions[i * 3 + a] += b.velocities[i * 3 + a] * dt;
    }
    b.life[i] -= dt;
  }
  return !alive;
}

/** 1 -> 0 across the whole burst, for shrinking the point size. */
export function burstFade(b: Burst): number {
  let maxRemaining = 0;
  for (let i = 0; i < b.count; i++) {
    const t = b.maxLife[i] > 0 ? b.life[i] / b.maxLife[i] : 0;
    if (t > maxRemaining) maxRemaining = t;
  }
  return Math.max(0, maxRemaining);
}
