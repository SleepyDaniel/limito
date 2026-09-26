export type Key = string | number

const MIN = 64

export class Store {
  keys: Map<Key, number> = new Map()
  tats: Float64Array
  len = 0
  sweep = 0

  constructor(
    readonly max: number,
    readonly ttl: number,
  ) {
    this.tats = new Float64Array(Math.min(MIN, max))
  }

  add(key: Key, tat: number, now: number): void {
    const full = this.len === this.tats.length
    if (full || now >= this.sweep) this.compact(now, full)
    this.keys.set(key, this.len)
    this.tats[this.len++] = tat
  }

  compact(now: number, full: boolean): void {
    const { keys, tats: old, max } = this
    for (const [k, i] of keys) if (old[i]! <= now) keys.delete(k)

    let cap = old.length
    while (keys.size > cap * 0.75 && cap < max) cap = Math.min(cap * 2, max)
    while (cap > MIN && keys.size < cap / 4) cap >>= 1

    let drop = full ? keys.size - Math.floor(cap * 0.75) : 0
    const tats = new Float64Array(cap)
    let n = 0
    for (const [k, i] of keys) {
      if (drop-- > 0) keys.delete(k)
      else {
        tats[n] = old[i]!
        keys.set(k, n++)
      }
    }
    this.tats = tats
    this.len = n
    this.sweep = now + this.ttl
  }

  clear(): void {
    this.keys.clear()
    this.len = 0
  }
}
