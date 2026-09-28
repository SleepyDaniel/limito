import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toMs } from '../src/duration.ts'
import { headers, limito } from '../src/index.ts'

describe('toMs', () => {
  it('parses units', () => {
    expect(toMs(250)).toBe(250)
    expect(toMs('250ms')).toBe(250)
    expect(toMs('1.5s')).toBe(1500)
    expect(toMs('.5m')).toBe(30_000)
    expect(toMs('2h')).toBe(7_200_000)
    expect(toMs('1d')).toBe(86_400_000)
    expect(toMs('1e3ms')).toBe(1000)
    expect(toMs('5.s')).toBe(5000)
  })

  it('throws on garbage', () => {
    expect(() => toMs('1 minute' as never)).toThrow(TypeError)
    expect(() => toMs('m' as never)).toThrow(TypeError)
    expect(() => toMs('-5s')).toThrow(TypeError)
  })
})

describe('headers', () => {
  const info = { limit: 100, remaining: 42, reset: 12_300, window: 60_000 }

  it('builds IETF RateLimit headers', () => {
    expect(headers(info)).toEqual({
      'ratelimit-policy': '"default";q=100;w=60',
      ratelimit: '"default";r=42;t=13',
    })
  })

  it('adds retry-after when waiting', () => {
    expect(headers(info, 1500)['retry-after']).toBe('2')
    expect(headers(info, 0)['retry-after']).toBeUndefined()
    expect(headers(info, Infinity)['retry-after']).toBeUndefined()
  })

  it('keeps q an integer and scales short windows', () => {
    expect(headers({ ...info, limit: 10, window: 100 })['ratelimit-policy']).toBe(
      '"default";q=100;w=1',
    )
    expect(headers({ ...info, limit: 1 / 3, window: 1000 })['ratelimit-policy']).toBe(
      '"default";q=1;w=1',
    )
  })

  describe('with a real limiter', () => {
    beforeEach(() => void vi.useFakeTimers())
    afterEach(() => void vi.useRealTimers())

    it('matches the README example', () => {
      const rl = limito({ limit: 100, window: '1m' })
      for (let i = 0; i < 100; i++) rl('ip')
      const wait = rl('ip')
      expect(headers(rl.info('ip'), wait)).toEqual({
        'ratelimit-policy': '"default";q=100;w=60',
        ratelimit: '"default";r=0;t=60',
        'retry-after': '1',
      })
    })
  })
})
