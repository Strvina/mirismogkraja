import { test as base, expect, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
    /** Owner of "Bašta Ivanovića": approved, with no membership and no certificates yet. */
    gardener: { email: 'basta@example.com', password: 'password' },
    admin: { email: 'admin@gmail.com', password: 'admin' },
};

export async function logIn(page: Page, account: { email: string; password: string }): Promise<void> {
    await page.goto('/login');
    await page.getByLabel('Email adresa').fill(account.email);
    await page.getByLabel('Lozinka', { exact: true }).fill(account.password);
    await page.getByRole('button', { name: 'Prijavi se' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

/**
 * Becomes someone else: forgets the session and signs in again. For tests
 * that pass a conversation between roles; signing out through the menu is
 * covered on its own in auth.spec.ts.
 */
export async function switchTo(page: Page, account: { email: string; password: string }): Promise<void> {
    await page.context().clearCookies();
    await logIn(page, account);
}

const mailLog = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'storage', 'logs', 'mail.log');

/** How much mail had been "sent" so far, to look only at what comes after. */
export function mailSentSoFar(): number {
    return existsSync(mailLog) ? readFileSync(mailLog, 'utf8').length : 0;
}

/**
 * The address-confirmation link from the mail the site "sent" after `since`
 * (the test site logs mail to storage/logs/mail.log instead of sending it).
 * The mail goes out after the response, so this waits for it.
 */
export async function verificationLink(since: number): Promise<string> {
    let link = '';

    await expect
        .poll(
            () => {
                const mail = existsSync(mailLog) ? readFileSync(mailLog, 'utf8').slice(since) : '';
                const links = mail.match(/https?:\/\/[^\s"'<>)\]]+\/verify-email\/\d+\/[a-f0-9]+\?[^\s"'<>)\]]+/g);

                // The HTML part of the mail writes "&" as "&amp;".
                link = links ? links[links.length - 1].replaceAll('&amp;', '&') : '';

                return link;
            },
            { message: 'a verification mail in storage/logs/mail.log', timeout: 15_000 },
        )
        .not.toBe('');

    return link;
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
