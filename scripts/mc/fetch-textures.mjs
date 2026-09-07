/**
 * Downloads the VoxeLibre texture set into .cache/voxelibre/textures.
 *
 * VoxeLibre's art is CC BY-SA 4.0 (based on XSSheep's Pixel Perfection pack).
 * We use it instead of Mojang's textures so the site ships nothing proprietary.
 * See public/prismarine/CREDITS.txt for the attribution this obliges us to carry.
 *
 *   npm run mc:textures
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { ROOT } from './paths.mjs'

const OUT = path.join(ROOT, '.cache/voxelibre/textures')
const TARBALL = 'https://codeload.github.com/VoxeLibre/VoxeLibre/tar.gz/refs/heads/master'

if (fs.existsSync(OUT) && fs.readdirSync(OUT).length > 100 && !process.argv.includes('-f')) {
  console.log(`textures already present at ${OUT} (pass -f to refetch)`)
  process.exit(0)
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'voxelibre-'))
const tar = path.join(tmp, 'vl.tar.gz')

console.log('downloading VoxeLibre (~77 MB)...')
execFileSync('curl', ['-sL', '--max-time', '600', '-o', tar, TARBALL], { stdio: 'inherit' })

console.log('extracting textures...')
const stage = path.join(tmp, 'x')
fs.mkdirSync(stage, { recursive: true })
// only the top-level textures/ directory; that is where the block art lives.
// GNU tar needs --wildcards for the glob; bsdtar (macOS) rejects that flag
// and globs by default, so try the GNU form first and fall back.
try {
  execFileSync('tar', ['-xzf', tar, '-C', stage, '--strip-components=2', '--wildcards', '*/textures/*.png'], { stdio: 'pipe' })
} catch {
  execFileSync('tar', ['-xzf', tar, '-C', stage, '--strip-components=2', '*/textures/*.png'], { stdio: 'inherit' })
}

fs.mkdirSync(OUT, { recursive: true })
let n = 0
for (const f of fs.readdirSync(stage)) {
  if (!f.endsWith('.png')) continue
  fs.copyFileSync(path.join(stage, f), path.join(OUT, f))
  n++
}
fs.rmSync(tmp, { recursive: true, force: true })
console.log(`${n} textures -> ${OUT}`)
