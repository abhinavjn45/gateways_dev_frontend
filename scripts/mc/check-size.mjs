/** Fails the build if any served engine asset exceeds the 4 MiB single-asset
 *  target, and reports what a first-time 3D visitor actually downloads.
 *  Runs as `prebuild`, so a missing asset also fails the build early rather
 *  than shipping a /world that cannot boot. */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { OUT as DIR, VERSION } from './paths.mjs'

const LIMIT = 4 * 1024 * 1024

const transferred = f => {
  const p = path.join(DIR, f)
  if (!fs.existsSync(p)) return null
  const buf = fs.readFileSync(p)
  // .gz assets ship as-is; everything else is gzipped by the host/CDN
  return f.endsWith('.gz') ? buf.length : zlib.gzipSync(buf, { level: 9 }).length
}

const PAYLOAD = [
  'game.js',
  'worker.js.gz',
  `textures/${VERSION}.png`,
  `blocksStates/${VERSION}.json.gz`,
  'world.schem',
  'world.meta.json'
]

let total = 0
let failed = 0
console.log('first-time 3D payload (transfer size):')
for (const f of PAYLOAD) {
  const n = transferred(f)
  if (n === null) { console.log(`  ${f.padEnd(30)} MISSING`); failed++; continue }
  total += n
  const over = n > LIMIT
  if (over) failed++
  console.log(`  ${f.padEnd(30)} ${(n / 1048576).toFixed(2)} MB${over ? '   OVER 4 MiB LIMIT' : ''}`)
}
console.log(`  ${'TOTAL'.padEnd(30)} ${(total / 1048576).toFixed(2)} MB`)

if (failed) {
  console.error(`\n${failed} asset problem(s). Run \`npm run mc:assets\` (after \`npm run mc:textures\` once).`)
  process.exit(1)
}
console.log('\nAll assets within the 4 MiB single-asset budget.')
