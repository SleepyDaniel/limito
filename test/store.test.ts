import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { limito } from '../src/index.ts'

beforeEach(() => void vi.useFakeTimers())
afterEach(() => void vi.useRealTimers())

it('drops expired keys once the slab fills up', () => {
  const rl = limito({ limit: 10, window: '10s' })
  for (let i = 0; i < 64; i++) rl(i)
  expect(rl.size).toBe(64)
  vi.advanceTimersByTime(1000)
  rl('fresh')
  expect(rl.size).toBe(1)
})

it('drops expired keys on the sweep before the slab fills up', () => {
  const rl = limito({ limit: 1, window: '1s' })
  for (let i = 0; i < 10; i++) rl(i)
  vi.advanceTimersByTime(1000)
  rl('fresh')
  expect(rl.size).toBe(1)
})

it('grows and keeps live state across compactions', () => {
  const rl = limito({ limit: 1, window: '1h' })
  for (let i = 0; i < 10_000; i++) expect(rl(i)).toBe(0)
  expect(rl.size).toBe(10_000)
  for (let i = 0; i < 10_000; i++) expect(rl(i)).toBeGreaterThan(0)
})

it('shrinks back after a spike', () => {
  const rl = limito({ limit: 1, window: '1s' })
  for (let i = 0; i < 10_000; i++) rl(i)
  vi.advanceTimersByTime(1000)
  for (let i = 0; i < 20_000; i++) {
    rl('x')
    rl(`y${i % 10}`)
    if (i % 100 === 0) rl(`z${i}`)
    vi.advanceTimersByTime(1)
  }
  expect(rl.size).toBeLessThan(1000)
})

it('evicts oldest keys past max', () => {
  const rl = limito({ limit: 1, window: '1h', max: 100 })
  for (let i = 0; i < 1000; i++) rl(i)
  expect(rl.size).toBeLessThanOrEqual(100)
  expect(rl.size).toBeGreaterThanOrEqual(75)
  expect(rl(999)).toBeGreaterThan(0)
  expect(rl(0)).toBe(0)
})

it('keeps live keys when a sweep runs below max', () => {
  const rl = limito({ limit: 10, window: '10s', max: 100 })
  for (let i = 0; i < 90; i++) rl(i, 10)
  vi.advanceTimersByTime(10_001)
  for (let i = 0; i < 90; i++) rl(i, 10)
  vi.advanceTimersByTime(5_000)
  rl('new')
  expect(rl.size).toBe(91)
})

it('rounds a fractional max down', () => {
  const rl = limito({ limit: 1, window: '1h', max: 10.5 })
  for (let i = 0; i < 100; i++) rl(i)
  expect(rl.size).toBeLessThanOrEqual(10)
  expect(() => limito({ limit: 1, window: '1h', max: 0.5 })).toThrow(RangeError)
})

it('works with a tiny max', () => {
  const rl = limito({ limit: 1, window: '1h', max: 1 })
  expect(rl('a')).toBe(0)
  expect(rl('b')).toBe(0)
  expect(rl.size).toBe(1)
  expect(rl('b')).toBeGreaterThan(0)
})

it('matches a naive GCRA under random load', () => {
  const opts = { limit: 5, window: 1000, burst: 8, max: Infinity }
  const rl = limito(opts)
  const tats = new Map<number, number>()
  const step = opts.window / opts.limit
  const tau = opts.burst * step

  let seed = 42
  const rand = (n: number) => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed % n
  }

  for (let n = 0; n < 50_000; n++) {
    vi.advanceTimersByTime(rand(20))
    const key = rand(500)
    const cost = 1 + rand(3)
    const t = performance.now()
    const next = Math.max(tats.get(key) ?? t, t) + cost * step
    const wait = next - t - tau
    if (wait <= 0) tats.set(key, next)
    expect(rl(key, cost)).toBe(wait > 0 ? Math.ceil(wait) : 0)
  }
})
