import { mkdir, rm, writeFile } from 'node:fs/promises'
import { builtinModules } from 'node:module'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import { rolldown } from 'rolldown'
import { versions } from './libs.ts'

const entries: Record<string, string> = {
  limito: `export { limito } from '../dist/index.js'`,
  'rate-limiter-flexible': `export { default } from 'rate-limiter-flexible/lib/RateLimiterMemory.js'`,
  'express-rate-limit': `export { MemoryStore } from 'express-rate-limit'`,
  limiter: `export { RateLimiter } from 'limiter'`,
}

const tmp = new URL('./.size/', import.meta.url)
await mkdir(tmp, { recursive: true })

const results = []
for (const [lib, code] of Object.entries(entries)) {
  const input = new URL(`${lib}.js`, tmp)
  await writeFile(input, code.replace('../dist', '../../dist'))
  const bundle = await rolldown({
    input: input.pathname,
    platform: 'node',
    external: [...builtinModules, /^node:/],
    logLevel: 'silent',
  })
  const { output } = await bundle.generate({
    format: 'esm',
    minify: true,
    comments: { annotation: false },
  })
  const buf = Buffer.from(output[0].code)
  const r = {
    lib,
    min: buf.length,
    gzip: gzipSync(buf, { level: 9 }).length,
    brotli: brotliCompressSync(buf).length,
  }
  console.log(
    `${lib.padEnd(24)} ${String(r.min).padStart(8)} min ${String(r.brotli).padStart(7)} br`,
  )
  results.push(r)
}

await rm(tmp, { recursive: true })
await mkdir(new URL('./results', import.meta.url), { recursive: true })
await writeFile(
  new URL('./results/size.json', import.meta.url),
  JSON.stringify({ versions, results }, null, 2),
)
