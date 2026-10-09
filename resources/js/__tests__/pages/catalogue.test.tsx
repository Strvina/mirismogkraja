import { makeProducer, makeProduct, makeUser, paginated } from '@/__tests__/support/factories';
import { lastVisit } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import ProductsIndex from '@/pages/marketplace/products/index';
import ProductShow from '@/pages/marketplace/products/show';
import { act, screen } from '@testing-library/react';
import { type ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';

const listing: ComponentProps<typeof ProductsIndex> = {
    products: paginated([]),
    featured: [],
    categories: [],
    producers: [],
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
        await user.click(send);
        expect(lastVisit()).toMatchObject({ method: 'post', url: route('inquiries.store', 'domaci-ajvar'), data: { body: 'Da li imate 5 tegli?' } });
        expect(send).toBeDisabled();
        act(() => lastVisit().fail({ body: 'Sačekajte pre naredne poruke.' }));
        expect(screen.getByRole('alert')).toHaveTextContent('Sačekajte pre naredne poruke.');
        expect(send).toBeEnabled();
    });
});
