import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { libs, versions } from './libs.ts'

const COUNTS = [100_000, 300_000, 1_000_000]
const [, , lib, n] = process.argv

const used = () => {
  globalThis.gc!()
  globalThis.gc!()
  const m = process.memoryUsage()
  return m.heapUsed + m.arrayBuffers
}

if (lib) {
  const N = Number(n)
  const keys = Array.from({ length: N }, (_, i) => `user:${i}`)
  const hit = libs[lib]!(10, 3_600_000)
  const before = used()
  for (const k of keys) {
    const r = hit(k)
    if (r instanceof Promise) await r
  }
  const after = used()
  hit(keys[0]!)
  console.log(JSON.stringify((after - before) / N))
  process.exit(0)
}

const results = COUNTS.flatMap((keys) =>
  Object.keys(libs).map((name) => {
    const out = execFileSync(
      process.execPath,
      ['--expose-gc', fileURLToPath(import.meta.url), name, String(keys)],
      { encoding: 'utf8' },
    )
    const perKey = JSON.parse(out) as number
    console.log(
      `${String(keys).padStart(8)} ${name.padEnd(24)} ${perKey.toFixed(1).padStart(8)} B/key`,
    )
    return { lib: name, keys, perKey }
  }),
)

await mkdir(new URL('./results', import.meta.url), { recursive: true })
await writeFile(
  new URL('./results/memory.json', import.meta.url),
  JSON.stringify({ runtime: `node ${process.versions.node}`, versions, results }, null, 2),
)
