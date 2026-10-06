import { createHmac } from 'node:crypto';
import { accounts, clickNav, expect, logIn, switchTo, test } from './fixtures';

/** What an authenticator app would show for this secret right now (RFC 6238). */
function totp(secret: string): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bits = [...secret.replace(/=+$/, '')].map((char) => alphabet.indexOf(char).toString(2).padStart(5, '0')).join('');
    const key = Buffer.from((bits.match(/.{8}/g) ?? []).map((byte) => parseInt(byte, 2)));

    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));

    const hmac = createHmac('sha1', key).update(counter).digest();
    const offset = hmac[hmac.length - 1] & 0xf;

    return String((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

test('the pages that explain the site are a click away from any page', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('contentinfo').getByRole('link', { name: 'Kako radi' }).click();
    await expect(page).toHaveURL(/\/kako-radi$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Kako radi Vrelina juga' })).toBeVisible();

    // Prices are public: a producer reads them before opening an account.
    await page.getByRole('link', { name: 'Paketi i cene' }).click();
    await expect(page).toHaveURL(/\/za-proizvodjace$/);
    await expect(page.getByRole('heading', { name: 'Premium' })).toBeVisible();
    await expect(page.getByText('RSD / god').first()).toBeVisible();

    await page.getByRole('contentinfo').getByRole('link', { name: 'Česta pitanja' }).click();
    await expect(page).toHaveURL(/\/cesta-pitanja$/);
    await page.getByText('Da li mogu da kupim preko sajta?').click();
    await expect(page.getByText(/Vrelina juga nije prodavnica: nema korpe/)).toBeVisible();

    await page.getByRole('contentinfo').getByRole('link', { name: 'Kontakt' }).click();
    await expect(page.locator('main a[href^="mailto:"]')).toBeVisible();
});

test('a town and a month each have a page of their own', async ({ page }) => {
    // "Pčelinjak Medovina" sells from Niš (DemoContentSeeder).
    await page.goto('/mesto/nis');
    await expect(page.getByRole('heading', { level: 1, name: 'Domaći proizvodi — Niš' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Proizvođači iz mesta Niš' })).toBeVisible();

    // Narrowed to one of the categories sold from there.
    await page.getByRole('navigation', { name: 'Kategorije' }).getByRole('link').nth(1).click();
    await expect(page).toHaveURL(/\/mesto\/nis\/.+/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('— Niš');

    // And back from a product: its producer's town is a link to the place.
    await page.locator('main a[href*="/proizvod/"]').first().click();
    await expect(page).toHaveURL(/\/proizvod\//);
    await page.getByRole('main').getByRole('link', { name: 'Niš', exact: true }).click();
    await expect(page).toHaveURL(/\/mesto\/nis$/);

    await page.goto('/sezona');
    await expect(page).toHaveURL(/\/sezona\/[a-z]+$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('U sezoni:');
    await expect(page.getByRole('navigation', { name: 'Meseci' }).getByRole('link')).toHaveCount(12);
});

test('a buyer says what they are looking for, a producer answers, and it becomes a conversation', async ({ page }) => {
    const title = `Suva paprika za zimnicu ${Date.now()}`;
    const offer = `Imamo suvu papriku, 900 dinara kilogram. ${Date.now()}`;

    await test.step('the buyer posts an ad', async () => {
        await logIn(page, accounts.buyer);
        await page.goto('/');
        await clickNav(page, 'Tražim', /\/trazim$/);
        await page.getByRole('link', { name: 'Napiši šta tražiš' }).click();
        await expect(page).toHaveURL(/\/trazim\/novi$/);

        await page.getByLabel('Šta tražite', { exact: true }).fill(title);
        await page.getByLabel('Količina (neobavezno)').fill('5 kg');
        // Too short: the form comes back with a sentence, not a broken page.
        await page.getByLabel('Opis').fill('Treba mi.');
        await page.getByRole('button', { name: 'Objavi oglas' }).click();
        await expect(page.getByText(/Opišite malo detaljnije/)).toBeVisible();

        await page.getByLabel('Opis').fill('Treba mi za zimnicu, mogu da dođem po nju bilo kog vikenda.');
        await page.getByRole('button', { name: 'Objavi oglas' }).click();
        await expect(page).toHaveURL(/\/trazim\/\d+$/);
        await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
        await expect(page.getByText(/Još niko\./)).toBeVisible();
    });

    const adUrl = page.url();

    await test.step('a producer finds it in the list and answers', async () => {
        await switchTo(page, accounts.producer);
        await page.goto('/trazim');
        await page.getByRole('link').filter({ hasText: title }).click();
        await expect(page.getByRole('heading', { name: 'Imate ovo u ponudi?' })).toBeVisible();

        await page.getByRole('textbox', { name: 'Odgovor kupcu' }).fill(offer);
        await page.getByRole('button', { name: 'Pošalji ponudu' }).click();

        // Straight into the conversation, with the ad it answers shown.
        await expect(page).toHaveURL(/\/poruke-proizvodjaca\//);
        await expect(page.getByText(offer)).toBeVisible();
        await expect(page.getByText('Odgovor na oglas')).toBeVisible();

        // One answer per ad.
        await page.goto(adUrl);
        await expect(page.getByText('Već ste odgovorili na ovaj oglas.')).toBeVisible();
    });

    await test.step('the buyer sees who answered, reads it and closes the ad', async () => {
        await switchTo(page, accounts.buyer);
        await page.goto(adUrl);
        await expect(page.getByRole('heading', { name: 'Ko se javio' })).toBeVisible();
        await page.getByRole('link', { name: 'Otvori razgovor' }).click();
        await expect(page).toHaveURL(/\/poruke\//);
        await expect(page.getByText(offer)).toBeVisible();

        await page.goto(adUrl);
        await page.getByRole('button', { name: /zatvori oglas/ }).click();
        await expect(page.getByText(/Ovaj oglas više nije javan/)).toBeVisible();

        await page.goto('/trazim');
        await expect(page.getByRole('heading', { name: 'Moji oglasi' })).toBeVisible();
    });

    await test.step('the admin has it in the panel', async () => {
        await switchTo(page, accounts.admin);
        await page.goto('/admin/oglasi');
        await expect(page.getByRole('link', { name: title })).toBeVisible();
    });
});

test('a producer on a pause stays visible and takes no new inquiries', async ({ page }) => {
    const note = 'Na odmoru smo do kraja meseca.';

    await logIn(page, accounts.gardener);
    await page.goto('/moji-proizvodjaci');
    await page.getByRole('button', { name: 'Više' }).click();
    await page.getByRole('menuitem', { name: 'Pauza' }).click();
    await expect(page).toHaveURL(/\/pauza$/);

    await page.getByLabel('Poruka posetiocima (neobavezno)').fill(note);
    await page.getByRole('button', { name: 'Uključi pauzu' }).click();
    await expect(page.getByRole('button', { name: 'Isključi pauzu' })).toBeVisible();

    try {
        // A visitor: the page is there, and says why there is nothing to send.
        await page.context().clearCookies();
        await page.goto('/proizvodjaci?q=ivanovi');
        await page
            .getByRole('link', { name: /Bašta Ivanovića/ })
            .first()
            .click();
        await expect(page.getByText('Trenutno ne prima nove upite.')).toBeVisible();
        await expect(page.getByText(note)).toBeVisible();

        await page.locator('main a[href*="/proizvod/"]').first().click();
        await expect(page).toHaveURL(/\/proizvod\//);
        await expect(page.getByText('Trenutno ne prima nove upite.')).toBeVisible();
        await expect(page.getByText('i javićemo vam kad se vrati.')).toBeVisible();
        await expect(page.getByRole('link', { name: 'Prijavite se da pošaljete upit' })).toHaveCount(0);
    } finally {
        // Back to taking inquiries, whatever happened above: other tests write to this producer.
        await logIn(page, accounts.gardener);
        await page.goto('/moji-proizvodjaci');
        await page.getByRole('link', { name: /Pauza je uključena/ }).click();
        await page.getByRole('button', { name: 'Isključi pauzu' }).click();
        await expect(page.getByRole('button', { name: 'Uključi pauzu' })).toBeVisible();
    }
});

test('two-step sign-in: set up with a code, then signing in owes one', async ({ page }) => {
    // An account of its own: a second step left on a demo account would lock every later test out of it.
    const account = { email: `dva-koraka-${Date.now()}@example.com`, password: 'lozinka-za-test-123' };

    await page.goto('/register');
    await page.getByLabel('Ime').fill('Dva Koraka');
    await page.getByLabel('Email adresa').fill(account.email);
    await page.getByLabel('Lozinka', { exact: true }).fill(account.password);
    await page.getByLabel('Potvrda lozinke').fill(account.password);
    await page.getByRole('button', { name: 'Napravi nalog' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/register'));

    await page.goto('/settings/two-factor');
    await page.getByLabel('Trenutna lozinka').fill(account.password);
    await page.getByRole('button', { name: 'Uključi dvostruku potvrdu' }).click();

    // The QR code is an image the page loads, and it has to actually load.
    const qr = page.getByRole('img', { name: 'QR kod za aplikaciju za potvrdu' });
    await expect(qr).toBeVisible();
    await expect.poll(() => qr.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);

    const secret = (await page.locator('p.font-mono').innerText()).trim();
    await page.getByLabel('Kod').fill(totp(secret));
    await page.getByRole('button', { name: 'Potvrdi i uključi' }).click();

    await expect(page.getByText('Sačuvajte rezervne kodove')).toBeVisible();
    await expect(page.getByText('Dvostruka potvrda je uključena.')).toBeVisible();
    const recoveryCode = (await page.locator('ul.font-mono li').first().innerText()).trim();

    // Signing in again: the password alone stops at the prompt.
    await page.context().clearCookies();
    await page.goto('/login');
    await page.getByLabel('Email adresa').fill(account.email);
    await page.getByLabel('Lozinka', { exact: true }).fill(account.password);
    await page.getByRole('button', { name: 'Prijavi se' }).click();
    await expect(page).toHaveURL(/\/two-factor-challenge$/);

    await page.getByLabel('Kod').fill('000000');
    await page.getByRole('button', { name: 'Prijavi se' }).click();
    await expect(page.getByText(/Kod nije ispravan/)).toBeVisible();

    // The code typed at set-up is spent, so the way in here is a recovery code.
    await page.getByRole('button', { name: /imam rezervni kod/ }).click();
    await page.getByLabel('Rezervni kod').fill(recoveryCode);
    await page.getByRole('button', { name: 'Prijavi se' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/two-factor-challenge'));

    await page.goto('/settings/two-factor');
    await expect(page.getByText('Preostalo rezervnih kodova: 7.')).toBeVisible();
});
