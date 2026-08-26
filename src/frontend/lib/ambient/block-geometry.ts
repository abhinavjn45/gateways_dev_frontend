import * as THREE from "three";

/**
 * Shared geometry for the ambient block layer.
 *
 * THE CENTRAL TRICK: Minecraft does not light its blocks. It multiplies each
 * face by a fixed constant — top 1.0, bottom 0.5, north/south 0.8, east/west
 * 0.6 — and that is the entire reason a Minecraft cube reads as a cube. We
 * bake those constants into a vertex-colour attribute and render with
 * `MeshBasicMaterial({ vertexColors: true })`.
 *
 * What that buys, all of it load-bearing:
 *  - The scene needs NO LIGHTS. Not a cheaper light rig; none at all.
 *  - The shading is correct while the block tumbles, because Minecraft shades
 *    by face identity, not by angle to a light. A `MeshLambertMaterial` with a
 *    directional light would visibly "roll" its shading as the cube span, which
 *    is the one thing that would give the effect away as not-Minecraft.
 *  - `material.color` stays FREE to carry the biome tint (greyscale
 *    `grass_block_top.png` needs it), because the face shading is no longer
 *    competing for that slot.
 *
 * Everything in this module is a module-scope singleton, created once and
 * never disposed. They intentionally outlive route changes: the GPU handles
 * die with the WebGL context and three re-uploads on demand, so disposal would
 * buy nothing and risk using a freed geometry after a remount.
 */

/** Minecraft's per-face brightness constants. */
export const FACE_SHADE = {
  top: 1.0,
  bottom: 0.5,
  northSouth: 0.8,
  eastWest: 0.6,
} as const;

/**
 * `BoxGeometry` emits faces in the order +X, -X, +Y, -Y, +Z, -Z, four vertices
 * each for a single-segment box. That order is also the material-array order,
 * and getting it wrong is the easiest way to put grass on the sides of a block.
 */
const FACE_ORDER = [
  FACE_SHADE.eastWest, // +X
  FACE_SHADE.eastWest, // -X
  FACE_SHADE.top, // +Y
  FACE_SHADE.bottom, // -Y
  FACE_SHADE.northSouth, // +Z
  FACE_SHADE.northSouth, // -Z
] as const;

function withFaceShading(geo: THREE.BoxGeometry): THREE.BoxGeometry {
  const count = geo.attributes.position.count; // 24 for a 1-segment box
  const colors = new Float32Array(count * 3);
  for (let v = 0; v < count; v++) {
    const shade = FACE_ORDER[Math.floor(v / 4)] ?? 1;
    colors[v * 3] = shade;
    colors[v * 3 + 1] = shade;
    colors[v * 3 + 2] = shade;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geo;
}

/** The one cube every floating block and every crack overlay renders. */
export const SHADED_BOX = withFaceShading(new THREE.BoxGeometry(1, 1, 1));

/**
 * Shard geometries — six unit cubes whose UVs are remapped to different 4x4
 * cells of the 16x16 texture space.
 *
 * This is how Minecraft's break particles actually look: each crumb shows a
 * different 4x4 patch of the block it came from, not the whole texture shrunk
 * down. Pre-baking six variants means twenty shards can share six geometries
 * and ONE material.
 *
 * REJECTED — `InstancedMesh`: it would collapse twenty draw calls into one,
 * but instancing cannot vary geometry, so all twenty shards would show the
 * identical crop. Varying the UV per instance needs an `InstancedBufferAttribute`
 * plus an `onBeforeCompile` shader patch. Twenty draw calls for ~1.1s is not
 * worth owning a patched shader.
 *
 * REJECTED — `texture.clone()` with a per-shard `offset`/`repeat`: a clone gets
 * a fresh uuid and therefore a fresh GPU upload. Twenty texture uploads per
 * break, for something already solved by six static geometries.
 */
const SHARD_CELLS: ReadonlyArray<[number, number]> = [
  [0, 0],
  [2, 1],
  [1, 3],
  [3, 2],
  [0, 2],
  [2, 3],
];

/** Texture is 16x16; a shard shows a 4x4 patch, so the grid is 4x4 cells. */
const SHARD_GRID = 4;

function croppedShard(cellX: number, cellY: number): THREE.BoxGeometry {
  const geo = withFaceShading(new THREE.BoxGeometry(1, 1, 1));
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const src = uv.array as Float32Array;
  const out = new Float32Array(src.length);
  for (let i = 0; i < src.length; i += 2) {
    out[i] = (cellX + src[i]) / SHARD_GRID;
    out[i + 1] = (cellY + src[i + 1]) / SHARD_GRID;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(out, 2));
  return geo;
}

export const SHARD_GEOMETRIES: readonly THREE.BoxGeometry[] = SHARD_CELLS.map(([x, y]) =>
  croppedShard(x, y),
);

/** Wireframe box used for the hover affordance, matching Minecraft's block outline. */
export const OUTLINE_GEOMETRY = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));

/**
 * Stand-in for the crack overlay when no destroy-stage textures exist. A
 * single shared invisible material costs nothing and keeps the overlay mesh's
 * `material` prop unconditional, which avoids swapping node types on re-render.
 */
export const INVISIBLE_MATERIAL = new THREE.MeshBasicMaterial({ visible: false });
