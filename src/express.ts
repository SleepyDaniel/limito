import type { Request, RequestHandler } from 'express'
import { type AnyLimiter, check, type KeyFn } from './check.ts'
import { ipKey } from './ip.ts'

export type { AnyLimiter }

export const rateLimit =
  (rl: AnyLimiter, key: KeyFn<Request> = (req) => ipKey(req.ip)): RequestHandler =>
  async (req, res, next) => {
    try {
      const h = await check(rl, await key(req))
      if (!h) return next()
      res.set(h).status(429).type('txt').send('Too Many Requests')
    } catch (e) {
      next(e)
    }
  }
