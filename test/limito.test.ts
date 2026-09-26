import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { limito } from '../src/index.ts'

beforeEach(() => void vi.useFakeTimers())
afterEach(() => void vi.useRealTimers())

describe('limito', () => {
  it('allows up to limit at once, then denies', () => {
    const rl = limito({ limit: 3, window: '3s' })
    expect([rl('a'), rl('a'), rl('a')]).toEqual([0, 0, 0])
    expect(rl('a')).toBeCloseTo(1000)
  })

  it('refills one request per step', () => {
    const rl = limito({ limit: 10, window: '10s' })
    for (let i = 0; i < 10; i++) rl('a')
    expect(rl('a')).toBeGreaterThan(0)
    vi.advanceTimersByTime(999)
    expect(rl('a')).toBeCloseTo(1)
    vi.advanceTimersByTime(1)
    expect(rl('a')).toBe(0)
    expect(rl('a')).toBeCloseTo(1000)
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
    expect(rl('a')).toBeCloseTo(1000)
    vi.advanceTimersByTime(1000)
    expect(rl('a')).toBe(0)
  })

  it('charges cost', () => {
    const rl = limito({ limit: 10, window: '10s' })
    expect(rl('a', 7)).toBe(0)
    expect(rl('a', 4)).toBeCloseTo(1000)
    expect(rl('a', 3)).toBe(0)
    expect(rl('a')).toBeGreaterThan(0)
  })

  it('returns Infinity when cost can never fit', () => {
    const rl = limito({ limit: 5, window: '5s' })
    expect(rl('a', 6)).toBe(Infinity)
    expect(rl.peek('a', 6)).toBe(Infinity)
    expect(rl.info('a').remaining).toBe(5)
  })

  it('peek does not consume', () => {
    const rl = limito({ limit: 1, window: '1s' })
    expect(rl.peek('a')).toBe(0)
    expect(rl.peek('a')).toBe(0)
    expect(rl('a')).toBe(0)
    expect(rl.peek('a')).toBeCloseTo(1000)
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

  it('rejects bad options', () => {
    expect(() => limito({ limit: 0, window: '1s' })).toThrow(RangeError)
    expect(() => limito({ limit: 1, window: 0 })).toThrow(RangeError)
    expect(() => limito({ limit: 1, window: '1s', burst: -1 })).toThrow(RangeError)
    expect(() => limito({ limit: 1, window: '1s', max: 0 })).toThrow(RangeError)
    expect(() => limito({ limit: Number.NaN, window: '1s' })).toThrow(RangeError)
  })
})
