import { once } from 'node:events'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'
import { Hono } from 'hono'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { rateLimit as expressLimit } from '../src/express.ts'
import { rateLimit as honoLimit } from '../src/hono.ts'
import { limito } from '../src/index.ts'
import { limito as redisLimito } from '../src/redis.ts'

describe('hono', () => {
  const make = () => {
    const app = new Hono()
    app.use(honoLimit(limito({ limit: 2, window: '1m' }), (c) => c.req.header('x-user')))
    app.get('/', (c) => c.text('ok'))
    return app
  }

  it('lets requests through, then answers 429 with headers', async () => {
    const app = make()
    const get = () => app.request('/', { headers: { 'x-user': 'a' } })
    expect((await get()).status).toBe(200)
    expect((await get()).status).toBe(200)

    const res = await get()
    expect(res.status).toBe(429)
    expect(await res.text()).toBe('Too Many Requests')
    expect(res.headers.get('retry-after')).toBe('30')
    expect(res.headers.get('ratelimit')).toBe('"default";r=0;t=60')

    const other = await app.request('/', { headers: { 'x-user': 'b' } })
    expect(other.status).toBe(200)
  })

  it('fails loudly when there is no key', async () => {
    expect((await make().request('/')).status).toBe(500)
  })

  it('works with async limiters and async keys', async () => {
    const replies = [
      [0, 0, 1000],
      [500, 0, 1000],
      [0, 0, 1000],
    ]
    const sent: string[] = []
    const rl = redisLimito({
      limit: 1,
      window: '1s',
      send: async (a) => {
        sent.push(a[3]!)
        return replies.shift()
      },
    })
    const app = new Hono()
    app.use(honoLimit(rl, async () => 'k'))
    app.get('/', (c) => c.text('ok'))

    expect((await app.request('/')).status).toBe(200)
    const res = await app.request('/')
    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBe('1')
    expect(sent.length).toBe(3)
    expect(sent.every((k) => k.endsWith(':k'))).toBe(true)
  })
})

describe('express', () => {
  const app = express()
  app.set('trust proxy', 1)
  app.use('/ip', expressLimit(limito({ limit: 1, window: '1m' })))
  app.use(
    '/key',
    expressLimit(limito({ limit: 1, window: '1m' }), (req) => req.get('x-api-key')),
  )
  app.use(
    '/boom',
    expressLimit(limito({ limit: 1, window: '1m' }), () => {
      throw new Error('boom')
    }),
  )
  app.get('/{*any}', (_, res) => void res.send('ok'))
  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) =>
      void res.status(500).send(err.message),
  )

  let server: Server
  let base = ''
  beforeAll(async () => {
    server = app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })
  afterAll(() => new Promise<void>((r) => server.close(() => r())))

  const get = (path: string, headers: Record<string, string> = {}) =>
    fetch(base + path, { headers })

  it('limits by req.ip by default', async () => {
    const ip = { 'x-forwarded-for': '1.2.3.4' }
    expect((await get('/ip', ip)).status).toBe(200)

    const res = await get('/ip', ip)
    expect(res.status).toBe(429)
    expect(res.headers.get('content-type')).toMatch(/^text\/plain/)
    expect(await res.text()).toBe('Too Many Requests')
    expect(res.headers.get('retry-after')).toBe('60')
    expect(res.headers.get('ratelimit')).toBe('"default";r=0;t=60')
    expect(res.headers.get('ratelimit-policy')).toBe('"default";q=1;w=60')

    expect((await get('/ip', { 'x-forwarded-for': '5.6.7.8' })).status).toBe(200)
  })

  it('uses a custom key', async () => {
    expect((await get('/key', { 'x-api-key': 'a' })).status).toBe(200)
    expect((await get('/key', { 'x-api-key': 'a' })).status).toBe(429)
    expect((await get('/key', { 'x-api-key': 'b' })).status).toBe(200)
  })

  it('fails loudly when there is no key', async () => {
    const res = await get('/key')
    expect(res.status).toBe(500)
    expect(await res.text()).toMatch(/no key/)
  })

  it('fails loudly when req.ip is missing', async () => {
    const mw = expressLimit(limito({ limit: 1, window: '1m' }))
    const next = vi.fn()
    await mw({} as express.Request, {} as express.Response, next)
    expect(next).toHaveBeenCalledWith(expect.any(TypeError))
  })

  it('passes errors to next', async () => {
    const res = await get('/boom')
    expect(res.status).toBe(500)
    expect(await res.text()).toBe('boom')
  })
})
