import { defineConfig, devices } from '@playwright/test';

/*
 * Browser tests of the main journeys (e2e/). Run with `npm run test:e2e`
 * after `npm run build`: the tests use the built assets, on a site of
 * their own with its own database (see e2e/serve.mjs).
 */
const port = process.env.E2E_PORT ?? '8123';

export default defineConfig({
    testDir: './e2e',
    // One PHP server and one database: tests run one after another.
    workers: 1,
    fullyParallel: false,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: `http://127.0.0.1:${port}`,
        // The site answers a browser in its own language; these read it in Serbian.
        locale: 'sr-RS',
        trace: 'retain-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } }],
    webServer: {
        command: 'node e2e/serve.mjs',
        url: `http://127.0.0.1:${port}/up`,
        reuseExistingServer: false,
        timeout: 180_000,
        stdout: 'ignore',
        stderr: 'pipe',
    },
});
