import { accounts, clickNav, expect, logIn, logOut, test } from './fixtures';

test('links keep working after logging in and out, without a refresh', async ({ page }) => {
    await logIn(page, accounts.buyer);

    await clickNav(page, 'Proizvodi', /\/proizvodi$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Proizvodi' })).toBeVisible();
    await clickNav(page, 'Proizvođači', /\/proizvodjaci$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Proizvođači' })).toBeVisible();

    await logOut(page);

    await clickNav(page, 'Proizvodi', /\/proizvodi$/);
    await expect(page.getByRole('link', { name: 'Prijava' })).toBeVisible();
});

test('an admin reaches the admin panel and its pages after signing in', async ({ page }) => {
    await logIn(page, accounts.admin);

    await expect(page).toHaveURL(/\/admin$/);
    // The admin's route list arrives with the full page load after login;
    // without it, this link fails in the browser (Ziggy: route not found).
    await page.getByRole('link', { name: 'Zahtevi za izmenu' }).click();
    await expect(page).toHaveURL(/\/admin\/zahtevi$/);
});

test('a wrong password is refused with a message', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email adresa').fill(accounts.buyer.email);
    await page.getByLabel('Lozinka', { exact: true }).fill('pogresna-lozinka');
    await page.getByRole('button', { name: 'Prijavi se' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Pogrešan e-mail ili lozinka.')).toBeVisible();
});
