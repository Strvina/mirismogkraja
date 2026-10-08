/**
 * Runs before every test file: the matchers, the stand-ins for Inertia and
 * Ziggy, the missing pieces of the browser, and a clean slate after each
 * test.
 */
import { answer } from '@/lib/confirm';
import { loadLocale } from '@/lib/i18n';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, vi, type MockInstance } from 'vitest';
import { installBrowser, resetBrowser } from './browser';
import { resetInertia } from './inertia';
import { route } from './route';

// Every import of Inertia in the code under test gets the stand-in. Only
// what the application uses is offered, so a new import fails loudly here
// instead of quietly reaching the real router.
vi.mock('@inertiajs/react', async () => {
    const { Head, Link, router, useForm, usePage, usePoll } = await import('./inertia');

    return { Head, Link, router, useForm, usePage, usePoll };
});

// Assigned rather than stubbed, so a test that unstubs its own globals does
// not take route() away with them.
Object.assign(globalThis, { route });
installBrowser();

// Testing Library waits on a real timer after every user action and inside
// waitFor(); under fake timers it moves the clock itself, but only through a
// global called `jest`. Without this a click under vi.useFakeTimers() hangs.
Object.assign(globalThis, { jest: { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) } });

let consoleError: MockInstance<typeof console.error>;

beforeEach(() => {
    // React reports a state update outside act(), an unknown DOM attribute
    // or a missing key through console.error, and jsdom reports what it has
    // not implemented the same way. Either one fails the test.
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(async () => {
    cleanup();
    // A question left open would greet the next test's dialog host.
    answer(false);

    const reported = consoleError.mock.calls.map((call) => call.map(String).join(' '));

    consoleError.mockRestore();
    vi.useRealTimers();
    resetInertia();
    resetBrowser();
    await loadLocale('sr');

    expect(reported, 'console.error was called during the test').toEqual([]);
});
