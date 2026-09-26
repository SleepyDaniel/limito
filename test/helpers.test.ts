import { describe, expect, it } from 'vitest'
import { toMs } from '../src/duration.ts'
import { headers } from '../src/index.ts'

describe('toMs', () => {
  it('parses units', () => {
    expect(toMs(250)).toBe(250)
    expect(toMs('250ms')).toBe(250)
    expect(toMs('1.5s')).toBe(1500)
    expect(toMs('.5m')).toBe(30_000)
    expect(toMs('2h')).toBe(7_200_000)
    expect(toMs('1d')).toBe(86_400_000)
  })

  it('throws on garbage', () => {
    expect(() => toMs('1 minute' as never)).toThrow(TypeError)
    expect(() => toMs('m' as never)).toThrow(TypeError)
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
    expect(headers(info, Infinity)['retry-after']).toBeUndefined()
  })
})
