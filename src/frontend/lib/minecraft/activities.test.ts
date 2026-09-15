import test from 'node:test';
import assert from 'node:assert/strict';
import { createBuilding, traceVoxel, blockKey, inside, overlapsPlayer } from '../../../../engine/activities/building.js';
import { createPlayer, attachInput } from '../../../../engine/player/controller.js';
import { createHunt } from '../../../../engine/activities/hunt.js';
import { createPersistence } from '../../../../engine/activities/persistence.js';
import { createWorldEditor, createSchematicWorld } from '../../../../engine/world/schematicWorld.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const bounds = { min: { x: 0, y: 1, z: 0 }, max: { x: 31, y: 24, z: 31 } };
const p = { x: 15, y: 1, z: 15 };
const outside = { x: -5, y: 1, z: -5 };
const crystals = Array.from({ length: 10 }, (_, i) => ({ id: String(i), x: i * 3, y: 1, z: 0 }));

test('hunt pauses, collects once, finishes, persists a faster record and resets for replay', () => {
  const finishes: unknown[] = [];
  const hunt = createHunt({ crystals, best: 15000, onFinish: (r: unknown) => finishes.push(r) });
  hunt.start(); hunt.update(10000, crystals[0], true);
  assert.equal(hunt.elapsed, 0); assert.equal(hunt.collected.size, 0);
  hunt.update(1000, crystals[0], false); hunt.update(1000, crystals[0], false);
  assert.equal(hunt.collected.size, 1);
  for (const c of crystals.slice(1)) hunt.update(1000, c, false);
  assert.equal(hunt.state, 'won'); assert.equal(hunt.best, 11000); assert.equal(finishes.length, 1);
  hunt.update(1000, crystals[9], false); assert.equal(finishes.length, 1);
  hunt.start(); assert.equal(hunt.collected.size, 0); assert.equal(hunt.elapsed, 0);
  hunt.update(180000, outside, false); assert.equal(hunt.state, 'lost'); assert.equal(hunt.best, 11000);
  hunt.cancel(); assert.equal(hunt.state, 'idle');
});

test('voxel raycast returns correct adjacent face, stops at occluders and enforces reach', () => {
  const origin = { x: 0.5, y: 1.5, z: 0.5 };
  const hit = traceVoxel(origin, { x: 1, y: 0, z: 0 }, (v: typeof p) => v.x === 3 ? 1 : 0);
  assert.deepEqual(hit?.block, { x: 3, y: 1, z: 0 });
  assert.deepEqual(hit?.adjacent, { x: 2, y: 1, z: 0 });
  assert.equal(traceVoxel(origin, { x: 1, y: 0, z: 0 }, (v: typeof p) => v.x === 7 ? 1 : 0), null);
  const down = traceVoxel(origin, { x: 0, y: -1, z: 0 }, (v: typeof p) => v.y === 0 ? 1 : 0);
  assert.deepEqual(down?.adjacent, { x: 0, y: 1, z: 0 });
  assert.equal(traceVoxel(origin, { x: 0, y: 0, z: 0 }, () => 0), null);
});

test('building protects campus and player; undo, redo, clear and history limits work', () => {
  const blocks = new Map<string, string>(); let player = outside;
  const build = createBuilding({ bounds, getBlock: (v: typeof p) => blocks.get(blockKey(v)),
    setBlock: (v: typeof p, name: string | null) => { if (name) blocks.set(blockKey(v), name); else blocks.delete(blockKey(v)); }, getPlayer: () => player });
  assert.equal(build.edit({ ...p, y: 0 }, 'stone'), false);
  assert.equal(build.edit({ ...p, y: 25 }, 'stone'), false);
  assert.equal(build.edit(p, 'lava'), false);
  player = { x: 15.5, y: 1, z: 15.5 }; assert.equal(build.edit(p, 'stone'), false);
  player = outside; assert.equal(build.edit(p, 'stone'), true); assert.equal(build.edit(p, 'bricks'), false);
  assert.equal(build.history(), true); assert.equal(blocks.size, 0);
  player = { x: 15.5, y: 1, z: 15.5 }; assert.equal(build.history(true), false);
  player = outside; assert.equal(build.history(true), true);
  build.clear(); assert.equal(blocks.size, 0); build.history(); assert.equal(blocks.size, 1);
  for (let i = 0; i < 110; i++) build.edit({ x: i % 31, y: 5 + Math.floor(i / 31), z: 0 }, 'glass');
  let undone = 0; while (build.history()) undone++; assert.equal(undone, 100);
  assert.equal(inside({ x: 31, y: 24, z: 31 }, bounds), true);
  assert.equal(overlapsPlayer(p, { x: 16.3, y: 1, z: 15.5 }), false);
});

