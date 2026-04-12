import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.nuxt', '.output'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '.nuxt/',
        '.output/',
        '**/*.d.ts',
        '**/*.config.*',
        'test/**',
        '**/*.test.*',
        '**/*.spec.*'
      ]
    },
    passWithNoTests: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.')
    }
  }
})
