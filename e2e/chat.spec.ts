import { devices, type Browser, type Page } from '@playwright/test';
import { accounts, expect, logIn, test } from './fixtures';

/*
 * The chat window in the corner: a buyer and a producer writing to each
 * other through it, each in their own browser, and the messages pages
 * agreeing with it all along.
 */

async function signedIn(browser: Browser, account: { email: string; password: string }, options = {}): Promise<Page> {
    const page = await (await browser.newContext({ locale: 'sr-RS', ...options })).newPage();
    await logIn(page, account);

    return page;
}

const unreadOnServer = (page: Page) =>
    page.evaluate(async () => (await (await fetch('/chat/razgovori', { headers: { Accept: 'application/json' } })).json()).unread as number);

async function openProducer(page: Page) {
    await page.goto('/proizvodjaci?q=Doma%C4%87instvo');
    await page
        .getByRole('link', { name: /Domaćinstvo Nićić/ })
        .first()
        .click();
    await page.waitForURL(/\/proizvodjac\//);
}

test('a buyer and a producer write to each other through the window, without leaving their pages', async ({ page, browser }) => {
    const stamp = Date.now();
    await logIn(page, accounts.buyer);
    const seller = await signedIn(browser, accounts.producer);

    // "Pošalji poruku" opens the conversation in the window, on the same page.
    await openProducer(page);
    const producerPage = page.url();
    await page.getByRole('link', { name: 'Pošalji poruku' }).first().click();
    const buyerWindow = page.getByRole('dialog', { name: 'Razgovor' });
    await expect(buyerWindow).toBeVisible();
    expect(page.url()).toBe(producerPage);

    const question = `Pitanje iz prozora ${stamp}`;
    await buyerWindow.getByRole('textbox', { name: 'Poruka' }).fill(question);
    await buyerWindow.getByRole('textbox', { name: 'Poruka' }).press('Enter');
    await expect(buyerWindow.getByText(question)).toBeVisible();

    // The producer sees it counted, finds it unread in the list, and reading it clears it.
    await seller.goto('/proizvodi');
    const before = await unreadOnServer(seller);
    expect(before).toBeGreaterThan(0);
    await seller.getByRole('button', { name: `Poruke, nepročitanih: ${before}` }).click();
    const list = seller.getByRole('dialog', { name: 'Poruke' });
    const row = list.getByRole('button').filter({ hasText: question });
    await expect(row).toContainText('Nepročitano');
    await row.click();
    const sellerWindow = seller.getByRole('dialog', { name: 'Razgovor' });
    await expect(sellerWindow.getByText(question)).toBeVisible();
    await expect.poll(() => unreadOnServer(seller)).toBeLessThan(before);
    // The header badge follows the server without a reload.
    const left = await unreadOnServer(seller);
    await expect(seller.locator('header a[href$="/poruke"]').first()).toHaveAttribute('aria-label', left > 0 ? new RegExp(String(left)) : 'Poruke');

    // The answer reaches the buyer's open window on its own.
    const answer = `Odgovor iz prozora ${stamp}`;
    await sellerWindow.getByRole('textbox', { name: 'Poruka' }).fill(answer);
    await sellerWindow.getByRole('button', { name: 'Pošalji poruku' }).click();
    await expect(buyerWindow.getByText(answer)).toBeVisible({ timeout: 25_000 });

    // Folded away, a new message waits unread; brought back, it is read.
    await buyerWindow.getByRole('button', { name: 'Umanji' }).click();
    const followUp = `Još nešto ${stamp}`;
    await sellerWindow.getByRole('textbox', { name: 'Poruka' }).fill(followUp);
    await sellerWindow.getByRole('textbox', { name: 'Poruka' }).press('Enter');
    await expect(sellerWindow.getByText(followUp)).toBeVisible();
    await page.waitForTimeout(4_000);
    expect(await unreadOnServer(page)).toBeGreaterThan(0);
    await page.getByRole('button', { name: /Otvori razgovor sa/ }).click();
    await expect(buyerWindow.getByText(followUp)).toBeVisible();
    await expect.poll(() => unreadOnServer(page)).toBe(0);

    // What was typed survives folding the window and moving to another page.
    await buyerWindow.getByRole('textbox', { name: 'Poruka' }).fill('Nedovršeno');
    await buyerWindow.getByRole('button', { name: 'Umanji' }).click();
    await page.locator('header').getByRole('link', { name: 'Proizvodi' }).first().click();
    await page.waitForURL(/\/proizvodi/);
    await page.getByRole('button', { name: /Otvori razgovor sa/ }).click();
    await expect(buyerWindow.getByRole('textbox', { name: 'Poruka' })).toHaveValue('Nedovršeno');

    // Closed, the conversation is still there - and its page shows the same messages, once each.
    await buyerWindow.getByRole('button', { name: 'Zatvori razgovor' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: /^Poruke/ }).click();
    await page.getByRole('dialog', { name: 'Poruke' }).getByRole('link', { name: 'Sve poruke' }).click();
    await page.waitForURL(/\/poruke$/);
    await page.getByText(followUp).first().click();
    await page.waitForURL(/\/poruke\//);
    for (const text of [question, answer, followUp]) {
        await expect(page.getByText(text)).toHaveCount(1);
    }
    // No corner chat on the messages pages: the conversation is the page.
    await expect(page.locator('button[aria-label^="Poruke"]')).toHaveCount(0);

    await seller.context().close();
});

test('a send that fails says so, keeps the text, and goes once when tried again', async ({ page }) => {
    await logIn(page, accounts.buyer);
    await openProducer(page);
    await page.getByRole('link', { name: 'Pošalji poruku' }).first().click();
    const chat = page.getByRole('dialog', { name: 'Razgovor' });
    await expect(chat.getByRole('textbox', { name: 'Poruka' })).toBeVisible();
    await page.waitForTimeout(1_000);

    const text = `Bez interneta ${Date.now()}`;
    await page.context().setOffline(true);
    await chat.getByRole('textbox', { name: 'Poruka' }).fill(text);
    await chat.getByRole('textbox', { name: 'Poruka' }).press('Enter');
    await expect(chat.getByText('Nije poslato')).toBeVisible();
    await expect(chat.getByRole('alert')).toContainText('Veza sa serverom nije uspela');
    await expect(chat.getByText(text)).toHaveCount(1);

    await page.context().setOffline(false);
    await chat.getByRole('button', { name: 'Pokušaj ponovo' }).click();
    await expect(chat.getByText('Nije poslato')).toHaveCount(0);
    await expect(chat.getByText(text)).toHaveCount(1);
});

test("someone else's conversation is closed to the window", async ({ page, browser }) => {
    const seller = await signedIn(browser, accounts.producer);
    const theirs = await seller.evaluate(
        async () => (await (await fetch('/chat/razgovori', { headers: { Accept: 'application/json' } })).json()).threads[0],
    );
    await seller.context().close();

    // Someone in neither seat of that conversation.
    await logIn(page, accounts.admin);
    const status = await page.evaluate(
        async ({ producer, buyer }) => (await fetch(`/chat/${producer}/${buyer}`, { headers: { Accept: 'application/json' } })).status,
        { producer: theirs.producer_id, buyer: theirs.buyer_id },
    );

    expect(status).toBe(403);
});

test('on a phone the conversation takes the screen, scrolls by itself, and keeps a reader of older messages where they are', async ({
    page,
    browser,
}) => {
    const phone = await signedIn(browser, accounts.buyer, devices['iPhone 13']);
    await logIn(page, accounts.producer);

    // Enough history from the producer to scroll.
    const send = (body: string) =>
        page.evaluate(async (text) => {
            const list = await (await fetch('/chat/razgovori', { headers: { Accept: 'application/json' } })).json();
            const thread = list.threads.find((item: { title: string }) => item.title.startsWith('Marko'));
            const token = decodeURIComponent(
                document.cookie
                    .split('; ')
                    .find((cookie) => cookie.startsWith('XSRF-TOKEN='))!
                    .slice(11),
            );
            await fetch(`/chat/${thread.producer_id}/${thread.buyer_id}`, {
                method: 'POST',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-XSRF-TOKEN': token },
                body: JSON.stringify({ body: text }),
            });
        }, body);
    for (let n = 1; n <= 6; n++) {
        await send(`Duža poruka ${n}\nu više redova\nda bi razgovor\nmorao da se skroluje`);
    }

    await phone.goto('/proizvodi');
    await phone.getByRole('button', { name: /^Poruke/ }).click();
    const list = phone.getByRole('dialog', { name: 'Poruke' });
    await expect(list).toBeVisible();
    expect((await list.boundingBox())!.height).toBeGreaterThanOrEqual(phone.viewportSize()!.height - 2);

    await list.getByRole('button').filter({ hasText: 'Domaćinstvo Nićić' }).first().click();
    const chat = phone.getByRole('dialog', { name: 'Razgovor' });
    const log = chat.getByRole('log');
    await expect(chat.getByText('Duža poruka 6')).toBeVisible();

    // The message box is on screen, and the corner button is not over it.
    const box = (await chat.getByRole('textbox', { name: 'Poruka' }).boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(phone.viewportSize()!.height);
    await expect(phone.getByRole('button', { name: /^Poruke/ })).toHaveCount(0);

    // Reading back up: a new message does not pull the reader down.
    await log.evaluate((element) => (element.scrollTop = 0));
    await log.dispatchEvent('scroll');
    await send('Stigla dok čitate');
    await expect(chat.getByRole('button', { name: 'Nova poruka' })).toBeVisible({ timeout: 25_000 });
    expect(await log.evaluate((element) => element.scrollTop)).toBeLessThan(5);
    await chat.getByRole('button', { name: 'Nova poruka' }).click();
    await expect(chat.getByText('Stigla dok čitate')).toBeInViewport();

    // Back to the list, and closed: the page is free again.
    await chat.getByRole('button', { name: 'Nazad na razgovore' }).click();
    await expect(list).toBeVisible();
    await list.getByRole('button', { name: 'Zatvori poruke' }).click();
    expect(await phone.evaluate(() => getComputedStyle(document.documentElement).overflowY)).not.toBe('hidden');

    await phone.context().close();
});