test('saves round trip relative coordinates; invalid saves remain untouched and failures are reported', () => {
  const shifted = { min: { x: 100, y: 9, z: 10 }, max: { x: 131, y: 32, z: 41 } };
  let raw: string | null = null, status = '';
  const storage = () => ({ getItem: () => raw, setItem: (_: string, value: string) => { raw = value; } });
  const store = createPersistence({ storage, bounds: shifted, onStatus: (s: string) => { status = s; } });
  store.load(); store.save([{ x: 101, y: 10, z: 11, name: 'glass' }], 5000); store.flush();
  assert.match(status, /^Saved/); assert.equal(JSON.parse(raw!).blocks[0].x, 1);
  assert.deepEqual(store.load(), { blocks: [{ x: 101, y: 10, z: 11, name: 'glass' }], best: 5000 });
  raw = '{broken'; const invalid = createPersistence({ storage, bounds: shifted, onStatus: (s: string) => { status = s; } });
  invalid.load(); invalid.save([], null); invalid.flush(); assert.equal(raw, '{broken'); assert.match(status, /original retained/);
  const failure = createPersistence({ storage: () => ({ getItem: () => null, setItem: () => { throw new Error('quota'); } }), bounds,
    onStatus: (s: string) => { status = s; } });
  failure.load(); failure.save([], null); failure.dispose(); assert.match(status, /^Not saved/);
});

test('world edits update physics columns and emit mesher changes across chunk boundaries', async () => {
  const World = require('prismarine-world')('1.17.1');
  const Chunk = require('prismarine-chunk')('1.17.1');
  const { Vec3 } = require('vec3');
  const mcData = require('minecraft-data')('1.17.1');
  const world = createSchematicWorld({ schematic: { size: new Vec3(32, 26, 32), getBlockStateId: () => 0 }, World, Chunk });
  const notifications: unknown[] = [];
  const edit = await createWorldEditor({ world, bounds, states: { stone: mcData.blocksByName.stone.defaultState }, notify: (pos: typeof p, stateId: number) => notifications.push({ pos, stateId }) });
  for (const x of [15, 16]) {
    edit({ x, y: 16, z: 15 }, 'stone');
    assert.equal(world.sync.getBlock(new Vec3(x, 16, 15)).name, 'stone');
  }
  assert.equal(notifications.length, 2);
  assert.throws(() => edit({ x: 32, y: 16, z: 15 }, 'stone'), /Protected/);
  edit({ x: 15, y: 16, z: 15 }, null); assert.equal(world.sync.getBlock(new Vec3(15, 16, 15)).name, 'air');
});

test('invalid persisted coordinates, materials and versions cannot enter the world', () => {
  const valid = { version: 1, plot: 'campus-east-32x32x24', best: null, blocks: [{ x: 0, y: 0, z: 0, name: 'stone' }] };
  const variants = [
    { ...valid, version: 2 }, { ...valid, best: -1 }, { ...valid, blocks: [{ ...valid.blocks[0], x: 32 }] },
    { ...valid, blocks: [{ ...valid.blocks[0], y: 0.5 }] }, { ...valid, blocks: [{ ...valid.blocks[0], name: 'lava' }] },
    { ...valid, blocks: [valid.blocks[0], valid.blocks[0]] }
  ];
  for (const value of variants) {
    let writes = 0;
    const store = createPersistence({ bounds, storage: () => ({ getItem: () => JSON.stringify(value), setItem: () => { writes++; } }) });
    assert.deepEqual(store.load().blocks, []); store.save([], null); store.dispose(); assert.equal(writes, 0);
  }
});


