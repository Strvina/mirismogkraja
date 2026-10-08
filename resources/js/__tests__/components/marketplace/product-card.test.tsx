import { makeProductCard } from '@/__tests__/support/factories';
import { lastVisit, visits } from '@/__tests__/support/inertia';
import { freezeDate, renderOnPage } from '@/__tests__/support/render';
import ProductCard from '@/components/marketplace/product-card';
import { loadLocale } from '@/lib/i18n';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const card = () => screen.getByRole('link');

describe('ProductCard', () => {
    it('leads to the product and shows its name and price per unit', () => {
        renderOnPage(
            <ProductCard
                product={makeProductCard({ name: 'Domaći ajvar', slug: 'domaci-ajvar', price: '1250.00', unit: 'kg' })}
                canFavorite={false}
            />,
        );

        expect(card()).toHaveAttribute('href', route('marketplace.products.show', 'domaci-ajvar'));
        expect(screen.getByRole('heading', { name: 'Domaći ajvar' })).toBeVisible();
        expect(card()).toHaveTextContent('1.250 RSD/ kg');
    });

    it("writes the price the reader's way", async () => {
        await loadLocale('en');
        renderOnPage(<ProductCard product={makeProductCard({ price: '1250.00' })} canFavorite={false} />);

        expect(card()).toHaveTextContent('1,250 RSD');
    });

    it('shows the first photo, described by the name of the product', () => {
        const images = [
            { id: 1, path: 'products/ajvar-1.jpg', order: 0 },
            { id: 2, path: 'products/ajvar-2.jpg', order: 1 },
        ];

        renderOnPage(<ProductCard product={makeProductCard({ name: 'Domaći ajvar', images })} canFavorite={false} />);

        expect(screen.getByRole('img', { name: 'Domaći ajvar' })).toHaveAttribute('src', '/storage/products/ajvar-1.jpg');
    });

    it('does without a photo', () => {
        renderOnPage(<ProductCard product={makeProductCard({ images: [] })} canFavorite={false} />);

        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('names who makes it and where, when the list says', () => {
        renderOnPage(<ProductCard product={makeProductCard({ producer: { id: 1, name: 'Mlekara Zapis', city: 'Niš' } })} canFavorite={false} />);

        expect(screen.getByText('Mlekara Zapis')).toBeVisible();
        expect(screen.getByText('Niš')).toBeVisible();
    });

    it("leaves the producer out on the producer's own page", () => {
        renderOnPage(<ProductCard product={makeProductCard()} canFavorite={false} />);

        expect(screen.queryByText('Mlekara Zapis')).not.toBeInTheDocument();
    });

    it('marks a paid placement', () => {
        renderOnPage(<ProductCard product={makeProductCard()} canFavorite={false} featured />);

        expect(screen.getByText('Istaknuto')).toBeVisible();
    });

    describe('availability', () => {
        it('says nothing for a product in stock that is made all year', () => {
            renderOnPage(<ProductCard product={makeProductCard({ stock_quantity: 5 })} canFavorite={false} />);

            expect(card()).not.toHaveTextContent('Nema na stanju');
            expect(card()).not.toHaveTextContent('sezon');
        });

        it('says when there is none left', () => {
            renderOnPage(<ProductCard product={makeProductCard({ stock_quantity: 0 })} canFavorite={false} />);

            expect(screen.getByText('Nema na stanju')).toBeVisible();
        });

        it('says a seasonal product is in season, with the months behind the label', () => {
            freezeDate('2026-08-10T10:00:00');
            renderOnPage(<ProductCard product={makeProductCard({ season_from: 7, season_to: 9 })} canFavorite={false} />);

            expect(screen.getByText('U sezoni')).toHaveAttribute('title', 'jul – sep');
            expect(screen.queryByText('Van sezone')).not.toBeInTheDocument();
        });

        it('says a seasonal product is out of season', () => {
            freezeDate('2026-12-10T10:00:00');
            renderOnPage(<ProductCard product={makeProductCard({ season_from: 7, season_to: 9 })} canFavorite={false} />);

            expect(screen.getByText('Van sezone')).toBeVisible();
        });

        it('follows a season that runs over the new year', () => {
            freezeDate('2026-01-10T10:00:00');
            renderOnPage(<ProductCard product={makeProductCard({ season_from: 11, season_to: 2 })} canFavorite={false} />);

            expect(screen.getByText('U sezoni')).toBeVisible();
        });

        it('says "none left" rather than "in season" when both are true', () => {
            freezeDate('2026-08-10T10:00:00');
            renderOnPage(<ProductCard product={makeProductCard({ stock_quantity: 0, season_from: 7, season_to: 9 })} canFavorite={false} />);

            expect(screen.getByText('Nema na stanju')).toBeVisible();
            expect(screen.queryByText('U sezoni')).not.toBeInTheDocument();
        });
    });

    describe('saving to favourites', () => {
        it('is not offered to a guest', () => {
            renderOnPage(<ProductCard product={makeProductCard()} canFavorite={false} />);

            expect(screen.queryByRole('button')).not.toBeInTheDocument();
        });

        it('offers to add a product that is not saved', () => {
            renderOnPage(<ProductCard product={makeProductCard({ is_favorited: false })} canFavorite />);

            expect(screen.getByRole('button', { name: 'Dodaj u omiljene', pressed: false })).toBeInTheDocument();
        });

        it('offers to remove one that is', () => {
            renderOnPage(<ProductCard product={makeProductCard({ is_favorited: true })} canFavorite />);

            expect(screen.getByRole('button', { name: 'Ukloni iz omiljenih', pressed: true })).toBeInTheDocument();
        });

        it('toggles it on the server and stays on the list instead of opening the product', async () => {
            const { user } = renderOnPage(<ProductCard product={makeProductCard({ id: 42 })} canFavorite />);

            await user.click(screen.getByRole('button', { name: 'Dodaj u omiljene' }));

            expect(visits()).toHaveLength(1);
            expect(lastVisit()).toMatchObject({
                method: 'post',
                url: route('favorites.toggle'),
                data: { favoritable_type: 'product', favoritable_id: 42 },
                options: { preserveScroll: true, preserveState: true },
            });
        });
    });
});
