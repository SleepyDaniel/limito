import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      include: ['src'],
      thresholds: { 100: true },
    },
  },
})
