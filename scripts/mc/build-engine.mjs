/**
 * Bundles the standalone voxel engine and its mesher worker.
 *
 *   public/prismarine/game.js            window.McGateways  (injected on demand)
 *   public/prismarine/game.js.gz         the same, pre-compressed for a CDN
 *   public/prismarine/worker.js.gz       prismarine-viewer's chunk mesher
 *   public/prismarine/worker.parts.json  integrity manifest
 *   public/prismarine/version.json       cache-busting stamp (content hash)
 *
 * Why 1.17.1: prismarine-viewer's mesher indexes chunk sections as
 * `sections[y / 16]`, which assumes the world starts at y = 0. From 1.18 the
 * floor is y = -64 and that indexing silently produces zero geometry. 1.17.1
 * is the newest version where it is correct.
 *
 *   npm run mc:engine
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import * as esbuild from 'esbuild'
import { ROOT, OUT, VERSION } from './paths.mjs'

const require = createRequire(import.meta.url)

// prismarine-viewer's model code hardcodes 1.16.2 for tint tables
const KEEP_VERSIONS = [VERSION, '1.16.2']

fs.mkdirSync(OUT, { recursive: true })

// ---------------------------------------------------------------------------
// minecraft-data ships a data.js with ~2477 static require() calls covering
// every Minecraft version — about 429 MB. Bundling that verbatim is what makes
// naive builds enormous, so we regenerate it with only the versions we need.
// ---------------------------------------------------------------------------
const trimMinecraftData = {
  name: 'trim-minecraft-data',
  setup (build) {
    const dataJs = require.resolve('minecraft-data/data.js')
    const mdRoot = path.dirname(dataJs)
    const dataPaths = require('minecraft-data/minecraft-data/data/dataPaths.json')

    build.onLoad({ filter: /minecraft-data[/\\]data\.js$/ }, () => {
      const emit = (type, version) => {
        const entry = dataPaths[type]?.[version]
        if (!entry) return null
        const getters = Object.entries(entry).map(([key, dir]) => {
          const file = path.join(mdRoot, 'minecraft-data/data', dir, `${key}.json`)
          if (!fs.existsSync(file)) return null
          return `    get ${JSON.stringify(key)} () { return require(${JSON.stringify('./minecraft-data/data/' + dir + '/' + key + '.json')}) }`
        }).filter(Boolean)
        return `  ${JSON.stringify(version)}: {\n${getters.join(',\n')}\n  }`
      }

      const pc = KEEP_VERSIONS.map(v => emit('pc', v)).filter(Boolean)
      const contents = `module.exports = {\n  pc: {\n${pc.join(',\n')}\n  },\n  bedrock: {}\n}\n`
      return { contents, loader: 'js', resolveDir: mdRoot }
    })
  }
}

// ---------------------------------------------------------------------------
// The prismarine stack is written for Node, so map the builtins it reaches for
// onto browser-safe implementations.
// ---------------------------------------------------------------------------
const NODE_POLYFILLS = {
  zlib: 'browserify-zlib',
  assert: 'assert',
  util: 'util',
  stream: 'stream-browserify',
  path: 'path-browserify',
  crypto: 'crypto-browserify',
  os: 'os-browserify/browser',
  buffer: 'buffer',
  events: 'events',
  process: 'process/browser',
  _stream_duplex: 'readable-stream/lib/_stream_duplex',
  _stream_passthrough: 'readable-stream/lib/_stream_passthrough',
  _stream_readable: 'readable-stream/lib/_stream_readable',
  _stream_transform: 'readable-stream/lib/_stream_transform',
  _stream_writable: 'readable-stream/lib/_stream_writable'
}

// Nothing in the browser build should touch these; stub them so a stray
// require does not drag in a Node-only code path.
const EMPTY_MODULES = ['fs', 'net', 'tls', 'child_process', 'worker_threads', 'perf_hooks', 'dns', 'http', 'https']

// require.resolve('assert') returns the Node builtin, not the npm shim, so we
// resolve through the package's own package.json to get a real file path.
function resolveShim (spec) {
  if (spec.includes('/')) return require.resolve(spec)
  const pkgPath = require.resolve(`${spec}/package.json`)
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  const dir = path.dirname(pkgPath)
  const entry = (typeof pkg.browser === 'string' ? pkg.browser : null) || pkg.main || 'index.js'
  return path.join(dir, entry)
}

const shimCache = new Map()
const nodeCompat = {
  name: 'node-compat',
  setup (build) {
    const names = [...Object.keys(NODE_POLYFILLS), ...EMPTY_MODULES]
    const filter = new RegExp(`^(node:)?(${names.join('|')})$`)
    build.onResolve({ filter }, args => {
      const name = args.path.replace(/^node:/, '')
      if (EMPTY_MODULES.includes(name)) return { path: name, namespace: 'empty-module' }
      if (!shimCache.has(name)) shimCache.set(name, resolveShim(NODE_POLYFILLS[name]))
      return { path: shimCache.get(name) }
    })

    // node-canvas: only reached for entity nametags, where the DOM canvas works
    build.onResolve({ filter: /^canvas$/ }, () => ({
      path: path.join(ROOT, 'scripts/mc/shim-canvas.js')
    }))

    // prismarine-viewer nests its own copy of three; two instances in one
    // bundle break instanceof checks and warn at runtime, so collapse them.
    const three = require.resolve('three')
    build.onResolve({ filter: /^three$/ }, () => ({ path: three }))

    // Upstream's webpack build rewrites `require('./utils')` inside the viewer
    // to the browser implementation. Do the same.
    build.onResolve({ filter: /^\.\/utils$/ }, args => {
      if (!args.importer.includes('prismarine-viewer')) return null
      return { path: path.join(path.dirname(args.importer), 'utils.web.js') }
    })
    build.onLoad({ filter: /.*/, namespace: 'empty-module' }, () => ({
      contents: 'module.exports = {}', loader: 'js'
    }))
  }
}

