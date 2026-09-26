import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/redis.ts'],
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  dts: true,
  minify: true,
})
