/**
 * Multiplayer is deliberately switched off in this build.
 *
 * The reference implementation (PartyKit room + partysocket client: presence,
 * blocky peer avatars with name tags, chat on T) lives in
 * ~/Desktop/minecraft_website/{party/index.ts, engine/net/multiplayer.js}.
 * To turn it on: add `partykit` + `partysocket`, port those two files minus
 * the block-edit messages, and set `window.__MC_MP_HOST` before the engine
 * script loads. The engine already calls `update()`/`dispose()` on this
 * object every frame, so the stub keeps that contract.
 */
export function createMultiplayer () {
  return {
    enabled: false,
    update () {},
    dispose () {}
  }
}
