import * as THREE from "three";
import { FACE_SHADE } from "@/frontend/lib/ambient/block-geometry";

/**
 * The shared parts every hanging sign is built from.
 *
 * Module-scope singletons, created once and never disposed — the same doctrine
 * `lib/ambient/block-geometry.ts` sets out and for the same reason: the GPU
 * handles die with the WebGL context, so disposing would buy nothing and would
 * risk drawing with a freed geometry after a remount.
 *
 * Twenty signs share every object in this file. The only per-sign resources are
 * the two text materials, which have to differ because their maps do.
 */

/**
 * The quad the text sits on, one unit square, facing +Z.
 *
 * A separate plate rather than mapping the text onto the box it covers. Two
 * reasons, and the second is the real one:
 *
 *  - A box face stretches its map across the whole face, so a single map on the
 *    board would smear the answer down its sides and edges.
 *  - A multi-material box costs one draw call PER FACE — six, to show one. A
 *    plain box plus a plate is two, and the plate is 2 triangles.
 */
export const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);

/**
 * Front faces in Minecraft's shading are multiplied by 0.8, and the boxes get
 * that from their baked vertex colours. The text plates have no such attribute,
 * so they carry it as a flat material colour instead — without this a plate
 * reads as a lit panel glued to an unlit board.
 */
export const PLATE_SHADE = new THREE.Color().setScalar(FACE_SHADE.northSouth);

/** The beam: darker, closer to a stripped oak log than to planks. */
export const BEAM_MAT = new THREE.MeshBasicMaterial({
  color: "#8a6b3d",
  vertexColors: true,
});

/** The board's body. Only its edges show; the plate covers its face. */
export const BOARD_MAT = new THREE.MeshBasicMaterial({
  color: "#b18c4c",
  vertexColors: true,
});

/** Iron, for the beam straps and the chain links. */
export const IRON_MAT = new THREE.MeshBasicMaterial({
  color: "#4a5262",
  vertexColors: true,
});
