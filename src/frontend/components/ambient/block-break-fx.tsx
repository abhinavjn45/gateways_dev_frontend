"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { seededRandom } from "@/frontend/lib/assets/placeholder";
import { SHARD_GEOMETRIES } from "@/frontend/lib/ambient/block-geometry";
import {
  burstFade,
  shardScale,
  spawnBurst,
  spawnShards,
  stepBurst,
  stepShards,
  type Burst,
  type Shard,
} from "@/frontend/lib/ambient/break-physics";
import type { AmbientBlockDef } from "@/frontend/lib/ambient/block-textures";

/**
 * One block coming apart: ~20 tumbling textured shards and a pixel burst.
 *
 * Everything moves in `useFrame` by mutating objects held in state or reached
 * through refs. There is deliberately NO per-frame `setState` -- this component
 * renders once, and the parent's only state change is adding it to a list and
 * removing it again.
 *
 * The simulation arrays come from a LAZY STATE INITIALISER rather than
 * `useMemo`. `useMemo` results are values the React compiler is entitled to
 * treat as immutable and to recompute, and we mutate these every frame; a lazy
 * initialiser is the supported way to say "build this once, then it is mine".
 *
 * The burst is `THREE.Points` with `sizeAttenuation: false` and no map, which
 * makes `gl_PointSize` render hard unfiltered squares measured in device
 * pixels. That is the pixel-particle look for one draw call and no shader.
 * Both the geometry and the material are declared in JSX so R3F owns their
 * lifecycle and disposes them on unmount -- we only reach in to mutate.
 */

export interface BreakSpec {
  id: number;
  origin: THREE.Vector3;
  size: number;
  def: AmbientBlockDef;
  material: THREE.Material;
}

/** Device pixels per burst particle at full life. */
const BURST_PX = 3;

interface Sim {
  shards: Shard[];
  burst: Burst;
}

export function BlockBreakFx({ spec, onDone }: { spec: BreakSpec; onDone: (id: number) => void }) {
  const meshRefs = useRef<Array<THREE.Mesh | null>>([]);
  const positionAttr = useRef<THREE.BufferAttribute>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const doneRef = useRef(false);

  // Seeded on the break id, so a given break is deterministic even if React
  // double-invokes the initialiser in development, while different breaks differ.
  const [sim] = useState<Sim>(() => {
    const rnd = seededRandom(`ambient:break:${spec.id}`);
    return {
      shards: spawnShards(spec.origin, spec.size, rnd),
      burst: spawnBurst(spec.origin, spec.def.particle, rnd),
    };
  });

  useFrame((_, delta) => {
    if (doneRef.current) return;

    const shardsDead = stepShards(sim.shards, delta);
    for (let i = 0; i < sim.shards.length; i++) {
      const mesh = meshRefs.current[i];
      const s = sim.shards[i];
      if (!mesh) continue;
      if (s.life <= 0) {
        mesh.visible = false;
        continue;
      }
      mesh.position.copy(s.pos);
      mesh.rotation.copy(s.rot);
      mesh.scale.setScalar(s.size * shardScale(s));
    }

    const burstDead = stepBurst(sim.burst, delta);
    if (positionAttr.current) positionAttr.current.needsUpdate = true;
    if (materialRef.current) materialRef.current.size = BURST_PX * burstFade(sim.burst);

    if (shardsDead && burstDead) {
      // Guarded so it fires exactly once even if another frame slips through.
      doneRef.current = true;
      onDone(spec.id);
    }
  });

  return (
    <group>
      {sim.shards.map((s, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshRefs.current[i] = el;
          }}
          geometry={SHARD_GEOMETRIES[s.variant]}
          material={spec.material}
          position={s.pos}
          rotation={s.rot}
          scale={s.size}
          renderOrder={3}
        />
      ))}

      <points renderOrder={4}>
        <bufferGeometry>
          <bufferAttribute
            ref={positionAttr}
            attach="attributes-position"
            args={[sim.burst.positions, 3]}
          />
          <bufferAttribute attach="attributes-color" args={[sim.burst.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={materialRef}
          size={BURST_PX}
          sizeAttenuation={false}
          vertexColors
          transparent
          depthWrite={false}
        />
      </points>
    </group>
  );
}
