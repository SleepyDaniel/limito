const units = { ms: 1, s: 1e3, m: 6e4, h: 36e5, d: 864e5 }

export type Duration = number | `${number}${keyof typeof units}`

export const toMs = (d: Duration): number => {
  if (typeof d === 'number') return d
  const m = /^(.+?)(ms|[smhd])$/.exec(d)
  if (!(m && +m[1]! >= 0)) throw new TypeError(`limito: bad window ${d}`)
  return +m[1]! * units[m[2] as keyof typeof units]
}
