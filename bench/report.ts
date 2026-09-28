import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { chart, type Panel } from './svg.ts'

const dir = new URL('./results/', import.meta.url)
const load = async (name: string) => JSON.parse(await readFile(new URL(name, dir), 'utf8'))

const save = async (name: string, title: string, note: string, panels: Panel[]) => {
  await writeFile(new URL(`${name}.svg`, dir), chart(title, note, panels, 'light'))
  await writeFile(new URL(`${name}.dark.svg`, dir), chart(title, note, panels, 'dark'))
}

const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1)
const fmtOps = (n: number) => `${(n / 1e6).toFixed(1)}M ops/s`
const fmtBytes = (n: number) => (n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`)

const md: string[] = [
  '# Benchmark results',
  '',
  'All libraries use their in-memory store with the same limit and window.',
  '',
  "- express-rate-limit's `MemoryStore` only counts hits. The limit check lives in its middleware, so it never actually blocks here.",
  '- rate-limiter-flexible and express-rate-limit return promises, and that cost is included.',
  '- rate-limiter-flexible is bundled from `lib/RateLimiterMemory.js`, its smallest import.',
  "- limiter doesn't support keys, so it's a `Map` of `RateLimiter`s.",
  '- In the rotating keys test, keys are still tracked when they come back. A key that comes back after it has fully refilled was already dropped by limito and gets added again, which costs about 100 ns.',
  '',
]

for (const runtime of ['node', 'bun']) {
  const file = `ops-${runtime}.json`
  if (!existsSync(new URL(file, dir))) continue
  const data = await load(file)
  const scenarios = [...new Set<string>(data.results.map((r: { scenario: string }) => r.scenario))]
  const panels = scenarios.map((s) => ({
    title: s,
    rows: data.results
      .filter((r: { scenario: string }) => r.scenario === s)
      .map((r: { lib: string; ops: number }) => ({
        lib: r.lib,
        value: r.ops,
        label: fmtOps(r.ops),
      })),
  }))
  await save(
    `ops-${runtime}`,
    `Throughput on ${cap(data.runtime)}`,
    `Higher is better, ${data.cpu}`,
    panels,
  )

  md.push(`## Throughput on ${cap(data.runtime)}`, '', `${data.cpu} (${data.arch})`, '')
  for (const p of panels) {
    md.push(`### ${p.title}`, '', '| library | ops/s | avg | p99 |', '| --- | ---: | ---: | ---: |')
    for (const r of data.results.filter((r: { scenario: string }) => r.scenario === p.title)) {
      md.push(`| ${r.lib} | ${fmtOps(r.ops)} | ${r.avg.toFixed(1)} ns | ${r.p99.toFixed(1)} ns |`)
    }
    md.push('')
  }
}

type Mem = { lib: string; keys: number; perKey: number }
const mem = await load('memory.json')
const counts = [...new Set<number>(mem.results.map((r: Mem) => r.keys))]
const k = (n: number) => (n >= 1e6 ? `${n / 1e6}M keys` : `${n / 1000}k keys`)
await save(
  'memory',
  'Memory per key',
  `Lower is better, key strings not included, ${cap(mem.runtime)}`,
  counts.map((n) => ({
    title: k(n),
    rows: mem.results
      .filter((r: Mem) => r.keys === n)
      .map((r: Mem) => ({ lib: r.lib, value: r.perKey, label: `${r.perKey.toFixed(0)} B/key` })),
  })),
)
md.push(
  '## Memory',
  '',
  `Heap + ArrayBuffers per unique key on ${cap(mem.runtime)}, not counting the key strings.`,
  '',
  `| library | ${counts.map(k).join(' | ')} |`,
  `| --- |${' ---: |'.repeat(counts.length)}`,
)
for (const lib of new Set<string>(mem.results.map((r: Mem) => r.lib))) {
  const row = counts.map((n) =>
    mem.results.find((r: Mem) => r.lib === lib && r.keys === n).perKey.toFixed(1),
  )
  md.push(`| ${lib} | ${row.join(' | ')} |`)
}
md.push('')

const size = await load('size.json')
await save('size', 'Bundle size', 'Lower is better, minified + brotli', [
  {
    title: '',
    rows: size.results.map((r: { lib: string; brotli: number }) => ({
      lib: r.lib,
      value: r.brotli,
      label: fmtBytes(r.brotli),
    })),
  },
])
md.push(
  '## Bundle size',
  '',
  'Bundled with rolldown, minified, annotation comments stripped (same as size-limit), Node built-ins external.',
  '',
)
md.push('| library | min | gzip | brotli |', '| --- | ---: | ---: | ---: |')
for (const r of size.results)
  md.push(`| ${r.lib} | ${fmtBytes(r.min)} | ${fmtBytes(r.gzip)} | ${fmtBytes(r.brotli)} |`)
md.push('', '## Versions', '', '| library | version |', '| --- | --- |')
for (const [lib, v] of Object.entries(size.versions)) md.push(`| ${lib} | ${v} |`)
md.push('')

await writeFile(new URL('README.md', dir), md.join('\n'))
