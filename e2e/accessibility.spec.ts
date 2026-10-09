import AxeBuilder from '@axe-core/playwright';
import { type Page } from '@playwright/test';
import { accounts, expect, logIn, test } from './fixtures';

/*
 * axe on the pages each kind of visitor spends time on. It finds what a
 * machine can find - contrast, a field without a name, a button with only
 * an icon - which is roughly a third of WCAG; the rest still needs a person
 * with a keyboard and a screen reader.
 *
 * Only "serious" and "critical" fail the test: those stop someone from
 * using the page. The milder ones are advice, and are left to a review.
 */

// The pages fade in (task 144); measured half-way through, every text would
// fail contrast. The site drops the fade for visitors who ask for less motion.
test.use({ reducedMotion: 'reduce' });

type Target = string | ((page: Page) => Promise<unknown>);

/** From `start`, follows the first link in the main content to each of `links` in turn: demo slugs and ids are not fixed. */
const through =
    (start: string, ...links: string[]) =>
    async (page: Page) => {
        await page.goto(start);

        for (const link of links) {
            const href = await page.locator(`main a[href*="${link}"]`).first().getAttribute('href');
            await page.goto(href!);
        }
    };

async function check(page: Page, targets: Record<string, Target>): Promise<void> {
    const found: string[] = [];

    for (const [name, target] of Object.entries(targets)) {
        await (typeof target === 'string' ? page.goto(target) : target(page));
        await page.waitForLoadState('networkidle');

        const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

        for (const violation of violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')) {
            const where = violation.nodes
                .slice(0, 3)
                .map((node) => node.target.join(' '))
                .join(' | ');

            found.push(`${name} (${new URL(page.url()).pathname}): ${violation.id}, ${violation.nodes.length}x: ${where}`);
        }
    }

    expect(found, 'Serious accessibility problems').toEqual([]);
}

const publicPages: Record<string, Target> = {
    home: '/',
    catalogue: '/proizvodi',
    producers: '/proizvodjaci',
    producer: through('/proizvodjaci', '/proizvodjac/'),
    product: through('/proizvodi', '/proizvod/'),
    stories: '/price',
    season: '/sezona',
    'wanted ads': '/trazim',
    'how it works': '/kako-radi',
    questions: '/cesta-pitanja',
    contact: '/kontakt',
    'for producers': '/za-proizvodjace',
    'sign in': '/login',
    'sign up': '/register',
    'forgotten password': '/forgot-password',
};

test('the public pages have no serious accessibility problems', async ({ page }) => {
    test.slow();

    await check(page, publicPages);
});

test.describe('in the dark theme', () => {
    // The site follows the system until a visitor chooses otherwise.
    test.use({ colorScheme: 'dark' });

    test('the public pages have no serious accessibility problems', async ({ page }) => {
        test.slow();

        await check(page, publicPages);
    });
});

test("a buyer's pages have no serious accessibility problems", async ({ page }) => {
    test.slow();
    await logIn(page, accounts.buyer);

    await check(page, {
        favourites: '/omiljeni',
        messages: '/poruke',
        notifications: '/obavestenja',
        'new wanted ad': '/trazim/novi',
        profile: '/settings/profile',
        password: '/settings/password',
        appearance: '/settings/appearance',
    });
});

test("a producer's pages have no serious accessibility problems", async ({ page }) => {
    test.slow();
    await logIn(page, accounts.producer);

    await check(page, {
        'my producers': '/moji-proizvodjaci',
        'producer form': through('/moji-proizvodjaci', '/izmena'),
        products: through('/moji-proizvodjaci', '/proizvodi'),
        'new product': through('/moji-proizvodjaci', '/proizvodi', '/proizvodi/novi'),
        statistics: through('/moji-proizvodjaci', '/statistika'),
        inbox: '/poruke-proizvodjaca',
        membership: '/clanarina',
        boost: '/isticanje',
    });
});

test('the admin pages have no serious accessibility problems', async ({ page }) => {
    test.slow();
    await logIn(page, accounts.admin);

    await check(page, {
        dashboard: '/admin',
        producers: '/admin/proizvodjaci',
        products: '/admin/proizvodi',
        users: '/admin/korisnici',
        reports: '/admin/prijave',
        reviews: '/admin/utisci',
        memberships: '/admin/clanarine',
    });
});
