/**
 * Globals the prismarine stack expects from Node, injected into every browser
 * bundle by esbuild. Without `process` the engine throws
 * "process is not defined" the moment it initialises.
 */
import { Buffer as NodeBuffer } from 'buffer'
import nodeProcess from 'process/browser.js'

export { NodeBuffer as Buffer }
export { nodeProcess as process }
export const global = globalThis
