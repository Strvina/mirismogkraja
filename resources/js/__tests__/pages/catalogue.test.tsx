import { makeProducer, makeProduct, makeUser, paginated } from '@/__tests__/support/factories';
import { lastVisit, visits } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import { chat } from '@/lib/chat/store';
import ProductsIndex from '@/pages/marketplace/products/index';
import ProductShow from '@/pages/marketplace/products/show';
import { screen } from '@testing-library/react';
import { type ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => vi.unstubAllGlobals());

const listing: ComponentProps<typeof ProductsIndex> = {
    products: paginated([]),
    featured: [],
    categories: [],
    producers: [],
    selectedProducer: null,
    districts: [],
    cities: [],
    priceBounds: { min: 0, max: 1000 },
    filters: { q: 'ajvar', city: 'Niš', sort: 'price_asc' },
    perPage: 20,
    perPageOptions: [20, 40],
    category: null,
    browse: [],
    subcategories: [],
    prices: [],
    places: [],
    matchingProducers: [],
};

function renderProduct(overrides: Partial<ComponentProps<typeof ProductShow>> = {}, signedIn = false) {
    return renderOnPage(
        <ProductShow
            product={{ ...makeProduct(), producer: makeProducer({ city: null }), category: undefined }}
            similar={[]}
            place={null}
            canInquire={false}
            noInquiry={null}
            pause={null}
            canFollow={false}
            isFollowing={false}
            responseTime={null}
            available
            alertRequested={false}
            canReport={false}
            reportReasons={{}}
            isFavorited={false}
            {...overrides}
        />,
        { props: { auth: { user: signedIn ? makeUser() : null } } },
    );
}

