import { accounts, expect, mailSentSoFar, switchTo, test, verificationLink } from './fixtures';

/*
 * The whole life of a producer on the site, passed between three people the
 * way it happens for real: someone signs up and confirms their address,
 * registers a producer, an admin approves it, the producer lists a product,
 * a buyer asks about it, the producer answers, the buyer leaves a review, an
 * admin publishes it - and a visitor who is not signed in sees it.
 *
 * Each step depends on the one before, so a break anywhere in the chain
 * stops the test at the step that broke.
 */
test('from sign-up to a published review, across producer, admin and buyer', async ({ page }) => {
    test.setTimeout(240_000);
    // A step that cannot find its button says so quickly, not when the whole test runs out.
    page.setDefaultTimeout(15_000);

    const stamp = Date.now();
    const seller = { email: `nova-${stamp}@example.com`, password: 'lozinka-za-probu-123' };
    const producerName = `Sirana Probna ${stamp}`;
    const productName = `Kozji sir ${stamp}`;

    await test.step('a visitor signs up and confirms their address from the mail', async () => {
        const mailBefore = mailSentSoFar();

        await page.goto('/register');
        await page.getByLabel('Ime').fill('Nova Proizvođačica');
        await page.getByLabel('Email adresa').fill(seller.email);
        await page.getByLabel('Lozinka', { exact: true }).fill(seller.password);
        await page.getByLabel('Potvrda lozinke').fill(seller.password);
        await page.getByRole('button', { name: 'Napravi nalog' }).click();

        // Hashing the password and writing the mail take a moment on the
        // test server, which answers one request at a time.
        await expect(page).toHaveURL(/\/verify-email$/, { timeout: 30_000 });

        // Until the link is clicked, a producer cannot be registered.
        await page.goto('/moji-proizvodjaci/novo');
        await expect(page).toHaveURL(/\/verify-email$/);

        // Confirmed, and taken to where they were headed before being stopped.
        await page.goto(await verificationLink(mailBefore));
        await expect(page).toHaveURL(/\/moji-proizvodjaci\/novo$/);
    });

    await test.step('they register a producer, which waits for approval', async () => {
        await page.goto('/moji-proizvodjaci/novo');
        await page.getByLabel('Naziv proizvođača').fill(producerName);
        await page.getByLabel('Grad').fill('Pirot');
        await page.getByRole('button', { name: 'Dalje' }).click();
        await page.getByLabel('Telefon za kontakt').fill('0641234567');
        await page.getByLabel('Lično preuzimanje').check();
        await page.getByRole('button', { name: 'Dalje' }).click();
        await page.getByLabel('Opis').fill('Kozji i ovčiji sir sa Stare planine, od mleka sa našeg imanja.');
        await page.getByRole('button', { name: 'Dalje' }).click();
        await page.getByRole('button', { name: 'Pošalji na odobrenje' }).click();

        await expect(page).toHaveURL(/\/moji-proizvodjaci$/);
        await expect(page.getByText('Na čekanju odobrenja')).toBeVisible();

        // Not on the site yet.
        await page.goto(`/proizvodjaci?q=${encodeURIComponent(producerName)}`);
        await expect(page.getByRole('link', { name: new RegExp(producerName) })).toHaveCount(0);
    });

    await test.step('an admin approves the producer', async () => {
        await switchTo(page, accounts.admin);
        await page.goto('/admin/proizvodjaci?status=pending');

        const row = page.getByText(producerName, { exact: true }).locator('xpath=ancestor::div[contains(@class, "rounded-lg")][1]');
        await row.getByRole('button', { name: 'Odobri' }).click();
        await expect(row.getByRole('button', { name: 'Odobri' })).toHaveCount(0);
    });

    await test.step('the producer hears about it and lists a product', async () => {
        await switchTo(page, seller);
        await page.goto('/obavestenja');
        await expect(page.getByText('Vaš proizvođač je odobren')).toBeVisible();

        await page.goto('/moji-proizvodjaci');
        await expect(page.getByText('Aktivno', { exact: true })).toBeVisible();
        // The card's own link, not "Proizvodi" in the header or footer.
        await page.locator('main').getByRole('link', { name: 'Proizvodi', exact: true }).click();
        await page.getByRole('link', { name: 'Novi proizvod' }).click();

        await page.getByLabel('Kategorija').selectOption({ index: 1 });
        await page.getByLabel('Naziv proizvoda').fill(productName);
        await page.getByLabel('Cena (RSD)').fill('1200');
        await page.getByLabel('Količina na stanju').fill('5');
        await page.getByLabel('Vidljivost').selectOption('active');
        await page.getByRole('button', { name: 'Kreiraj' }).click();

        await expect(page).toHaveURL(/\/proizvodi$/);
        await expect(page.getByRole('heading', { name: productName })).toBeVisible();
    });

    let producerUrl = '';
    let threadUrl = '';
    const question = `Da li šaljete sir kurirom? (${stamp})`;
    const answer = `Šaljemo, stiže za dva dana. (${stamp})`;
    const opinion = `Sir je stigao brzo i odličan je. (${stamp})`;

    await test.step('a buyer finds the producer and asks about the product', async () => {
        await switchTo(page, accounts.buyer);
        await page.goto(`/proizvodjaci?q=${encodeURIComponent(producerName)}`);
        await page
            .getByRole('link', { name: new RegExp(producerName) })
            .first()
            .click();
        await expect(page.getByRole('heading', { level: 1, name: new RegExp(producerName) })).toBeVisible();
        producerUrl = page.url();

        // No conversation yet, so no review either.
        await expect(page.getByRole('heading', { name: 'Ostavi utisak' })).toHaveCount(0);

        await page.getByRole('link', { name: new RegExp(productName) }).click();
        await expect(page).toHaveURL(/\/proizvod\//);
        await page.getByRole('textbox', { name: 'Poruka proizvođaču' }).fill(question);
        await page.getByRole('button', { name: 'Pošalji upit' }).click();

        await expect(page).toHaveURL(/\/poruke\//);
        await expect(page.getByText(question)).toBeVisible();
        threadUrl = page.url();
    });

    await test.step('the producer sees the inquiry and answers', async () => {
        await switchTo(page, seller);
        await page.goto('/poruke');
        await page.locator('main a[href*="/poruke-proizvodjaca/"]').first().click();
        await expect(page.getByText(question)).toBeVisible();

        await page.getByRole('textbox', { name: 'Poruka', exact: true }).fill(answer);
        await page.getByRole('textbox', { name: 'Poruka', exact: true }).press('Enter');
        await expect(page.getByText(answer)).toBeVisible();

        // Sent, not only drawn: still there after a reload.
        await page.reload();
        await expect(page.getByText(answer)).toBeVisible();
    });

    await test.step('the buyer reads the answer and leaves a review', async () => {
        await switchTo(page, accounts.buyer);
        await page.goto(threadUrl);
        await expect(page.getByText(answer)).toBeVisible();

        await page.goto(producerUrl);
        await expect(page.getByRole('heading', { name: 'Ostavi utisak' })).toBeVisible();
        await page.getByLabel('Vaša ocena').selectOption('4');
        await page.getByRole('textbox', { name: 'Vaš utisak' }).fill(opinion);
        await page.getByRole('button', { name: 'Pošalji utisak' }).click();

        // The author sees it at once, marked as waiting.
        await expect(page.getByText(opinion)).toBeVisible();
        await expect(page.getByText(/Čekamo odobrenje/)).toBeVisible();
    });

    await test.step('nobody else sees the review until an admin publishes it', async () => {
        await page.context().clearCookies();
        await page.goto(producerUrl);
        await expect(page.getByText(opinion)).toHaveCount(0);

        await switchTo(page, accounts.admin);
        await page.goto('/admin/utisci');
        const row = page.getByText(opinion).locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]');
        await row.getByRole('button', { name: 'Objavi' }).click();
        await expect(page.getByText(opinion)).toHaveCount(0);
    });

    await test.step('a visitor who is not signed in reads it on the producer page', async () => {
        await page.context().clearCookies();
        await page.goto(producerUrl);
        await expect(page.getByRole('heading', { name: 'Utisci kupaca' })).toBeVisible();
        await expect(page.getByText(opinion)).toBeVisible();
    });
});
