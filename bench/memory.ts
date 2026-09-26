import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { libs, versions } from './libs.ts'

const N = 1_000_000
const lib = process.argv[2]

const used = () => {
  globalThis.gc!()
  globalThis.gc!()
  const m = process.memoryUsage()
  return m.heapUsed + m.arrayBuffers
}

if (lib) {
  const keys = Array.from({ length: N }, (_, i) => `user:${i}`)
  const hit = libs[lib]!(10, 3_600_000)
  const before = used()
  for (const k of keys) {
    const r = hit(k)
    if (r instanceof Promise) await r
  }
  const after = used()
  hit('')
  console.log(JSON.stringify((after - before) / N))
  process.exit(0)
}

const results = Object.keys(libs).map((name) => {
  const out = execFileSync(
    process.execPath,
    ['--expose-gc', fileURLToPath(import.meta.url), name],
    {
      encoding: 'utf8',
    },
  )
  const perKey = JSON.parse(out) as number
  console.log(`${name.padEnd(24)} ${perKey.toFixed(1).padStart(8)} B/key`)
  return { lib: name, perKey }
})

await mkdir(new URL('./results', import.meta.url), { recursive: true })
await writeFile(
  new URL('./results/memory.json', import.meta.url),
  JSON.stringify({ runtime: `node ${process.versions.node}`, keys: N, versions, results }, null, 2),
)
