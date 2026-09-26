import type { Info } from './index.ts'

export const headers = (info: Info, wait = 0): Record<string, string> => {
  const h: Record<string, string> = {
    'ratelimit-policy': `"default";q=${info.limit};w=${Math.ceil(info.window / 1e3)}`,
    ratelimit: `"default";r=${info.remaining};t=${Math.ceil(info.reset / 1e3)}`,
  }
  if (wait > 0 && wait !== Infinity) h['retry-after'] = `${Math.ceil(wait / 1e3)}`
  return h
}
