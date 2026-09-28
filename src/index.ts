import type { Duration } from './duration.ts'
import { type BaseOptions, type Info, type Key, rate, waitFor } from './options.ts'

export { headers } from './headers.ts'
export { ipKey } from './ip.ts'
export type { Duration, Info, Key }

const MIN = 64

export interface Options extends BaseOptions {
  max?: number
}

export interface Limiter {
  (key: Key, cost?: number): number
  peek(key: Key, cost?: number): number
  wait(key: Key, cost?: number): Promise<void>
  info(key: Key): Info
  reset(key: Key): void
  clear(): void
  readonly size: number
}

export const limito = ({ max = 1e6, ...opts }: Options): Limiter => {
  const { limit, win, burst, step, lim } = rate(opts)
  const cap = Math.floor(max)
  if (!(cap > 0)) throw new RangeError('limito: bad max')

  const keys = new Map<Key, number>()
  let tats = new Float64Array(Math.min(MIN, cap))
  let len = 0
  let free = -1
  let used = 0
  let sweep = 0
  const t0 = performance.now()
  const now = () => performance.now() - t0

  const compact = (t: number, full: boolean) => {
    const old = tats
    const holes = used > keys.size
    const every = (keys.size >> 12) + 1
    const off = Math.floor(Math.random() * every)
    const s: number[] = []
    let c = 0
    for (const [k, i] of keys) {
      if (old[i]! <= t) {
        keys.delete(k)
        old[i] = free
        free = i
      } else if (full && c++ % every === off) s.push(old[i]!)
    }

    let size = old.length
    while (keys.size > size * 0.75 && size < cap) size = Math.min(size * 2, cap)
    while (size > MIN && keys.size < size / 4) size >>= 1

    let drop = full ? keys.size - Math.floor(size * 0.75) : 0
    if (drop > 0) {
      const cut = s.sort((a, b) => a - b)[Math.ceil((s.length * drop) / keys.size) - 1]!
      for (const [k, i] of keys) {
        if (old[i]! > cut) continue
        keys.delete(k)
        old[i] = free
        free = i
        if (!--drop) break
      }
    }

    if (!holes && size > old.length) {
      tats = new Float64Array(size)
      tats.set(old)
    } else if (holes || size < old.length) {
      tats = new Float64Array(size)
      let n = 0
      for (const [k, i] of keys) {
        tats[n] = old[i]!
        keys.set(k, n++)
      }
      len = n
      free = -1
    }
    used = keys.size
    sweep = t + lim
  }

  const add = (key: Key, tat: number, t: number) => {
    const full = free < 0 && len === tats.length
    if (full || t >= sweep) compact(t, full)
    let i = free
    if (i < 0) i = len++
    else free = tats[i]! | 0
    used++
    keys.set(key, i)
    tats[i] = tat
  }

  const take = (key: Key, cost: number, mode: 0 | 1 | 2) => {
    if (!(cost >= 0)) throw new RangeError(`limito: bad cost ${cost}`)
    if (cost > burst) return Infinity
    const t = now()
    const i = keys.get(key)
    let tat = t
    if (i !== undefined && tats[i]! > t) tat = tats[i]!
    const next = tat + cost * step
    const wait = next - t - lim
    if (mode && cost && (wait <= 0 || mode === 2)) {
      if (i !== undefined) tats[i] = next
      else if (typeof key === 'string' || typeof key === 'number') add(key, next, t)
      else throw new TypeError('limito: key must be a string or number')
    }
    return wait > 0 ? Math.ceil(wait) : 0
  }

  const hit = (key: Key, cost = 1) => take(key, cost, 1)

  const info = (key: Key): Info => {
    const i = keys.get(key)
    const left = i === undefined ? 0 : Math.max(tats[i]! - now(), 0)
    return {
      limit,
      remaining: Math.max(Math.floor((lim - left) / step), 0),
      reset: Math.ceil(left),
      window: win,
    }
  }

  return Object.defineProperty(
    Object.assign(hit, {
      peek: (key: Key, cost = 1) => take(key, cost, 0),
      wait: async (key: Key, cost = 1) => waitFor(take(key, cost, 2)),
      info,
      reset: (key: Key) => void keys.delete(key),
      clear: () => {
        keys.clear()
        len = used = 0
        free = -1
      },
    }),
    'size',
    { get: () => keys.size },
  ) as Limiter
}
