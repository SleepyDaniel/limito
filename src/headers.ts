import type { Info } from './options.ts'

export const headers = (info: Info, wait = 0): Record<string, string> => {
  const w = Math.max(Math.round(info.window / 1e3), 1)
  const q = Math.max(Math.round((info.limit * w * 1e3) / info.window), 1)
  const h: Record<string, string> = {
    'ratelimit-policy': `"default";q=${q};w=${w}`,
    ratelimit: `"default";r=${info.remaining};t=${Math.ceil(info.reset / 1e3)}`,
  }
  if (wait > 0 && wait < Infinity) h['retry-after'] = `${Math.ceil(wait / 1e3)}`
  return h
}
