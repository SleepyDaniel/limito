import type { Duration } from './duration.ts'
import { type BaseOptions, badCost, type Info, rate, waitFor } from './options.ts'
import { type Key, Store } from './store.ts'

export { headers } from './headers.ts'
export { ipKey } from './ip.ts'
export type { Duration, Info, Key }

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

  const s = new Store(cap, lim)
  const { keys } = s
  const t0 = performance.now()
  const now = () => performance.now() - t0

  const take = (key: Key, cost: number, mode: 0 | 1 | 2) => {
    if (!(cost >= 0)) return badCost(cost)
    if (cost > burst) return Infinity
    const t = now()
    const i = keys.get(key)
    let tat = t
    if (i !== undefined && s.tats[i]! > t) tat = s.tats[i]!
    const next = tat + cost * step
    const wait = next - t - lim
    if (mode && (wait <= 0 || mode === 2)) {
      if (i === undefined) s.add(key, next, t)
      else s.tats[i] = next
    }
    return wait > 0 ? Math.ceil(wait) : 0
  }

  const hit = (key: Key, cost = 1) => take(key, cost, 1)

  const info = (key: Key): Info => {
    const i = keys.get(key)
    const used = i === undefined ? 0 : Math.max(s.tats[i]! - now(), 0)
    return {
      limit,
      remaining: Math.max(Math.floor((lim - used) / step), 0),
      reset: Math.ceil(used),
      window: win,
    }
  }

  return Object.defineProperty(
    Object.assign(hit, {
      peek: (key: Key, cost = 1) => take(key, cost, 0),
      wait: async (key: Key, cost = 1) => waitFor(take(key, cost, 2)),
      info,
      reset: (key: Key) => void keys.delete(key),
      clear: () => s.clear(),
    }),
    'size',
    { get: () => keys.size },
  ) as Limiter
}
