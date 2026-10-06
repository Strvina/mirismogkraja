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

    // The producer's page: the number only on request, the map only on request.
    await expect(page.getByRole('heading', { level: 1, name: /Pčelinjak Medovina/ })).toBeVisible();
    await page.getByRole('button', { name: 'Prikaži broj' }).click();
    await expect(page.locator('a[href^="tel:"]')).toBeVisible();
    await page.getByRole('button', { name: 'Prikaži na mapi' }).click();
    await expect(page.locator('.leaflet-container')).toBeVisible();
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

    // A follow-up from the conversation itself: shown at once, and still
    // there once the server has it.
    const followUp = `I još nešto: da li šaljete kurirom? (${Date.now()})`;
    await page.getByRole('textbox', { name: 'Poruka', exact: true }).fill(followUp);
    await page.getByRole('textbox', { name: 'Poruka', exact: true }).press('Enter');
    await expect(page.getByText(followUp)).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Poruka', exact: true })).toHaveValue('');

    await page.reload();
    await expect(page.getByText(followUp)).toBeVisible();
    await expect(page.getByText('Nije poslato')).toHaveCount(0);
});

test('a category has its own page', async ({ page }) => {
    await page.goto('/');
    await page.locator('a[href*="/kategorija/"]').first().click();

    await expect(page).toHaveURL(/\/kategorija\//);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('a page keeps the title the server wrote once it has loaded', async ({ page }) => {
    // Several pages, each loaded twice: more than one test's usual time.
    test.slow();

    // Search engines read the first HTML and then run the page: one that
    // renames itself in the browser is listed under a title nobody wrote.
    const written = async (path: string) => {
        const html = await (await page.request.get(path)).text();

        return html.match(/<title inertia>([^<]*)<\/title>/)![1];
    };

    for (const path of ['/', '/mesto/nis', '/osnivaci']) {
        await page.goto(path);
        await expect(page, path).toHaveTitle(await written(path));
    }

    // A product's title names its producer, which the page itself never did.
    await page.goto('/proizvodi');
    const product = (await page.locator('main a[href*="/proizvod/"]').first().getAttribute('href'))!;
    await page.goto(product);
    await expect(page).toHaveTitle(await written(product));

    // Arrived at by a click, not a page load: still the server's title.
    await page.getByRole('banner').getByRole('link', { name: 'Proizvodi', exact: true }).click();
    await expect(page).toHaveTitle('Proizvodi | Vrelina juga');

    // A page the server gives no title to is titled by itself, with the site's name.
    await page.goto('/login');
    await expect(page).toHaveTitle(/^Prijava - /);
});