describe('catalogue pages', () => {
    it('names the chosen producer before the list of all of them has arrived', () => {
        renderOnPage(
            <ProductsIndex
                {...listing}
                producers={undefined}
                selectedProducer={{ id: 7, name: 'Pčelarstvo Đorđević' }}
                filters={{ producer_id: '7' }}
            />,
        );
        expect(screen.getByLabelText('Proizvođač')).toHaveTextContent('Pčelarstvo Đorđević');
    });

    it('tells the owner it is their own product instead of leaving the place empty', () => {
        renderProduct({ noInquiry: 'own' }, true);
        expect(screen.getByText('Ovo je vaš proizvod.')).toBeVisible();
        expect(screen.getByRole('link', { name: 'Izmenite ga' })).toBeVisible();
        expect(screen.queryByRole('button', { name: 'Pošalji upit' })).not.toBeInTheDocument();
    });

    it('tells a buyer whose conversation is closed why there is no form', () => {
        renderProduct({ noInquiry: 'blocked' }, true);
        expect(screen.getByText(/Razgovor sa ovim proizvođačem je zatvoren/)).toBeVisible();
        expect(screen.getByRole('link', { name: 'Otvorite razgovor' })).toBeVisible();
    });

    it('offers sign-in to a visitor instead of an inquiry form', () => {
        renderProduct();
        expect(screen.getByRole('link', { name: 'Prijavite se da pošaljete upit' })).toHaveAttribute('href', route('login'));
        expect(screen.queryByRole('textbox', { name: 'Poruka proizvođaču' })).not.toBeInTheDocument();
    });

    it('shows a pause notice instead of accepting a new inquiry', () => {
        renderProduct({ pause: { until: null, note: 'Vraćamo se uskoro.' }, canFollow: true }, true);
        expect(screen.getByText('Vraćamo se uskoro.')).toBeVisible();
        expect(screen.getByRole('button', { name: 'Javi mi kad se vrati' })).toBeVisible();
        expect(screen.queryByRole('textbox', { name: 'Poruka proizvođaču' })).not.toBeInTheDocument();
    });

    it('does not offer an inquiry to a signed-in account without permission', () => {
        renderProduct({}, true);
        expect(screen.queryByRole('button', { name: 'Pošalji upit' })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Prijavite se da pošaljete upit' })).not.toBeInTheDocument();
    });

    it('clears search while preserving filters and resets pagination', async () => {
        const { user } = renderOnPage(<ProductsIndex {...listing} />);
        await user.click(screen.getByRole('button', { name: 'Poništi pretragu' }));
        expect(lastVisit()).toMatchObject({
            method: 'get',
            url: '/proizvodi',
            data: { city: 'Niš', sort: 'price_asc', per_page: 20, page: undefined, q: undefined },
        });
    });

    it('sends the inquiry from the product page and keeps errors visible', async () => {
        const { user } = renderOnPage(
            <ProductShow
                product={{ ...makeProduct(), producer: makeProducer({ slug: 'ana', city: 'Niš' }), category: undefined }}
                similar={[]}
                place={{ slug: 'nis', name: 'Niš' }}
                canInquire
                noInquiry={null}
                pause={null}
                canFollow
                isFollowing={false}
                responseTime={null}
                available
                alertRequested={false}
                canReport={false}
                reportReasons={{}}
                isFavorited={false}
            />,
            { props: { auth: { user: makeUser() } } },
        );
        const send = screen.getByRole('button', { name: 'Pošalji upit' });
        const placeLink = screen.getByRole('link', { name: 'Niš' });
        expect(placeLink).toHaveAttribute('href', route('marketplace.places.show', 'nis'));
        expect(placeLink.parentElement?.closest('a')).toBeNull();
        expect(send).toBeDisabled();
        await user.type(screen.getByRole('textbox', { name: 'Poruka proizvođaču' }), 'Da li imate 5 tegli?');
        // The question goes into the chat window, not to another page.
        const answer = { ok: false, status: 429, body: { message: 'x', errors: { body: ['Sačekajte pre naredne poruke.'] } } as unknown };
        const fetch = vi.fn(async (url: string) => ({
            ok: url.includes('chat.inquiry') ? answer.ok : true,
            status: url.includes('chat.inquiry') ? answer.status : 200,
            json: async () => (url.includes('chat.inquiry') ? answer.body : { thread: null, messages: [], has_older: false, unread: 0 }),
        }));
        vi.stubGlobal('fetch', fetch);

        await user.click(send);
        expect(fetch.mock.calls[0][0]).toBe(route('chat.inquiry', 'domaci-ajvar'));
        expect(await screen.findByRole('alert')).toHaveTextContent('Sačekajte pre naredne poruke.');
        expect(screen.getByRole('textbox', { name: 'Poruka proizvođaču' })).toHaveValue('Da li imate 5 tegli?');
        expect(send).toBeEnabled();
    });

    it('opens the conversation in the chat window once the inquiry is sent', async () => {
        chat.reset();
        const { user } = renderOnPage(
            <ProductShow
                product={{ ...makeProduct(), producer: makeProducer({ id: 4, slug: 'ana', name: 'Ana', city: 'Niš' }), category: undefined }}
                similar={[]}
                place={null}
                canInquire
                noInquiry={null}
                pause={null}
                canFollow={false}
                isFollowing={false}
                responseTime={null}
                available
                alertRequested={false}
                canReport={false}
                reportReasons={{}}
                isFavorited={false}
            />,
            { url: '/proizvod/domaci-ajvar', props: { auth: { user: makeUser({ id: 9 }) } } },
        );
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string) => ({
                ok: true,
                status: url.includes('chat.inquiry') ? 201 : 200,
                json: async () =>
                    url.includes('chat.inquiry')
                        ? { thread: { producer_id: 4, buyer_id: 9, title: 'Ana', avatar_path: null } }
                        : { thread: null, messages: [], has_older: false, unread: 0 },
            })),
        );

        await user.type(screen.getByRole('textbox', { name: 'Poruka proizvođaču' }), 'Ima li?');
        await user.click(screen.getByRole('button', { name: 'Pošalji upit' }));

        expect(await screen.findByRole('dialog', { name: 'Razgovor' })).toBeInTheDocument();
        expect(chat.get().active).toMatchObject({ producerId: 4, buyerId: 9 });
        expect(screen.getByRole('textbox', { name: 'Poruka proizvođaču' })).toHaveValue('');
        expect(visits()).toEqual([]);
    });
});
