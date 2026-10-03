/*
 * The site as the browser tests see it (playwright.config.ts starts this).
 *
 * Its own SQLite database, rebuilt and filled with the demo content on
 * every run, and the built assets - never the developer's database, and
 * never the Vite dev server, even if `composer dev` is running alongside.
 * Every setting a developer's .env might carry that would change behaviour
 * (robot check, push, mail) is set here, and these win over .env.
 */
import { spawn, spawnSync } from 'node:child_process';
import { closeSync, openSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const database = path.join(root, 'storage', 'e2e.sqlite');
const port = process.env.E2E_PORT ?? '8123';

const env = {
    ...process.env,
    APP_ENV: 'local',
    APP_DEBUG: 'true',
    APP_E2E: 'true',
    APP_URL: `http://127.0.0.1:${port}`,
    DB_CONNECTION: 'sqlite',
    DB_DATABASE: database,
    SESSION_DRIVER: 'file',
    CACHE_STORE: 'file',
    QUEUE_CONNECTION: 'sync',
    MAIL_MAILER: 'log',
    TURNSTILE_SITE_KEY: '',
    TURNSTILE_SECRET_KEY: '',
    VAPID_PUBLIC_KEY: '',
    VAPID_PRIVATE_KEY: '',
    SENTRY_LARAVEL_DSN: '',
    // Linux only: answer several requests at once, as a real server would.
    PHP_CLI_SERVER_WORKERS: '4',
};

const php = process.env.PHP_BINARY ?? 'php';

rmSync(database, { force: true });
closeSync(openSync(database, 'w'));

const seeded = spawnSync(php, ['artisan', 'migrate:fresh', '--seed', '--force'], { cwd: root, env, stdio: 'inherit' });

if (seeded.status !== 0) {
    process.exit(seeded.status ?? 1);
}

// Laravel's router script for the built-in server looks for index.php in
// the directory it is started from, so that has to be public/.
const router = path.join(root, 'vendor', 'laravel', 'framework', 'src', 'Illuminate', 'Foundation', 'resources', 'server.php');
const server = spawn(php, ['-S', `127.0.0.1:${port}`, router], {
    cwd: path.join(root, 'public'),
    env,
    stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
        server.kill();
        process.exit(0);
    });
}

server.on('exit', (code) => process.exit(code ?? 0));
