import { accounts, expect, switchTo, test } from './fixtures';

/*
 * Things a producer starts and someone else finishes: a payment the admin
 * confirms, a document the admin checks, a link a newcomer opens, a recipe a
 * visitor reads. Each is followed to the other side.
 */

test('a membership goes from choosing a plan to active once the admin confirms the payment', async ({ page }) => {
    page.setDefaultTimeout(15_000);

    await switchTo(page, accounts.gardener);
    await page.goto('/clanarina');

    // The slip opens at once: paying is the only step left for the producer.
    const premium = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Premium', exact: true }) });
    await premium.getByRole('button', { name: 'Izaberi paket' }).click();
    await expect(page.getByText('Nalog za uplatu')).toBeVisible();
    await page.getByRole('button', { name: 'Zatvori' }).first().click();
    await expect(page.getByRole('heading', { name: 'Čeka se uplata' })).toBeVisible();

    await switchTo(page, accounts.admin);
    await page.goto('/admin/clanarine?status=pending_payment');
    const confirm = page.getByRole('button', { name: 'Uplata primljena' });
    const row = page.locator('div').filter({ hasText: 'Bašta Ivanovića' }).filter({ has: confirm }).last();
    await row.getByRole('button', { name: 'Uplata primljena' }).click();
    await expect(page.getByText('Bašta Ivanovića')).toHaveCount(0);

    await switchTo(page, accounts.gardener);
    await page.goto('/obavestenja');
    await expect(page.getByText('Članarina je aktivirana').first()).toBeVisible();
    await page.goto('/clanarina');
    await expect(page.getByText('Aktivan paket:')).toContainText('Premium');
    await expect(page.getByRole('heading', { name: 'Čeka se uplata' })).toHaveCount(0);
});

test('a certificate shows on the profile only after the admin has confirmed it', async ({ page }) => {
    page.setDefaultTimeout(15_000);

    const title = `Sertifikat za organsko povrće ${Date.now()}`;

    await switchTo(page, accounts.gardener);
    await page.goto('/moji-proizvodjaci');
    await page.getByRole('button', { name: 'Više' }).click();
    await page.getByRole('menuitem', { name: 'Sertifikati' }).click();
    await expect(page).toHaveURL(/\/sertifikati$/);

    await page.getByLabel('Naziv, kako će pisati na profilu').fill(title);
    await page.getByLabel('Dokument').setInputFiles({
        name: 'sertifikat.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n'),
    });
    await page.getByRole('button', { name: 'Pošalji na proveru' }).click();
    await expect(page.getByText(title)).toBeVisible();
    await expect(page.getByText('Čeka proveru')).toBeVisible();

    // Waiting is not public.
    await page.context().clearCookies();
    await page.goto('/proizvodjaci?q=ivanovi');
    await page
        .getByRole('link', { name: /Bašta Ivanovića/ })
        .first()
        .click();
    await expect(page.getByRole('heading', { level: 1, name: /Bašta Ivanovića/ })).toBeVisible();
    const profile = page.url();
    await expect(page.getByText(title)).toHaveCount(0);

    await switchTo(page, accounts.admin);
    await page.goto('/admin/sertifikati');
    const row = page.getByText(title).locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]');
    await row.getByRole('button', { name: 'Potvrdi' }).click();
    await expect(page.getByText(title)).toHaveCount(0);

    await page.context().clearCookies();
    await page.goto(profile);
    await expect(page.getByRole('heading', { name: 'Sertifikati i priznanja' })).toBeVisible();
    await expect(page.getByText(title)).toBeVisible();
});

test("a producer's referral link tells the newcomer who recommended them", async ({ page }) => {
    page.setDefaultTimeout(15_000);

    await switchTo(page, accounts.producer);
    await page.goto('/moji-proizvodjaci');
    await page.getByRole('button', { name: 'Više' }).click();
    await page.getByRole('menuitem', { name: 'Preporuči proizvođača' }).click();
    await expect(page).toHaveURL(/\/preporuke$/);

    const link = (await page.getByText(/\/preporuka\/[a-z0-9]{8}$/).textContent())?.trim() ?? '';
    expect(link).toMatch(/\/preporuka\/[a-z0-9]{8}$/);

    // Someone without an account opens it.
    await page.context().clearCookies();
    await page.goto(link);
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByText(/Preporučio vas je proizvođač „Domaćinstvo Nićić”/)).toBeVisible();

    // Someone signed in already has an account: they are shown the producer instead.
    await switchTo(page, accounts.buyer);
    await page.goto(link);
    await expect(page).toHaveURL(/\/proizvodjac\//);
});

test('a producer writes a recipe and a visitor reads it', async ({ page }) => {
    page.setDefaultTimeout(15_000);

    const title = `Punjene paprike sa sirom ${Date.now()}`;

    await switchTo(page, accounts.producer);
    await page.goto('/moji-proizvodjaci');
    await page.getByRole('button', { name: 'Više' }).click();
    await page.getByRole('menuitem', { name: 'Priče i recepti' }).click();
    await page.getByRole('link', { name: 'Nova objava' }).click();

    await page.getByText('Šta se sprema od onoga što pravite.').click();
    await page.getByLabel('Naslov', { exact: true }).fill(title);
    // Too short to be worth a page: refused with a sentence.
    await page.getByLabel('Priprema').fill('Ispeći.');
    await page.getByRole('button', { name: 'Sačuvaj' }).click();
    await expect(page.getByText(/Napišite bar nekoliko rečenica/)).toBeVisible();

    await page.getByLabel('Sastojci').fill('8 paprika\n300 g mladog sira\n2 jaja');
    await page
        .getByLabel('Priprema')
        .fill(
            'Paprike operite i očistite od semena. Sir izmrvite i umutite sa jajima, pa napunite paprike. Pecite u rerni na 200 stepeni oko pola sata, dok ne porumene.',
        );
    await page.getByRole('button', { name: 'Sačuvaj' }).click();

    await expect(page).toHaveURL(/\/price$/);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();

    await page.context().clearCookies();
    await page.goto('/price?vrsta=recept');
    await page.getByRole('link', { name: new RegExp(title) }).click();
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sastojci' })).toBeVisible();
    await expect(page.getByText('300 g mladog sira')).toBeVisible();
});
