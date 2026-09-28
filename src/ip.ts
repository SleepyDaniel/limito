export const ipKey = (ip: string | undefined): string | undefined => {
  if (!ip?.includes(':')) return ip
  let a = ip.toLowerCase().split('%')[0]!
  const v4 = /:(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(a)
  if (v4) {
    const [p, q, r, s] = v4.slice(1).map(Number) as [number, number, number, number]
    if (Math.max(p, q, r, s) > 255) return ip
    a = `${a.slice(0, v4.index + 1)}${(p * 256 + q).toString(16)}:${(r * 256 + s).toString(16)}`
  }

  const n: number[] = []
  let gap = -1
  let v = 0
  let d = 0
  for (let i = 0; i <= a.length; i++) {
    const c = a.charCodeAt(i)
    const h = c > 47 && c < 58 ? c - 48 : c > 96 && c < 103 ? c - 87 : -1
    if (h >= 0) {
      if (++d > 4) return ip
      v = v * 16 + h
      continue
    }
    if (c !== 58 && i < a.length) return ip
    if (d) {
      n.push(v)
      v = d = 0
    } else if (i === a.length) {
      if (gap !== n.length) return ip
    } else if (a[i - 1] === ':') {
      if (gap >= 0) return ip
      gap = n.length
    } else if (i || a[1] !== ':') return ip
  }
  if (gap < 0 ? n.length !== 8 : n.length > 7) return ip
  if (gap >= 0) n.splice(gap, 0, ...Array<number>(8 - n.length).fill(0))

  if (!(n[0]! | n[1]! | n[2]! | n[3]! | n[4]!) && n[5] === 0xffff) {
    return `${n[6]! >> 8}.${n[6]! & 255}.${n[7]! >> 8}.${n[7]! & 255}`
  }
  return `${n[0]!.toString(16)}:${n[1]!.toString(16)}:${n[2]!.toString(16)}:${n[3]!.toString(16)}::/64`
}
