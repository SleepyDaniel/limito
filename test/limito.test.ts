import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { limito } from '../src/index.ts'

beforeEach(() => void vi.useFakeTimers())
afterEach(() => void vi.useRealTimers())

describe('limito', () => {
  it('allows up to limit at once, then denies', () => {
    const rl = limito({ limit: 3, window: '3s' })
    expect([rl('a'), rl('a'), rl('a')]).toEqual([0, 0, 0])
    expect(rl('a')).toBe(1000)
  })

  it('refills one request per step', () => {
    const rl = limito({ limit: 10, window: '10s' })
    for (let i = 0; i < 10; i++) rl('a')
    expect(rl('a')).toBe(1000)
    vi.advanceTimersByTime(999)
    expect(rl('a')).toBe(1)
    vi.advanceTimersByTime(1)
    expect(rl('a')).toBe(0)
    expect(rl('a')).toBe(1000)
  })

  it('keeps keys independent', () => {
    const rl = limito({ limit: 1, window: 1000 })
    expect(rl('a')).toBe(0)
    expect(rl('b')).toBe(0)
    expect(rl(1)).toBe(0)
    expect(rl('a')).toBeGreaterThan(0)
  })

  it('smooths traffic with a small burst', () => {
    const rl = limito({ limit: 60, window: '1m', burst: 1 })
    expect(rl('a')).toBe(0)
    expect(rl('a')).toBe(1000)
    vi.advanceTimersByTime(1000)
    expect(rl('a')).toBe(0)
  })

  it('charges cost', () => {
    const rl = limito({ limit: 10, window: '10s' })
    expect(rl('a', 7)).toBe(0)
    expect(rl('a', 4)).toBe(1000)
    expect(rl('a', 3)).toBe(0)
    expect(rl('a')).toBeGreaterThan(0)
    expect(rl('b', 0)).toBe(0)
    expect(rl.info('b').remaining).toBe(10)
  })

  it('returns Infinity when cost can never fit', () => {
    const rl = limito({ limit: 5, window: '5s' })
    expect(rl('a', 6)).toBe(Infinity)
    expect(rl.peek('a', 6)).toBe(Infinity)
    expect(rl.info('a').remaining).toBe(5)
  })

  it('rejects negative and NaN cost', () => {
    const rl = limito({ limit: 5, window: '5s' })
    expect(() => rl('a', -1)).toThrow(RangeError)
    expect(() => rl('a', Number.NaN)).toThrow(RangeError)
    expect(() => rl.peek('a', -1)).toThrow(RangeError)
    expect(rl.info('a').remaining).toBe(5)
  })

  it('peek does not consume', () => {
    const rl = limito({ limit: 1, window: '1s' })
    expect(rl.peek('a')).toBe(0)
    expect(rl.peek('a')).toBe(0)
    expect(rl('a')).toBe(0)
    expect(rl.peek('a')).toBe(1000)
  })

  it('reports info', () => {
    const rl = limito({ limit: 4, window: '4s' })
    expect(rl.info('a')).toEqual({ limit: 4, remaining: 4, reset: 0, window: 4000 })
    rl('a')
    rl('a')
    expect(rl.info('a')).toEqual({ limit: 4, remaining: 2, reset: 2000, window: 4000 })
    vi.advanceTimersByTime(5000)
    expect(rl.info('a')).toEqual({ limit: 4, remaining: 4, reset: 0, window: 4000 })
  })

  it('resets and clears', () => {
    const rl = limito({ limit: 1, window: '1h' })
    rl('a')
    rl('b')
    expect(rl.size).toBe(2)
    rl.reset('a')
    expect(rl('a')).toBe(0)
    expect(rl('b')).toBeGreaterThan(0)
    rl.clear()
    expect(rl.size).toBe(0)
    expect(rl('b')).toBe(0)
  })

  it('handles limits below 1', () => {
    const rl = limito({ limit: 0.5, window: '1s' })
    expect(rl('a')).toBe(0)
    expect(rl('a')).toBe(2000)
  })

  it('rejects bad options', () => {
    expect(() => limito({ limit: 0, window: '1s' })).toThrow(RangeError)
    expect(() => limito({ limit: 1, window: 0 })).toThrow(RangeError)
    expect(() => limito({ limit: 1, window: Infinity })).toThrow(RangeError)
    expect(() => limito({ limit: Infinity, window: '1s' })).toThrow(RangeError)
    expect(() => limito({ limit: 1, window: '1s', burst: 0.5 })).toThrow(RangeError)
    expect(() => limito({ limit: 1, window: '1s', max: 0 })).toThrow(RangeError)
    expect(() => limito({ limit: Number.NaN, window: '1s' })).toThrow(RangeError)
  })
})

describe('rounding', () => {
  it('grants the full burst for any limit', () => {
    for (let limit = 1; limit <= 200; limit++) {
      const rl = limito({ limit, window: '1s' })
      for (let i = 0; i < limit; i++) expect(rl('a')).toBe(0)
      expect(rl('a')).toBeGreaterThan(0)
    }
  })

  it('never denies traffic under the rate', () => {
    for (const start of [0, 1e5, 1e9, 1.78e12]) {
      vi.advanceTimersByTime(start)
      const rl = limito({ limit: 7, window: '1s', burst: 1 })
      for (let i = 0; i < 100; i++) {
        expect(rl('a')).toBe(0)
        vi.advanceTimersByTime(1000)
      }
    }
  })

  it('allows the retry after the returned wait', () => {
    const rl = limito({ limit: 3, window: '10s', burst: 1 })
    for (let i = 0; i < 1000; i++) {
      const wait = rl('a')
      if (wait) {
        vi.advanceTimersByTime(wait)
        expect(rl('a')).toBe(0)
      }
      vi.advanceTimersByTime(i % 7)
    }
  })

  it('keeps info in line with rl after a long uptime', () => {
    const rl = limito({ limit: 7, window: '1s' })
    vi.advanceTimersByTime(30 * 864e5)
    for (let n = 7; n > 0; n--) {
      expect(rl.info('a').remaining).toBe(n)
      expect(rl('a')).toBe(0)
    }
    expect(rl.info('a').remaining).toBe(0)
    expect(rl('a')).toBeGreaterThan(0)
  })
})
