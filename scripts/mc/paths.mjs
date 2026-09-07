/** Shared locations for the mc:* scripts. Everything is relative to the repo root. */
import fs from 'node:fs'
import path from 'node:path'

export const ROOT = path.resolve(import.meta.dirname, '../..')
export const CONFIG_PATH = path.join(ROOT, 'src/frontend/lib/minecraft/config.json')
export const OUT = path.join(ROOT, 'public/prismarine')
export const CACHE = path.join(ROOT, '.cache/mc')
export const ANCHORS = path.join(CACHE, 'world-anchors.json')

export const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
/** The world runs 1.17.1 — see the note in scripts/mc/build-engine.mjs. Never
 *  fall back to a newer version here: the mesher renders nothing on 1.18+. */
export const VERSION = config.world?.version || '1.17.1'
