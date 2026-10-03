import { accounts, expect, logIn, test } from './fixtures';

test('a buyer becomes a producer through the sign-up steps', async ({ page }) => {
    await logIn(page, accounts.buyer);
    await page.goto('/moji-proizvodjaci/novo');

    const name = `Pčelarstvo Probno ${Date.now()}`;

    // Step 1 refuses to move on without a name.
    await expect(page.getByRole('button', { name: 'Dalje' })).toBeDisabled();
    await page.getByLabel('Naziv proizvođača').fill(name);
    await page.getByLabel('Grad').fill('Niš');
    await page.getByRole('button', { name: 'Dalje' }).click();

    await page.getByLabel('Telefon za kontakt').fill('0601234567');
    await page.getByLabel('Lično preuzimanje').check();
    await page.getByRole('button', { name: 'Dalje' }).click();

    await page.getByLabel('Opis').fill('Domaći med sa juga Srbije.');
    // Back and forward again: what was entered is still there.
    await page.getByRole('button', { name: 'Nazad' }).click();
    await expect(page.getByLabel('Telefon za kontakt')).toHaveValue('0601234567');
    await page.getByRole('button', { name: 'Dalje' }).click();
    await expect(page.getByLabel('Opis')).toHaveValue('Domaći med sa juga Srbije.');
    await page.getByRole('button', { name: 'Dalje' }).click();

    // The last step: products are optional.
    await page.getByRole('button', { name: 'Pošalji na odobrenje' }).click();

    await expect(page).toHaveURL(/\/moji-proizvodjaci$/);
    await expect(page.getByRole('heading', { name })).toBeVisible();
});
