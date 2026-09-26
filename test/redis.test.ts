import { createHash, randomUUID } from 'node:crypto'
import { setTimeout as sleep } from 'node:timers/promises'
import { Redis } from 'ioredis'
import { createClient } from 'redis'
import { afterAll, describe, expect, it } from 'vitest'
import { limito, type Send } from '../src/redis.ts'
import { SCRIPT, SHA } from '../src/script.ts'

const url = process.env.REDIS_URL

it('SHA matches the script', () => {
  expect(createHash('sha1').update(SCRIPT).digest('hex')).toBe(SHA)
})

it('rejects bad options', () => {
  const send: Send = async () => null
  expect(() => limito({ limit: 0, window: '1s', send })).toThrow(RangeError)
})

it('rethrows other errors', async () => {
  const rl = limito({ limit: 1, window: 1000, send: () => Promise.reject(new Error('READONLY')) })
  await expect(rl('a')).rejects.toThrow('READONLY')
})

it('rejects odd replies and bad cost', async () => {
  const rl = limito({ limit: 1, window: 1000, send: async () => null })
  await expect(rl('a')).rejects.toThrow(TypeError)
  await expect(rl('a', -1)).rejects.toThrow(RangeError)
  await expect(rl.peek('a', Number.NaN)).rejects.toThrow(RangeError)
})

describe.runIf(url)('redis', async () => {
  const io = new Redis(url!)
  const nr = createClient({ url: url! })
  await nr.connect()
  afterAll(() => Promise.all([io.quit(), nr.quit()]))

  const clients: [string, Send][] = [
    ['ioredis', ([cmd, ...args]) => io.call(cmd, ...args)],
    ['node-redis', (a) => nr.sendCommand(a)],
  ]

  describe.each(clients)('%s', (_, send) => {
    const make = (limit: number, window: number, burst?: number) =>
      limito({ limit, window, send, prefix: `test:${randomUUID()}:`, ...(burst && { burst }) })

    it('allows up to limit, then waits one step', async () => {
      const rl = make(5, 5000)
      for (let i = 0; i < 5; i++) expect(await rl('a')).toBe(0)
      const wait = await rl('a')
      expect(wait).toBeGreaterThan(900)
      expect(wait).toBeLessThanOrEqual(1000)
    })

    it('refills over time', async () => {
      const rl = make(2, 2000)
      await rl('a')
      await rl('a')
      expect(await rl('a')).toBeGreaterThan(0)
      await sleep(1100)
      expect(await rl('a')).toBe(0)
    })

    it('grants the full burst with awkward rates', async () => {
      for (const [limit, window] of [
        [3, 2000],
        [7, 1000],
        [30, 1001],
      ] as const) {
        for (let n = 0; n < 20; n++) {
          const rl = make(limit, window)
          const res = await Promise.all(Array.from({ length: limit + 1 }, () => rl('a')))
          expect(res.filter((w) => w === 0)).toHaveLength(limit)
        }
      }
    })

    it('lets exactly limit through under concurrency', async () => {
      const rl = make(50, 60_000)
      const res = await Promise.all(Array.from({ length: 200 }, () => rl('a')))
      expect(res.filter((w) => w === 0)).toHaveLength(50)
    })

    it('respects burst', async () => {
      const rl = make(10, 10_000, 2)
      expect(await rl('a')).toBe(0)
      expect(await rl('a')).toBe(0)
      expect(await rl('a')).toBeGreaterThan(900)
    })

    it('charges cost and rejects impossible cost', async () => {
      const rl = make(10, 1000)
      expect(await rl('a', 7)).toBe(0)
      expect(await rl('a', 4)).toBeGreaterThan(0)
      expect(await rl('a', 3)).toBe(0)
      expect(await rl('a', 11)).toBe(Infinity)
      expect(await rl.peek('a', 11)).toBe(Infinity)
    })

    it('peek does not consume', async () => {
      const rl = make(1, 1000)
      expect(await rl.peek('a')).toBe(0)
      expect(await rl.peek('a')).toBe(0)
      expect(await rl('a')).toBe(0)
      expect(await rl.peek('a')).toBeGreaterThan(0)
    })

    it('reports info', async () => {
      const rl = make(3, 2000)
      expect(await rl.info('a')).toEqual({ limit: 3, remaining: 3, reset: 0, window: 2000 })
      await rl('a')
      expect((await rl.info('a')).remaining).toBe(2)
      await rl('a')
      await rl('a')
      const info = await rl.info('a')
      expect(info.remaining).toBe(0)
      expect(info.reset).toBeGreaterThan(1900)
      expect(info.reset).toBeLessThanOrEqual(2000)
    })

    it('shares state between instances with the same config', async () => {
      const prefix = `test:${randomUUID()}:`
      const a = limito({ limit: 1, window: 1000, send, prefix })
      const b = limito({ limit: 1, window: 1000, send, prefix })
      expect(await a('x')).toBe(0)
      expect(await b('x')).toBeGreaterThan(0)
    })

    it('keeps limiters with different rates apart', async () => {
      const prefix = `test:${randomUUID()}:`
      const login = limito({ limit: 1, window: 60_000, send, prefix })
      const api = limito({ limit: 100, window: 1000, send, prefix })
      await login('x')
      expect(await login('x')).toBeGreaterThan(0)
      expect(await api('x')).toBe(0)
    })

    it('treats number and string keys the same', async () => {
      const rl = make(1, 60_000)
      await rl(7)
      expect(await rl('7')).toBeGreaterThan(0)
    })

    it('expires keys once refilled', async () => {
      const prefix = `test:${randomUUID()}:`
      const rl = limito({ limit: 10, window: 1000, send, prefix })
      await rl('a', 3)
      const ttl = Number(await send(['PTTL', `${prefix}1000/10/10:a`]))
      expect(ttl).toBeGreaterThan(0)
      expect(ttl).toBeLessThanOrEqual(300)
    })

    it('resets a key', async () => {
      const rl = make(1, 60_000)
      await rl('a')
      expect(await rl('a')).toBeGreaterThan(0)
      await rl.reset('a')
      expect(await rl('a')).toBe(0)
    })

    it('loads the script after a flush', async () => {
      const rl = make(1, 1000)
      await send(['SCRIPT', 'FLUSH'])
      expect(await rl('a')).toBe(0)
      expect(await rl('a')).toBeGreaterThan(0)
    })
  })
})
