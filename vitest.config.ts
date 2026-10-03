import { mergeConfig } from 'vite'
import { defineConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

/**
 * Unit tests reuse the app's Vite config (React plugin, `@` alias, plain
 * `node_modules` resolution) so a change there can never let tests and the real
 * build drift apart. Only the test runner bits are added on top.
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      restoreMocks: true,
      clearMocks: true,
      // Component styles are Tailwind classes applied at build time; running
      // them through PostCSS in every test would only slow the suite down.
      css: false,
    },
  }),
)
