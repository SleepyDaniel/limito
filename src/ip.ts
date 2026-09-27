export const ipKey = (ip: string | undefined): string | undefined => {
  if (!ip?.includes(':')) return ip
  let a = ip.toLowerCase().split('%')[0]!
  const v4 = /:(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(a)
  if (v4) {
    const [p, q, r, s] = v4.slice(1).map(Number) as [number, number, number, number]
    if (Math.max(p, q, r, s) > 255) return ip
    a = `${a.slice(0, v4.index + 1)}${(p * 256 + q).toString(16)}:${(r * 256 + s).toString(16)}`
  }

  const [h, t, x] = a.split('::')
  const head = h ? h.split(':') : []
  const rest = t ? t.split(':') : []
  const fill = t === undefined ? 0 : 8 - head.length - rest.length
  const all = [...head, ...Array<string>(Math.max(fill, 0)).fill('0'), ...rest]
  if (x !== undefined || (t !== undefined && fill < 1) || all.length !== 8) return ip
  if (!all.every((g) => /^[\da-f]{1,4}$/.test(g))) return ip

  const n = all.map((g) => parseInt(g, 16))
  if (!(n[0]! | n[1]! | n[2]! | n[3]! | n[4]!) && n[5] === 0xffff) {
    return `${n[6]! >> 8}.${n[6]! & 255}.${n[7]! >> 8}.${n[7]! & 255}`
  }
  return `${n
    .slice(0, 4)
    .map((g) => g.toString(16))
    .join(':')}::/64`
}
