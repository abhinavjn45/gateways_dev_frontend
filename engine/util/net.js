/** Fetch helpers. Everything under /prismarine can be stored gzipped on a CDN;
 *  modern browsers decompress with DecompressionStream at essentially no cost. */

export function assetBase () {
  const cdn = typeof self !== 'undefined' && self.__MC_CDN_BASE
  return cdn ? String(cdn).replace(/\/+$/, '') + '/prismarine/' : '/prismarine/'
}

/** Cache-busting suffix taken from the script tag that loaded us. */
export function versionQuery () {
  try {
    const src = document.currentScript && document.currentScript.src
    const v = src && new URL(src, window.location.href).searchParams.get('v')
    return v ? '?v=' + encodeURIComponent(v) : ''
  } catch {
    return ''
  }
}

async function inflate (res, label) {
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`)
  const enc = (res.headers.get('content-encoding') || '').toLowerCase()
  // If the server already negotiated gzip, fetch has decoded it for us.
  if (enc.includes('gzip') || enc.includes('br')) return new Uint8Array(await res.arrayBuffer())
  if (typeof DecompressionStream === 'undefined') {
    throw new Error(`${label}: this browser cannot decompress gzip`)
  }
  const stream = res.body.pipeThrough(new DecompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** Fetch a .gz asset, falling back to the uncompressed twin if it is absent.
 *  `url` may carry a `?v=` query; the `.gz` goes before it. */
export async function fetchMaybeGzip (url, label) {
  const [pathPart, query = ''] = url.split('?')
  try {
    const res = await fetch(pathPart + '.gz' + (query ? '?' + query : ''), { cache: 'force-cache' })
    if (res.ok) return await inflate(res, label)
  } catch { /* fall through */ }
  const res = await fetch(url, { cache: 'force-cache' })
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`)
  return new Uint8Array(await res.arrayBuffer())
}

export async function fetchJson (url, label) {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`)
  return res.json()
}

export async function fetchBuffer (url, label) {
  const res = await fetch(url, { cache: 'force-cache' })
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`)
  return new Uint8Array(await res.arrayBuffer())
}
