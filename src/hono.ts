import type { Context, Env, MiddlewareHandler } from 'hono'
import { type AnyLimiter, check, type KeyFn } from './check.ts'

export type { AnyLimiter }

export const rateLimit =
  <E extends Env = any>(rl: AnyLimiter, key: KeyFn<Context<E>>): MiddlewareHandler<E> =>
  async (c, next) => {
    const h = await check(rl, key(c))
    if (h) return c.text('Too Many Requests', 429, h)
    await next()
  }
