import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/*
 * Tests of the React code (resources/js/__tests__). Run with `npm test`.
 *
 * A configuration of its own rather than vite.config.js: the tests need
 * neither the Laravel plugin nor Tailwind, and the build must never pick up
 * anything meant for tests.
 *
 * The tests live in one tree that mirrors resources/js, not beside the
 * files they test: app.tsx bundles every .tsx under pages/, so a test file
 * placed there would be shipped to visitors.
 */
export default defineConfig({
    resolve: {
        alias: { '@': fileURLToPath(new URL('./resources/js', import.meta.url)) },
    },
    esbuild: {
        jsx: 'automatic',
    },
    test: {
        environment: 'jsdom',
        // Building a jsdom window is most of what a test file costs; this
        // builds one per worker instead of one per file, and still gives
        // every file its own modules and globals.
        pool: 'vmThreads',
        // Only this tree: the browser tests in e2e/ belong to Playwright.
        include: ['resources/js/__tests__/**/*.test.{ts,tsx}'],
        setupFiles: ['resources/js/__tests__/support/setup.ts'],
        // Dates are shown in the reader's own time zone, so the tests fix one.
        env: { TZ: 'Europe/Belgrade' },
        restoreMocks: true,
    },
});