const shared = {
  bundle: true,
  format: 'iife',
  target: ['es2020', 'chrome90', 'safari15', 'firefox90'],
  minify: true,
  legalComments: 'none',
  logLevel: 'warning',
  plugins: [nodeCompat, trimMinecraftData],
  define: {
    'process.env.NODE_ENV': '"production"',
    // prismarine-viewer does `let src = __dirname` before checking for a
    // browser, which throws unless __dirname exists at runtime.
    __dirname: '""',
    __filename: '""'
  },
  // several prismarine packages assume a Node-ish global environment
  inject: [path.join(ROOT, 'scripts/mc/shim-node.js')],
  loader: { '.png': 'dataurl' }
}

// -------------------------------------------------------------------- worker
const workerEntry = require.resolve('prismarine-viewer/viewer/lib/worker.js')
const workerBuild = await esbuild.build({
  ...shared,
  entryPoints: [workerEntry],
  outfile: path.join(OUT, 'worker.js'),
  write: false
})
const workerCode = workerBuild.outputFiles[0].contents
const workerGz = zlib.gzipSync(Buffer.from(workerCode), { level: 9 })
fs.writeFileSync(path.join(OUT, 'worker.js.gz'), workerGz)
fs.rmSync(path.join(OUT, 'worker.js'), { force: true })

const sha = b => crypto.createHash('sha256').update(b).digest('hex')
fs.writeFileSync(path.join(OUT, 'worker.parts.json'), JSON.stringify({
  version: 2,
  source: 'worker.js',
  sourceBytes: workerCode.length,
  sourceSha256: sha(Buffer.from(workerCode)),
  compression: 'gzip',
  asset: { path: 'worker.js.gz', bytes: workerGz.length, sha256: sha(workerGz) }
}, null, 2) + '\n')

// --------------------------------------------------------------------- game
const gameBuild = await esbuild.build({
  ...shared,
  entryPoints: [path.join(ROOT, 'engine/index.js')],
  outfile: path.join(OUT, 'game.js'),
  write: false
})
const gameCode = Buffer.from(gameBuild.outputFiles[0].contents)
fs.writeFileSync(path.join(OUT, 'game.js'), gameCode)
fs.writeFileSync(path.join(OUT, 'game.js.gz'), zlib.gzipSync(gameCode, { level: 9 }))

// ------------------------------------------------------------------ version
// A pure content hash, so rebuilding unchanged sources leaves git clean; the
// hash covers every asset the engine fetches, since any of them changing must
// bust the immutable cache on all of them.
const hashed = ['world.schem', 'world.meta.json', `textures/${VERSION}.png`, `blocksStates/${VERSION}.json.gz`]
  .map(f => path.join(OUT, f))
  .filter(f => fs.existsSync(f))
  .map(f => fs.readFileSync(f))
const stamp = sha(Buffer.concat([gameCode, workerGz, ...hashed])).slice(0, 12)
fs.writeFileSync(path.join(OUT, 'version.json'), JSON.stringify({ v: stamp }, null, 2) + '\n')

const mb = n => (n / 1048576).toFixed(2) + ' MB'
console.log(`worker.js     ${mb(workerCode.length)} raw -> worker.js.gz ${mb(workerGz.length)}`)
console.log(`game.js       ${mb(gameCode.length)} raw -> game.js.gz ${mb(zlib.gzipSync(gameCode).length)}`)
console.log(`version       ${stamp}`)
