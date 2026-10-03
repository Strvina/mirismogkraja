import { accounts, expect, logIn, test } from './fixtures';

test('a visitor searches from the header and finds the producer by name', async ({ page }) => {
    await page.goto('/');

    // Demo product names are random; producer names are fixed (DemoContentSeeder).
    const search = page.getByRole('banner').getByRole('searchbox');
    await search.fill('medovina');
    await search.press('Enter');

    await expect(page).toHaveURL(/\/proizvodi\?q=medovina/);
    await expect(page.getByText('Rezultati za „medovina”')).toBeVisible();
    await page.getByRole('link', { name: /Pčelinjak Medovina/ }).click();
    await expect(page).toHaveURL(/\/proizvodjac\//);
});

test('a buyer sends an inquiry from a product page and lands in the conversation', async ({ page }) => {
    await logIn(page, accounts.buyer);
    await page.goto('/proizvodi?in_stock=1');
    await page.locator('main a[href*="/proizvod/"]').first().click();
    await expect(page).toHaveURL(/\/proizvod\//);

    const message = `Da li imate ovo na stanju? (${Date.now()})`;
    await page.getByRole('textbox', { name: 'Poruka proizvođaču' }).fill(message);
    await page.getByRole('button', { name: 'Pošalji upit' }).click();

    await expect(page).toHaveURL(/\/poruke\//);
    await expect(page.getByText(message)).toBeVisible();
});

test('a category has its own page', async ({ page }) => {
    await page.goto('/');
    await page.locator('a[href*="/kategorija/"]').first().click();

    await expect(page).toHaveURL(/\/kategorija\//);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
