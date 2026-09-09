/**
 * Builds the block texture atlas and the matching blocksStates file.
 *
 * The ART comes from VoxeLibre (CC BY-SA 4.0) — never from Mojang. The block
 * GEOMETRY (which model, which face, which UV) comes from the model JSON that
 * ships inside prismarine-viewer, and is fed through prismarine-viewer's own
 * prepareBlocksStates so the output is exactly what its mesher expects.
 *
 *   npm run mc:atlas
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { createRequire } from 'node:module'
import { ROOT, OUT, CACHE, VERSION } from './paths.mjs'

const require = createRequire(import.meta.url)
const sharp = require('sharp')
const { prepareBlocksStates } = require('prismarine-viewer/viewer/lib/modelsBuilder')

const PV = path.join(ROOT, 'node_modules/prismarine-viewer')
const ASSETS = path.join(PV, 'public/textures', VERSION)
const BLOCKS_DIR = path.join(ASSETS, 'blocks')
const MISSING = path.join(PV, 'viewer/lib/missing_texture.png')

// Where the VoxeLibre checkout lives. Override with VOXELIBRE_DIR.
const VL_DIR = process.env.VOXELIBRE_DIR ||
  path.join(ROOT, '.cache/voxelibre/textures')

if (!fs.existsSync(BLOCKS_DIR)) {
  console.error(`Missing ${BLOCKS_DIR} — reinstall prismarine-viewer.`)
  process.exit(1)
}
const haveVL = fs.existsSync(VL_DIR)
if (!haveVL) {
  console.warn(`\n  VoxeLibre textures not found at ${VL_DIR}`)
  console.warn('  Every tile will be generated procedurally instead.')
  console.warn('  Run `npm run mc:textures` to download them.\n')
}

const TILE = 16

// --------------------------------------------------------------- name mapping
// VoxeLibre treats oak as the unqualified default and often reverses word
// order, so the automatic matcher needs help for the common blocks. The campus
// palette (build-world.mjs) is covered explicitly at the bottom of the list.
const OVERRIDES = {
  oak_planks: 'default_wood',
  oak_log: 'default_tree',
  oak_log_top: 'default_tree_top',
  oak_leaves: 'default_leaves',
  oak_sapling: 'default_sapling',
  oak_door_top: 'doors_door_wood_upper',
  oak_door_bottom: 'doors_door_wood_lower',
  oak_trapdoor: 'doors_trapdoor',
  birch_log: 'mcl_core_birchtree',
  birch_log_top: 'mcl_core_birchtree_top',
  birch_leaves: 'mcl_core_leaves_birch',
  birch_planks: 'mcl_core_planks_birch',
  spruce_log: 'mcl_core_sprucetree',
  spruce_log_top: 'mcl_core_sprucetree_top',
  spruce_planks: 'mcl_core_planks_spruce',
  spruce_leaves: 'mcl_core_leaves_spruce',
  dark_oak_planks: 'mcl_core_planks_big_oak',
  dark_oak_leaves: 'mcl_core_leaves_big_oak',
  jungle_leaves: 'default_jungleleaves',
  acacia_leaves: 'default_acacia_leaves',
  acacia_log: 'default_acacia_tree',
  acacia_log_top: 'default_acacia_tree_top',
  acacia_planks: 'default_acacia_wood',

  cobblestone: 'default_cobble',
  mossy_cobblestone: 'default_mossycobble',
  stone_bricks: 'default_stone_brick',
  chiseled_stone_bricks: 'mcl_core_stonebrick_carved',
  cracked_stone_bricks: 'mcl_core_stonebrick_cracked',
  mossy_stone_bricks: 'mcl_core_stonebrick_mossy',
  smooth_stone: 'mcl_stairs_stone_slab_top',
  smooth_stone_slab_side: 'mcl_stairs_stone_slab_side',
  polished_andesite: 'mcl_core_andesite_smooth',
  andesite: 'mcl_core_andesite',
  polished_diorite: 'mcl_core_diorite_smooth',
  diorite: 'mcl_core_diorite',
  polished_granite: 'mcl_core_granite_smooth',
  granite: 'mcl_core_granite',

  grass_block_top: 'mcl_core_grass_block_top',
  grass_block_side: 'mcl_core_grass_block_side',
  grass_block_side_overlay: 'mcl_core_grass_block_side_overlay',
  dirt_path_top: 'mcl_core_grass_path_top',
  dirt_path_side: 'mcl_core_grass_path_side',
  coarse_dirt: 'mcl_core_coarse_dirt',

  glass: 'default_glass',
  glass_pane_top: 'default_glass_detail',
  glowstone: 'mcl_nether_glowstone',
  sea_lantern: 'mcl_ocean_sea_lantern',
  lantern: 'mcl_lanterns_lantern',
  bookshelf: 'default_bookshelf',
  obsidian: 'default_obsidian',
  crying_obsidian: 'mcl_core_crying_obsidian',
  nether_portal: 'mcl_portals_portal',
  netherrack: 'mcl_nether_netherrack',
  bedrock: 'mcl_core_bedrock',
  rail: 'default_rail',
  powered_rail: 'mcl_minecarts_rail_golden',
  powered_rail_on: 'mcl_minecarts_rail_golden_powered',
  detector_rail: 'mcl_minecarts_rail_detector',
  lectern_base: 'mcl_lectern_lectern_base',
  lectern_front: 'mcl_lectern_lectern_front',
  lectern_sides: 'mcl_lectern_lectern_sides',
  lectern_top: 'mcl_lectern_lectern_top',
  water_still: 'mcl_core_water_source_animation',
  water_flow: 'mcl_core_water_flow_animation',
  lava_still: 'mcl_core_lava_source_animation',
  lava_flow: 'mcl_core_lava_flow_animation',
  dandelion: 'flowers_dandelion_yellow',
  poppy: 'mcl_flowers_poppy',

  // The campus palette. VoxeLibre paints grass sides as dirt plus a tinted
  // overlay (the model does the same), and names two wools differently.
  grass_block_side: 'default_dirt',
  lime_wool: 'mcl_wool_lime',
  purple_wool: 'wool_violet',
  lime_carpet: 'mcl_wool_lime',
  purple_carpet: 'wool_violet'
}

const SYNONYMS = {
  cobblestone: 'cobble',
  bricks: 'brick',
  log: 'tree',
  blocks: 'block',
  // VoxeLibre keeps the pre-flattening names for these
  terracotta: 'hardened clay',
  gray: 'grey',
  shulker_box: 'shulker',
  carpet: 'wool'
}

// Tokens that only one of the two naming schemes uses; dropping them from both
// sides lets the colour variants (stained glass, terracotta, panes) line up.
const DROP_TOKENS = new Set(['stained', 'box', 'pane'])

// Minetest namespaces every texture with its mod name.
const PREFIX_RE = /^(mcl_[a-z0-9]+_|default_|mcl_|mobs_mc_|xpanes_|farming_|doors_|stairs_|carts_|vessels_|bucket_|flowers_)/

const stripPrefix = n => n.replace(PREFIX_RE, '')
const tokenKey = n => {
  let s = stripPrefix(n).toLowerCase()
  for (const [k, v] of Object.entries(SYNONYMS)) s = s.split(k).join(v)
  s = s.replace(/([a-z])(\d)/g, '$1_$2') // wheat_stage0 -> wheat_stage_0
  return s
    .split(/[_\s]+/)
    .filter(t => t && !DROP_TOKENS.has(t))
    .sort()
    .join('_')
}

let vlFiles = []
if (haveVL) vlFiles = fs.readdirSync(VL_DIR).filter(f => f.endsWith('.png')).map(f => f.replace(/\.png$/, ''))

const vlExact = new Set(vlFiles)
const vlByToken = new Map()
for (const f of vlFiles) {
  const k = tokenKey(f)
  // prefer the canonical mcl_core_/default_ art when several files collide
  if (!vlByToken.has(k) || /^(mcl_core_|default_)/.test(f)) vlByToken.set(k, f)
}

function resolveSource (mojangName) {
  const o = OVERRIDES[mojangName]
  if (o && vlExact.has(o)) return { file: o, how: 'override' }
  if (vlExact.has(mojangName)) return { file: mojangName, how: 'exact' }
  const t = vlByToken.get(tokenKey(mojangName))
  if (t) return { file: t, how: 'token' }
  return null
}

// -------------------------------------------------------- procedural fallback
// Unmatched blocks get a flat, plausible tile rather than a magenta error, so
// the world still reads correctly.
const HUE_HINTS = [
  [/leaves|vine|moss|lily|kelp|grass|fern|bamboo/, [86, 140, 62]],
  [/planks|wood|log|tree|door|trapdoor|sign|barrel|crafting/, [160, 124, 76]],
  [/stone|cobble|andesite|diorite|granite|gravel|furnace|smooth/, [126, 126, 126]],
  [/deepslate|basalt|blackstone|obsidian|coal|black/, [48, 46, 52]],
  [/sand|sandstone|desert/, [214, 200, 152]],
  [/nether|crimson|warped|soul|magma/, [120, 56, 56]],
  [/end_|purpur|chorus/, [216, 210, 168]],
  [/ice|snow|powder/, [200, 224, 240]],
  [/wool|concrete|terracotta|glazed|carpet/, [178, 168, 158]],
  [/ore|iron|gold|diamond|emerald|copper|lapis|redstone|netherite/, [140, 140, 148]],
  [/water/, [64, 110, 200]],
  [/lava|fire|flame/, [214, 118, 40]],
  [/dirt|farmland|mud|clay|podzol|mycelium/, [134, 96, 67]]
]

function fallbackTile (name) {
  let base = null
  for (const [re, c] of HUE_HINTS) if (re.test(name)) { base = c; break }
  if (!base) {
    let h = 0
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
    base = [110 + (h % 70), 100 + ((h >> 8) % 70), 100 + ((h >> 16) % 70)]
  }
  const buf = Buffer.alloc(TILE * TILE * 4)
  let s = 0
  for (let i = 0; i < name.length; i++) s = (s * 131 + name.charCodeAt(i)) >>> 0
  for (let i = 0; i < TILE * TILE; i++) {
    s = (s * 1664525 + 1013904223) >>> 0
    const t = 0.88 + (s / 4294967296) * 0.24
    buf[i * 4] = Math.min(255, base[0] * t)
    buf[i * 4 + 1] = Math.min(255, base[1] * t)
    buf[i * 4 + 2] = Math.min(255, base[2] * t)
    buf[i * 4 + 3] = 255
  }
  return buf
}

/** Load a texture as a 16x16 RGBA tile, taking frame 0 of animated strips. */
async function loadTile (file) {
  const img = sharp(file)
  const meta = await img.metadata()
  let pipe = img
  // Minetest animates with a vertical strip; keep only the first frame
  if (meta.height && meta.width && meta.height > meta.width) {
    pipe = pipe.extract({ left: 0, top: 0, width: meta.width, height: meta.width })
  }
  return pipe
    .resize(TILE, TILE, { kernel: 'nearest', fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer()
}

// -------------------------------------------------------------- build the atlas
const nextPow2 = n => { if (n === 0) return 1; n--; for (const s of [1, 2, 4, 8, 16]) n |= n >> s; return n + 1 }

const textureFiles = fs.readdirSync(BLOCKS_DIR).filter(f => f.endsWith('.png')).sort()
textureFiles.unshift('missing_texture.png')

const grid = nextPow2(Math.ceil(Math.sqrt(textureFiles.length)))
const imgSize = grid * TILE
const atlas = Buffer.alloc(imgSize * imgSize * 4)
const texturesIndex = {}

const stats = { override: 0, exact: 0, token: 0, fallback: 0 }
const unmatched = []

for (let i = 0; i < textureFiles.length; i++) {
  const fileName = textureFiles[i]
  const name = fileName.replace(/\.png$/, '')
  const tx = (i % grid) * TILE
  const ty = Math.floor(i / grid) * TILE

  texturesIndex[name] = {
    u: tx / imgSize, v: ty / imgSize, su: TILE / imgSize, sv: TILE / imgSize
  }

  let tile
  if (name === 'missing_texture') {
    tile = await loadTile(MISSING)
  } else {
    const src = haveVL ? resolveSource(name) : null
    if (src) {
      try {
        tile = await loadTile(path.join(VL_DIR, src.file + '.png'))
        stats[src.how]++
      } catch {
        tile = fallbackTile(name); stats.fallback++; unmatched.push(name)
      }
    } else {
      tile = fallbackTile(name); stats.fallback++; unmatched.push(name)
    }
  }

  for (let row = 0; row < TILE; row++) {
    const src = row * TILE * 4
    const dst = ((ty + row) * imgSize + tx) * 4
    tile.copy(atlas, dst, src, src + TILE * 4)
  }
}

const outTexDir = path.join(OUT, 'textures')
const outStateDir = path.join(OUT, 'blocksStates')
fs.mkdirSync(outTexDir, { recursive: true })
fs.mkdirSync(outStateDir, { recursive: true })

const atlasPng = await sharp(atlas, { raw: { width: imgSize, height: imgSize, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toBuffer()
fs.writeFileSync(path.join(outTexDir, `${VERSION}.png`), atlasPng)

// ------------------------------------------------------------- blocksStates
const atlasJson = { size: TILE / imgSize, textures: texturesIndex }
const blocksStates = JSON.parse(fs.readFileSync(path.join(ASSETS, 'blocks_states.json'), 'utf8'))
const blocksModels = JSON.parse(fs.readFileSync(path.join(ASSETS, 'blocks_models.json'), 'utf8'))

const prepared = prepareBlocksStates({ blocksStates, blocksModels }, { json: atlasJson })
const statesJson = JSON.stringify(prepared)
// Only the gzipped twin is shipped: the engine's fetchMaybeGzip inflates it
// client-side, and the raw 4+ MB file would blow the per-asset budget.
const gz = zlib.gzipSync(Buffer.from(statesJson), { level: 9 })
fs.writeFileSync(path.join(outStateDir, `${VERSION}.json.gz`), gz)

// ------------------------------------------------------------------ reporting
fs.mkdirSync(CACHE, { recursive: true })
fs.writeFileSync(path.join(CACHE, 'atlas-report.json'), JSON.stringify({
  version: VERSION, grid, imgSize, tiles: textureFiles.length, stats, unmatched
}, null, 2))

const matched = stats.override + stats.exact + stats.token
console.log(`atlas         ${imgSize}x${imgSize} (${grid}x${grid} tiles)  ${(atlasPng.length / 1024).toFixed(0)} KB`)
console.log(`textures      ${textureFiles.length} tiles`)
console.log(`  VoxeLibre   ${matched} (${Math.round(matched / textureFiles.length * 100)}%)  [override ${stats.override}, exact ${stats.exact}, token ${stats.token}]`)
console.log(`  generated   ${stats.fallback}  (see .cache/mc/atlas-report.json)`)
console.log(`blocksStates  ${(statesJson.length / 1048576).toFixed(1)} MB raw -> ${(gz.length / 1024).toFixed(0)} KB gzipped`)
