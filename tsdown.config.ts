import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/redis.ts', 'src/hono.ts', 'src/express.ts'],
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  dts: true,
  minify: true,
})
