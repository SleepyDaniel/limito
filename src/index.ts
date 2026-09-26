import { type Duration, toMs } from './duration.ts'
import { type Key, Store } from './store.ts'

export { headers } from './headers.ts'
export type { Duration, Key }

export interface Options {
  limit: number
  window: Duration
  burst?: number
  max?: number
}

export interface Info {
  limit: number
  remaining: number
  reset: number
  window: number
}

export interface Limiter {
  (key: Key, cost?: number): number
  peek(key: Key, cost?: number): number
  info(key: Key): Info
  reset(key: Key): void
  clear(): void
  readonly size: number
}

export const limito = ({ limit, window, burst = limit, max = 1e6 }: Options): Limiter => {
  const win = toMs(window)
  if (!(limit > 0 && win > 0 && burst > 0 && max > 0)) {
    throw new RangeError('limito: limit, window, burst and max must be positive')
  }

  const step = win / limit
  const tau = burst * step
  const s = new Store(max, tau)
  const { keys } = s

  const hit = (key: Key, cost = 1) => {
    const t = performance.now()
    const i = keys.get(key)
    let tat = t
    if (i !== undefined && s.tats[i]! > t) tat = s.tats[i]!
    const next = tat + cost * step
    const wait = next - t - tau
    if (wait > 0) return cost > burst ? Infinity : Math.ceil(wait)
    if (i === undefined) s.add(key, next, t)
    else s.tats[i] = next
    return 0
  }

  const peek = (key: Key, cost = 1) => {
    const t = performance.now()
    const i = keys.get(key)
    let tat = t
    if (i !== undefined && s.tats[i]! > t) tat = s.tats[i]!
    const wait = tat + cost * step - t - tau
    return wait > 0 ? (cost > burst ? Infinity : Math.ceil(wait)) : 0
  }

  const info = (key: Key): Info => {
    const i = keys.get(key)
    const used = i === undefined ? 0 : Math.max(s.tats[i]! - performance.now(), 0)
    return {
      limit,
      remaining: Math.max(Math.floor(burst - used / step + 1e-9), 0),
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
