import { MemoryStore } from 'express-rate-limit'
import { RateLimiter } from 'limiter'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { limito } from '../dist/index.js'

export type Hit = (key: string) => unknown
type Make = (limit: number, window: number) => Hit

export const libs: Record<string, Make> = {
  limito: (limit, window) => {
    const rl = limito({ limit, window, max: Infinity })
    return (k) => rl(k)
  },

  'rate-limiter-flexible': (limit, window) => {
    const rl = new RateLimiterMemory({ points: limit, duration: window / 1000 })
    return async (k) => {
      try {
        await rl.consume(k)
      } catch {}
    }
  },

  'express-rate-limit': (_, window) => {
    const store = new MemoryStore()
    store.init({ windowMs: window } as never)
    return (k) => store.increment(k)
  },

  limiter: (limit, window) => {
    const map = new Map<string, RateLimiter>()
    return (k) => {
      let rl = map.get(k)
      if (!rl) {
        rl = new RateLimiter({ tokensPerInterval: limit, interval: window })
        map.set(k, rl)
      }
      return rl.tryRemoveTokens(1)
    }
  },
}

export const versions: Record<string, string> = Object.fromEntries(
  await Promise.all(
    Object.keys(libs).map(async (name) => {
      const path = name === 'limito' ? '../package.json' : `./node_modules/${name}/package.json`
      const pkg = await import(new URL(path, import.meta.url).href, { with: { type: 'json' } })
      return [name, pkg.default.version as string]
    }),
  ),
)
