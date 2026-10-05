import { accounts, clickNav, expect, logIn, test } from './fixtures';

test("a producer's page leads to their price list, markets and certificates", async ({ page }) => {
    await page.goto('/proizvodjaci?q=medovina');
    await page
        .getByRole('link', { name: /Pčelinjak Medovina/ })
        .first()
        .click();
    await expect(page.getByRole('heading', { level: 1, name: /Pčelinjak Medovina/ })).toBeVisible();

    // What the producer added around their products (DemoContentSeeder).
    await expect(page.getByRole('heading', { name: 'Gde me nađete' })).toBeVisible();
    await expect(page.getByText('Pijaca Kalča')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sertifikati i priznanja' })).toBeVisible();
    await expect(page.getByText('Sertifikat za organsku proizvodnju meda')).toBeVisible();

    await page.getByRole('link', { name: 'Ponuda i cene na jednom mestu' }).click();
    await expect(page).toHaveURL(/\/katalog\//);
    await expect(page.getByRole('heading', { level: 1, name: /Pčelinjak Medovina/ })).toBeVisible();
    // A price list: every row carries a price in dinars.
    await expect(page.locator('main li a[href*="/proizvod/"]').first()).toContainText('RSD');
});

test('stories and recipes can be browsed and read', async ({ page }) => {
    await page.goto('/');
    await clickNav(page, 'Priče i recepti', /\/price$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Priče i recepti' })).toBeVisible();

    await page.getByRole('link', { name: 'Recepti', exact: true }).click();
    await expect(page).toHaveURL(/vrsta=recept/);
    await expect(page.getByText('Kako se suši leskovačka pršuta')).toHaveCount(0);

    await page.getByRole('link', { name: /Proja sa mladim sirom/ }).click();
    await expect(page).toHaveURL(/\/price\/proja-sa-mladim-sirom/);
    await expect(page.getByRole('heading', { name: 'Sastojci' })).toBeVisible();
    await expect(page.getByText('300 g mladog sira')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Upoznaj proizvođača' })).toBeVisible();
});

test('a producer adds a market from the dashboard menu', async ({ page }) => {
    await logIn(page, accounts.producer);
    await page.goto('/moji-proizvodjaci');

    await page.getByRole('button', { name: 'Više' }).click();
    await page.getByRole('menuitem', { name: 'Gde me nađete' }).click();
    await expect(page).toHaveURL(/\/pijace$/);
    await expect(page.getByText('Zelena pijaca Leskovac, tezga 14')).toBeVisible();

    const name = `Pijaca Probna ${Date.now()}`;
    await page.getByLabel('Naziv mesta').fill(name);
    // Without a day the form comes back with a sentence, not a broken page.
    await page.getByRole('button', { name: 'Dodaj mesto' }).click();
    await expect(page.getByText('Izaberite bar jedan dan.')).toBeVisible();

    await page.getByRole('button', { name: 'Subota' }).click();
    await page.getByRole('button', { name: 'Dodaj mesto' }).click();
    await expect(page.getByText(name)).toBeVisible();
    await expect(page.getByLabel('Naziv mesta')).toHaveValue('');
});

test('a producer drops a saved answer into a conversation', async ({ page }) => {
    await logIn(page, accounts.producer);
    await page.goto('/poruke');
    await page.locator('main a[href*="/poruke-proizvodjaca/"]').first().click();
    await expect(page).toHaveURL(/\/poruke-proizvodjaca\//);

    await page.getByRole('button', { name: 'Brzi odgovori' }).click();
    await page.getByRole('menuitem', { name: /Dostava/ }).click();

    // Written into the box to be read over - not sent.
    await expect(page.getByRole('textbox', { name: 'Poruka', exact: true })).toHaveValue(/Šaljemo kurirskom službom/);
});
