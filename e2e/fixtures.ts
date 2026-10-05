import { test as base, expect, type Page } from '@playwright/test';

/*
 * Every test fails if the page throws - an uncaught error or a rejected
 * promise nobody handled. That is how the "links stop working after
 * login" bug showed itself: no broken page, just an error in the console
 * and every later click silently doing nothing.
 */
export const test = base.extend<{ jsErrors: string[] }>({
    jsErrors: [
        async ({ page }, use) => {
            const errors: string[] = [];

            page.on('pageerror', (error) => errors.push(error.message));
            page.on('console', (message) => {
                // Missing demo photos (no storage link in the test site) are not the app's fault.
                if (message.type() === 'error' && !message.text().includes('Failed to load resource')) {
                    errors.push(message.text());
                }
            });

            await use(errors);

            expect(errors, 'JavaScript errors on the page').toEqual([]);
        },
        { auto: true },
    ],
});

export { expect };

/** Demo accounts from DemoContentSeeder. */
export const accounts = {
    buyer: { email: 'marko@example.com', password: 'password' },
    /** Owner of "Domaćinstvo Nićić": markets, quick replies and a story of its own. */
    producer: { email: 'nicic@example.com', password: 'password' },
    admin: { email: 'admin@gmail.com', password: 'admin' },
};

export async function logIn(page: Page, account: { email: string; password: string }): Promise<void> {
    await page.goto('/login');
    await page.getByLabel('Email adresa').fill(account.email);
    await page.getByLabel('Lozinka', { exact: true }).fill(account.password);
    await page.getByRole('button', { name: 'Prijavi se' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

export async function logOut(page: Page): Promise<void> {
    // The header's account menu ("Marko Meni"), not "Najbliži meni" further down.
    await page.getByRole('banner').getByRole('button', { name: /Meni$/ }).click();
    await page.getByRole('menuitem', { name: 'Odjava' }).click();
    await page.waitForURL((url) => url.pathname === '/');
}

/** Follows a link the way a visitor does, and waits for the page it leads to. */
export async function clickNav(page: Page, name: string, path: RegExp): Promise<void> {
    await page.getByRole('navigation', { name: 'Glavna navigacija' }).getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(path);
}
