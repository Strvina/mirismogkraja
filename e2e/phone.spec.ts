import { devices, type CDPSession, type Page } from '@playwright/test';
import { accounts, expect, logIn, test } from './fixtures';

/*
 * A phone, with a finger: menus and panels that hold the page still while
 * they are open and let it go after, wherever the page had been scrolled.
 *
 * Drags are real touch events (Chromium's), since what broke was the
 * browser deciding whether a drag scrolls the menu or the page under it.
 */
test.use({ ...devices['iPhone 13'], browserName: 'chromium' });

async function finger(page: Page): Promise<(x: number, y: number, dy: number) => Promise<void>> {
    const cdp: CDPSession = await page.context().newCDPSession(page);

    return async (x, y, dy) => {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let step = 1; step <= 12; step++) {
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + (dy * step) / 12 }] });
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        // Let a fling settle: a tap during one only stops it, on a phone too.
        await page.waitForTimeout(900);
    };
}

const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY));
const pageHeld = (page: Page) => page.evaluate(() => getComputedStyle(document.documentElement).overflowY === 'hidden');

test('the phone menu holds the page while open and lets it go after, also once the page has been scrolled', async ({ page }) => {
    await logIn(page, accounts.admin);
    const drag = await finger(page);
    const menuButton = page.locator('header').getByRole('button', { name: /Meni/ });
    const menu = page.getByRole('menu');

    await page.goto('/proizvodi');

    for (const moment of ['fresh', 'scrolled', 'after navigating']) {
        if (moment === 'scrolled') {
            await drag(180, 500, -400);
        }
        if (moment === 'after navigating') {
            await menuButton.click();
            await page.getByRole('menuitem', { name: 'Proizvođači', exact: true }).click();
            await page.waitForURL(/\/proizvodjaci/);
            await drag(180, 500, -300);
        }

        const at = await scrollY(page);
        await menuButton.click();
        await expect(menu, moment).toBeVisible();
        const box = (await menu.boundingBox())!;

        // In view under the header, wherever the page is.
        expect(box.y, moment).toBeLessThan(120);
        expect(await pageHeld(page), moment).toBe(true);

        // A drag on the menu scrolls the menu, never the page.
        await drag(box.x + box.width / 2, box.y + box.height * 0.6, -200);
        await drag(box.x + box.width / 2, box.y + box.height * 0.4, 250);
        expect(await scrollY(page), moment).toBe(at);

        // A drag beside it closes it and does not move the page either.
        await drag(20, Math.min(box.y + box.height + 40, 600), -200);
        await expect(menu, moment).toBeHidden();
        expect(await scrollY(page), moment).toBe(at);

        // Let go: the page scrolls again.
        expect(await pageHeld(page), moment).toBe(false);
        await drag(180, 450, -150);
        expect(await scrollY(page), moment).toBeGreaterThan(at);
    }

    // Opened and closed over and over, nothing is left behind.
    for (let round = 0; round < 6; round++) {
        await menuButton.click();
    }
    await expect(menu).toBeHidden();
    expect(await pageHeld(page)).toBe(false);
});

test('the admin menu on a phone scrolls by itself, reaches its last link, and leaves the page in place', async ({ page }) => {
    await logIn(page, accounts.admin);
    const drag = await finger(page);

    await page.goto('/admin/proizvodi');
    await drag(180, 450, -300);
    const at = await scrollY(page);

    await page.getByRole('button', { name: 'Admin meni' }).click();
    const menu = page.locator('#admin-menu');
    await expect(menu).toBeVisible();
    expect(await pageHeld(page)).toBe(true);
    // It used to fold into the sticky header and push the page down by its height.
    expect(await scrollY(page)).toBe(at);

    const box = (await menu.boundingBox())!;
    await drag(box.x + box.width / 2, box.y + box.height * 0.7, -500);
    expect(await menu.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    expect(await scrollY(page)).toBe(at);

    const logout = page.getByRole('button', { name: 'Odjava' });
    const bottom = (await logout.boundingBox())!;
    expect(bottom.y + bottom.height).toBeLessThanOrEqual(page.viewportSize()!.height);

    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    expect(await pageHeld(page)).toBe(false);
});

test('a dialog over a scrolled page leaves the page and its header where they were', async ({ page }) => {
    await page.goto('/proizvodi');
    await page.evaluate(() => window.scrollTo(0, 900));
    const at = await scrollY(page);

    // A product opened over the list.
    await page
        .locator('main a[href*="/proizvod/"]')
        .nth(4)
        .evaluate((link: HTMLElement) => link.click());
    await expect(page.getByRole('dialog')).toBeVisible();

    expect(await scrollY(page)).toBe(at);
    expect(
        await page
            .locator('header')
            .first()
            .evaluate((header) => Math.round(header.getBoundingClientRect().top)),
    ).toBe(0);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    expect(await scrollY(page)).toBe(at);
});

test('"Pronađi domaće" on the home page leads to the products', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Pronađi domaće' }).click();

    await expect(page).toHaveURL(/\/proizvodi$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Proizvodi' })).toBeVisible();
});

test('the hero photo shows its subject above the words on a phone', async ({ page }) => {
    await page.goto('/');
    const photo = page.locator('main section').first().locator('img').first();
    const heading = page.getByRole('heading', { level: 1 });

    const picture = (await photo.boundingBox())!;
    const title = (await heading.boundingBox())!;

    // The photo is a band of its own, and the heading starts in its lower part at the latest.
    expect(picture.height).toBeGreaterThan(250);
    expect(title.y).toBeGreaterThan(picture.y + picture.height * 0.6);
    // Cut, never stretched.
    expect(await photo.evaluate((image) => getComputedStyle(image).objectFit)).toBe('cover');
});
