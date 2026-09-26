export interface Row {
  lib: string
  value: number
  label: string
}

export interface Panel {
  title: string
  rows: Row[]
}

const themes = {
  light: { text: '#0b0b0b', muted: '#52514e', accent: '#2a78d6', bar: '#c3c2b7', grid: '#e4e3df' },
  dark: { text: '#ffffff', muted: '#c3c2b7', accent: '#3987e5', bar: '#5d5c57', grid: '#383835' },
}

const W = 720
const LABEL = 180
const VALUE = 110
const ROW = 30
const BAR = 18
const HEAD = 34
const GAP = 18

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const bar = (x: number, y: number, w: number, h: number) => {
  if (w <= 4) return `M${x} ${y}h${w}v${h}h${-w}z`
  return `M${x} ${y}h${w - 4}a4 4 0 0 1 4 4v${h - 8}a4 4 0 0 1-4 4h${-(w - 4)}z`
}

export const chart = (
  title: string,
  note: string,
  panels: Panel[],
  theme: keyof typeof themes,
): string => {
  const c = themes[theme]
  const span = W - LABEL - VALUE
  let y = 64
  const body: string[] = []

  for (const p of panels) {
    if (panels.length > 1) {
      body.push(`<text x="0" y="${y + 14}" class="h">${esc(p.title)}</text>`)
      y += HEAD
    }
    const max = Math.max(...p.rows.map((r) => r.value))
    for (const r of p.rows) {
      const w = Math.max((r.value / max) * span, 2)
      const mid = y + ROW / 2
      const me = r.lib === 'limito'
      body.push(
        `<text x="${LABEL - 14}" y="${mid}" class="${me ? 'l me' : 'l'}" text-anchor="end">${esc(r.lib)}</text>`,
        `<path d="${bar(LABEL, mid - BAR / 2, w, BAR)}" fill="${me ? c.accent : c.bar}"/>`,
        `<text x="${LABEL + w + 8}" y="${mid}" class="${me ? 'v me' : 'v'}">${esc(r.label)}</text>`,
      )
      y += ROW
    }
    y += GAP
  }

  const h = y - GAP + 8
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif">
<style>
text{dominant-baseline:central;fill:${c.muted};font-size:13px}
.t{fill:${c.text};font-size:18px;font-weight:600}
.n{font-size:13px}
.h{fill:${c.text};font-size:14px;font-weight:600}
.v{font-variant-numeric:tabular-nums}
.me{fill:${c.text};font-weight:600}
</style>
<text x="0" y="14" class="t">${esc(title)}</text>
<text x="0" y="38" class="n">${esc(note)}</text>
<line x1="${LABEL}" x2="${LABEL}" y1="56" y2="${h - 8}" stroke="${c.grid}"/>
${body.join('\n')}
</svg>
`
}