test('creative flight respects solid blocks and plot limits and can return to walking', async () => {
  const World = require('prismarine-world')('1.17.1'), Chunk = require('prismarine-chunk')('1.17.1');
  const Block = require('prismarine-block')('1.17.1'), mcData = require('minecraft-data')('1.17.1');
  const { Physics, PlayerState } = require('prismarine-physics'), { Vec3 } = require('vec3');
  const world = createSchematicWorld({ schematic: { size: new Vec3(32, 32, 32), getBlockStateId: () => 0 }, World, Chunk });
  const edit = await createWorldEditor({ world, bounds, states: { stone: mcData.blocksByName.stone.defaultState } });
  edit({ x: 4, y: 1, z: 2 }, 'stone'); edit({ x: 4, y: 2, z: 2 }, 'stone');
  const player = createPlayer({ world, mcData, Block, Physics, PlayerState, version: '1.17.1', spawn: { x: 3.5, y: 1, z: 2.5, yaw: -Math.PI / 2 } });
  player.setFlight(bounds); player.control.forward = true; player.tick(); assert.equal(player.position.x, 3.5);
  player.control.forward = false; player.control.jump = true;
  for (let i = 0; i < 200; i++) player.tick();
  assert.equal(player.position.y, bounds.max.y + 2);
  player.control.jump = false; player.control.forward = true;
  for (let i = 0; i < 200; i++) player.tick();
  assert.equal(player.position.x, bounds.max.x + 0.7);
  player.setFlight(null); assert.equal(player.flying, false);
});


test('desktop capture click never edits; captured clicks and modal gating route correctly', (t) => {
  const fakeWindow = new EventTarget();
  const fakeDocument = Object.assign(new EventTarget(), {
    activeElement: null, pointerLockElement: null as EventTarget | null,
    createElement: () => ({ className: '', innerHTML: '', style: {}, firstElementChild: { style: {} }, classList: { remove: () => {}, add: () => {} }, remove: () => {} })
  });
  const originals = ['window', 'document', 'matchMedia'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: fakeDocument });
  Object.defineProperty(globalThis, 'matchMedia', { configurable: true, value: () => ({ matches: false }) });
  t.after(() => { for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); } });
  const canvas = Object.assign(new EventTarget(), { requestPointerLock: () => { fakeDocument.pointerLockElement = canvas; } });
  const container = Object.assign(new EventTarget(), { appendChild: () => {} });
  const player = { control: { forward: false }, look: () => {} }; let allowed = true, edits = 0;
  const input = attachInput({ player, canvas, container, onInteract: () => {}, onKey: () => false,
    onAction: () => { edits++; return true; }, onScroll: () => true, canAct: () => allowed });
  t.after(() => input.dispose());
  const mouse = () => canvas.dispatchEvent(Object.assign(new Event('mousedown', { cancelable: true }), { button: 0 }));
  mouse(); canvas.dispatchEvent(new Event('click')); assert.equal(edits, 0);
  mouse(); assert.equal(edits, 1);
  fakeWindow.dispatchEvent(Object.assign(new Event('keydown'), { code: 'KeyW' })); assert.equal(player.control.forward, true);
  input.setEnabled(false); assert.equal(player.control.forward, false); mouse(); assert.equal(edits, 1);
  input.setEnabled(true); allowed = false; mouse(); assert.equal(edits, 1);
  input.dispose(); allowed = true; mouse(); assert.equal(edits, 1);
});
