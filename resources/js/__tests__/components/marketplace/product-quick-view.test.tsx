import { makeProduct } from '@/__tests__/support/factories';
import { currentPage, lastVisit, setPage, visits } from '@/__tests__/support/inertia';
import { createUser } from '@/__tests__/support/render';
import { forgetAskedProducts, QuickViewProvider } from '@/components/marketplace/product-quick-view';
import { QuickViewLink } from '@/components/marketplace/quick-view-link';
import { type ProductPageProps } from '@/components/product-page/product-details';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const HREF = '/proizvod/domaci-ajvar';

function productPage(): ProductPageProps {
    return {
        product: {
            ...makeProduct({ name: 'Domaći ajvar' }),
            category: undefined,
            producer: { id: 1, name: 'Bašta Ivanovića', slug: 'basta', city: 'Vranje', logo_path: null },
        },
        similar: [],
        place: null,
        canInquire: false,
        noInquiry: null,
        pause: null,
        canFollow: false,
        isFollowing: false,
        responseTime: null,
        available: true,
        alertRequested: false,
        canReport: false,
        reportReasons: {},
        isFavorited: false,
    };
}

/** The server answering the popup's request as it answers Inertia's. */
function serve(answer: { component?: string; ok?: boolean } = {}) {
    const fetch = vi.fn(async () => ({
        ok: answer.ok ?? true,
        headers: new Headers({ 'X-Inertia': 'true' }),
        json: async () => ({ component: answer.component ?? 'marketplace/products/show', url: HREF, props: productPage(), version: '1' }),
    }));

    vi.stubGlobal('fetch', fetch);

    return fetch;
}

function renderList(withProvider = true) {
    const link = <QuickViewLink href={HREF}>Domaći ajvar</QuickViewLink>;

    render(withProvider ? <QuickViewProvider>{link}</QuickViewProvider> : link);

    return createUser();
}

describe('the product popup', () => {
    beforeEach(() => {
        forgetAskedProducts();
        setPage({ url: '/proizvodi?sort=price_asc', props: { products: [] } });
    });
    afterEach(() => vi.unstubAllGlobals());

    it('opens the product over the list, at the product’s own address', async () => {
        const fetch = serve();
        const user = renderList();

        await user.click(screen.getByRole('link', { name: 'Domaći ajvar' }));

        expect(await screen.findByRole('dialog', { name: 'Domaći ajvar' })).toBeInTheDocument();
        // Asked for as Inertia asks for a page, so the answer is that page's props.
        expect(fetch).toHaveBeenCalledWith(HREF, expect.objectContaining({ headers: expect.objectContaining({ 'X-Inertia': 'true' }) }));
        expect(currentPage().url).toBe(HREF);
        // The list's own props stay: it is still there underneath.
        expect(currentPage().props).toHaveProperty('products');
        expect(visits()).toEqual([]);
    });

    it('closes by going back to the list’s address', async () => {
        serve();
        const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
        const user = renderList();

        await user.click(screen.getByRole('link', { name: 'Domaći ajvar' }));
        await screen.findByRole('dialog', { name: 'Domaći ajvar' });
        await user.keyboard('{Escape}');

        expect(back).toHaveBeenCalledTimes(1);
    });

    it('opens the product’s page when the answer is not the product', async () => {
        serve({ component: 'errors/404' });
        const user = renderList();

        await user.click(screen.getByRole('link', { name: 'Domaći ajvar' }));

        await waitFor(() => expect(lastVisit()).toMatchObject({ method: 'get', url: HREF }));
        expect(screen.queryByRole('dialog', { name: 'Domaći ajvar' })).not.toBeInTheDocument();
    });

    it('leaves a click for a new tab to the browser', async () => {
        const fetch = serve();
        const user = renderList();

        await user.keyboard('{Control>}');
        await user.click(screen.getByRole('link', { name: 'Domaći ajvar' }));

        // Asked for ahead, as for any press on the card - but nothing opens over the list.
        expect(fetch.mock.calls.length).toBeLessThanOrEqual(1);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(currentPage().url).toBe('/proizvodi?sort=price_asc');
        expect(visits()).toEqual([]);
    });

    it('opens at once with what the card showed, while the rest is on its way - no spinner', async () => {
        let answer: (value: unknown) => void = () => undefined;
        vi.stubGlobal(
            'fetch',
            vi.fn(() => new Promise((resolve) => (answer = resolve))),
        );
        render(
            <QuickViewProvider>
                <QuickViewLink
                    href={HREF}
                    preview={{
                        name: 'Domaći ajvar',
                        price: '650.00',
                        unit: 'tegla',
                        image: null,
                        producer: { name: 'Bašta Ivanovića', city: 'Vranje' },
                    }}
                >
                    Domaći ajvar
                </QuickViewLink>
            </QuickViewProvider>,
        );

        await createUser().click(screen.getByRole('link', { name: 'Domaći ajvar' }));

        const dialog = screen.getByRole('dialog', { name: 'Domaći ajvar' });
        expect(dialog).toHaveTextContent('Bašta Ivanovića');
        expect(dialog).toHaveTextContent('/ tegla');
        expect(dialog.querySelector('.animate-spin')).toBeNull();

        answer({
            ok: true,
            headers: new Headers({ 'X-Inertia': 'true' }),
            json: async () => ({ component: 'marketplace/products/show', url: HREF, props: productPage() }),
        });
        await waitFor(() => expect(currentPage().url).toBe(HREF));
    });

    it('asks for the product when the pointer rests on it, and the click uses that answer', async () => {
        const fetch = serve();
        const user = renderList();

        await user.hover(screen.getByRole('link', { name: 'Domaći ajvar' }));
        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

        await user.click(screen.getByRole('link', { name: 'Domaći ajvar' }));

        expect(await screen.findByRole('dialog', { name: 'Domaći ajvar' })).toBeInTheDocument();
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('is a plain link where there is no list to stay on', async () => {
        const fetch = serve();
        const user = renderList(false);

        await user.click(screen.getByRole('link', { name: 'Domaći ajvar' }));

        expect(fetch).not.toHaveBeenCalled();
        expect(lastVisit()).toMatchObject({ method: 'get', url: HREF });
    });
});
