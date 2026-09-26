import type { Duration } from './duration.ts'
import { type BaseOptions, badCost, type Info, rate } from './options.ts'
import { type Key, Store } from './store.ts'

export { headers } from './headers.ts'
export type { Duration, Info, Key }

export interface Options extends BaseOptions {
  max?: number
}

export interface Limiter {
  (key: Key, cost?: number): number
  peek(key: Key, cost?: number): number
  info(key: Key): Info
  reset(key: Key): void
  clear(): void
  readonly size: number
}

export const limito = ({ max = 1e6, ...opts }: Options): Limiter => {
  const { limit, win, burst, step, tau, lim } = rate(opts)
  const cap = Math.floor(max)
  if (!(cap > 0)) throw new RangeError('limito: bad max')

  const s = new Store(cap, tau)
  const { keys } = s
  const t0 = performance.now()

  const hit = (key: Key, cost = 1) => {
    if (!(cost >= 0)) return badCost(cost)
    const t = performance.now() - t0
    const i = keys.get(key)
    let tat = t
    if (i !== undefined && s.tats[i]! > t) tat = s.tats[i]!
    const next = tat + cost * step
    const wait = next - t - lim
    if (wait > 0) return cost > burst ? Infinity : Math.ceil(wait)
    if (i === undefined) s.add(key, next, t)
    else s.tats[i] = next
    return 0
  }

  const peek = (key: Key, cost = 1) => {
    if (!(cost >= 0)) return badCost(cost)
    const t = performance.now() - t0
    const i = keys.get(key)
    let tat = t
    if (i !== undefined && s.tats[i]! > t) tat = s.tats[i]!
    const wait = tat + cost * step - t - lim
    return wait > 0 ? (cost > burst ? Infinity : Math.ceil(wait)) : 0
  }

  const info = (key: Key): Info => {
    const i = keys.get(key)
    const used = i === undefined ? 0 : Math.max(s.tats[i]! - (performance.now() - t0), 0)
    return {
      limit,
      remaining: Math.max(Math.floor((lim - used) / step), 0),
      reset: Math.ceil(used),
      window: win,
    }
  }

  return Object.defineProperty(
    Object.assign(hit, {
      peek,
      info,
      reset: (key: Key) => void keys.delete(key),
      clear: () => s.clear(),
    }),
    'size',
    { get: () => keys.size },
  ) as Limiter
}
