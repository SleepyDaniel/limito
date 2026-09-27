import { rateLimit as express } from '../dist/express.js'
import { rateLimit as hono } from '../dist/hono.js'
import { headers, limito } from '../dist/index.js'

const rl = limito({ limit: 2, window: '1s' })
const res = [rl('a'), rl('a'), rl('a')]
if (res[0] !== 0 || res[1] !== 0 || !(res[2] > 0)) throw new Error(`unexpected: ${res}`)
if (!headers(rl.info('a'), res[2])['retry-after']) throw new Error('missing retry-after')
if (typeof hono(rl, () => 'a') !== 'function' || typeof express(rl) !== 'function') {
  throw new Error('middleware did not load')
}
console.log('ok')
