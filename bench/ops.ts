import { mkdir, writeFile } from 'node:fs/promises'
import { bench, group, run, summary } from 'mitata'
import { type Hit, libs, versions } from './libs.ts'

const WINDOW = 60_000
const keys = Array.from({ length: 100_000 }, (_, i) => `user:${i}`)

const scenarios: Record<string, (make: (typeof libs)[string]) => Hit> = {
  'hot key, allowed': (make) => {
    const hit = make(1e9, WINDOW)
    return () => hit('user:1')
  },
  'hot key, blocked': (make) => {
    const hit = make(1, WINDOW)
    hit('user:1')
    return () => hit('user:1')
  },
  '100k rotating keys': (make) => {
    const hit = make(1e6, 1e8)
    let i = 0
    return () => hit(keys[i++ % keys.length]!)
  },
}

const meta: { scenario: string; lib: string }[] = []

for (const [scenario, setup] of Object.entries(scenarios)) {
  group(scenario, () => {
    summary(() => {
      for (const [lib, make] of Object.entries(libs)) {
        const fn = setup(make)
        meta.push({ scenario, lib })
        bench(lib, () => fn(''))
      }
    })
  })
}

const { benchmarks, context } = await run()

const runtime = typeof Bun === 'undefined' ? 'node' : 'bun'
const results = benchmarks.map((b, i) => {
  const s = b.runs[0]!.stats!
  return { ...meta[i]!, avg: s.avg, p99: s.p99, ops: 1e9 / s.avg }
})

await mkdir(new URL('./results', import.meta.url), { recursive: true })
await writeFile(
  new URL(`./results/ops-${runtime}.json`, import.meta.url),
  JSON.stringify(
    {
      runtime: `${runtime} ${runtime === 'bun' ? Bun.version : process.versions.node}`,
      cpu: context.cpu.name,
      arch: context.arch,
      versions,
      results,
    },
    null,
    2,
  ),
)
process.exit(0)
