import { type Duration, toMs } from './duration.ts'

export interface BaseOptions {
  limit: number
  window: Duration
  burst?: number
}

export interface Info {
  limit: number
  remaining: number
  reset: number
  window: number
}

export interface Rate {
  limit: number
  win: number
  burst: number
  step: number
  lim: number
}

export const rate = ({ limit, window, burst = Math.max(limit, 1) }: BaseOptions): Rate => {
  const win = toMs(window)
  if (!(limit > 0 && win > 0 && limit < Infinity && win < Infinity && burst >= 1)) {
    throw new RangeError('limito: bad limit, window or burst')
  }
  const step = win / limit
  return { limit, win, burst, step, lim: burst * step + Math.min(1e-3, step * 1e-3) }
}

export const badCost = (cost: number): never => {
  throw new RangeError(`limito: bad cost ${cost}`)
}

export const waitFor = async (wait: number | Promise<number>): Promise<void> => {
  let ms = await wait
  if (ms === Infinity) throw new RangeError('limito: cost > burst')
  while (ms > 0) {
    const d = Math.min(ms, 2e9)
    await new Promise((r) => setTimeout(r, d))
    ms -= d
  }
}
