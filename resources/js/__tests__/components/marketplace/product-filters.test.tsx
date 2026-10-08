import { createUser } from '@/__tests__/support/render';
import ProductFilters, { type ProductFilterValues } from '@/components/marketplace/product-filters';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const CATEGORIES = [
    { id: 1, name: 'Zimnica' },
    { id: 7, name: 'Ajvar', parent_id: 1 },
    { id: 2, name: 'Med' },
];
const PRODUCERS = [
    { id: 4, name: 'Mlekara Zapis' },
    { id: 9, name: 'Pčelinjak Rtanj' },
];

function renderFilters(filters: ProductFilterValues = {}, cities = ['Leskovac', 'Niš']) {
    const onChange = vi.fn();
    const onReset = vi.fn();

    render(
        <ProductFilters
            filters={filters}
            categories={CATEGORIES}
            producers={PRODUCERS}
            cities={cities}
            priceBounds={{ min: 120.5, max: 2499.1 }}
            onChange={onChange}
            onReset={onReset}
        />,
    );

    return { user: createUser(), onChange, onReset };
}

const options = () => screen.getAllByRole('menuitemradio').map((option) => option.textContent);

describe('ProductFilters', () => {
    describe('category', () => {
        it('starts on "all categories"', () => {
            renderFilters();

            expect(screen.getByLabelText('Kategorija')).toHaveTextContent('Sve kategorije');
        });

        it('offers the tree, subcategories set in under their parent', async () => {
            const { user } = renderFilters();

            await user.click(screen.getByLabelText('Kategorija'));

            expect(options()).toEqual(['Sve kategorije', 'Zimnica', '— Ajvar', 'Med']);
        });

        it('reports the chosen category by its id', async () => {
            const { user, onChange } = renderFilters();

            await user.click(screen.getByLabelText('Kategorija'));
            await user.click(screen.getByRole('menuitemradio', { name: '— Ajvar' }));

            expect(onChange).toHaveBeenCalledExactlyOnceWith({ category_id: '7' });
        });

        it('clears the filter on "all categories"', async () => {
            const { user, onChange } = renderFilters({ category_id: '7' });

            await user.click(screen.getByLabelText('Kategorija'));
            await user.click(screen.getByRole('menuitemradio', { name: 'Sve kategorije' }));

            expect(onChange).toHaveBeenCalledExactlyOnceWith({ category_id: undefined });
        });

        it('shows the chosen one, also when its id arrives as a number from a category page', () => {
            renderFilters({ category_id: 2 as unknown as string });

            expect(screen.getByLabelText('Kategorija')).toHaveTextContent('Med');
        });
    });

    describe('producer', () => {
        it('offers every producer, and reports the chosen one', async () => {
            const { user, onChange } = renderFilters();

            await user.click(screen.getByLabelText('Proizvođač'));
            expect(options()).toEqual(['Svi proizvođači', 'Mlekara Zapis', 'Pčelinjak Rtanj']);

            await user.click(screen.getByRole('menuitemradio', { name: 'Pčelinjak Rtanj' }));
            expect(onChange).toHaveBeenCalledExactlyOnceWith({ producer_id: '9' });
        });

        it('shows the chosen producer and clears it on "all producers"', async () => {
            const { user, onChange } = renderFilters({ producer_id: '4' });

            expect(screen.getByLabelText('Proizvođač')).toHaveTextContent('Mlekara Zapis');

            await user.click(screen.getByLabelText('Proizvođač'));
            await user.click(screen.getByRole('menuitemradio', { name: 'Svi proizvođači' }));

            expect(onChange).toHaveBeenCalledExactlyOnceWith({ producer_id: undefined });
        });
    });

    describe('town', () => {
        it('offers the towns products are sold from, and reports the chosen one', async () => {
            const { user, onChange } = renderFilters();

            await user.click(screen.getByLabelText('Mesto'));
            expect(options()).toEqual(['Cela Srbija', 'Leskovac', 'Niš']);

            await user.click(screen.getByRole('menuitemradio', { name: 'Niš' }));
            expect(onChange).toHaveBeenCalledExactlyOnceWith({ city: 'Niš' });
        });

        it('clears it on "all of Serbia"', async () => {
            const { user, onChange } = renderFilters({ city: 'Niš' });

            await user.click(screen.getByLabelText('Mesto'));
            await user.click(screen.getByRole('menuitemradio', { name: 'Cela Srbija' }));

            expect(onChange).toHaveBeenCalledExactlyOnceWith({ city: undefined });
        });

        it('is not offered at all while no town has products', () => {
            renderFilters({}, []);

            expect(screen.queryByLabelText('Mesto')).not.toBeInTheDocument();
        });
    });

    describe('price', () => {
        it('hints at the cheapest and the dearest product, in whole dinars', () => {
            renderFilters();

            expect(screen.getByLabelText('Najniža cena')).toHaveAttribute('placeholder', '120');
            expect(screen.getByLabelText('Najviša cena')).toHaveAttribute('placeholder', '2500');
        });

        it('reports a bound once the field is left, not on every key', async () => {
            const { user, onChange } = renderFilters();

            await user.type(screen.getByLabelText('Najniža cena'), '300');
            expect(onChange).not.toHaveBeenCalled();

            await user.tab();
            expect(onChange).toHaveBeenCalledExactlyOnceWith({ min_price: '300' });
        });

        it('reports the upper bound the same way', async () => {
            const { user, onChange } = renderFilters();

            await user.type(screen.getByLabelText('Najviša cena'), '900');
            await user.tab();

            expect(onChange).toHaveBeenCalledExactlyOnceWith({ max_price: '900' });
        });

        it('clears a bound when its field is emptied', async () => {
            const { user, onChange } = renderFilters({ min_price: '300' });
            const lowest = screen.getByLabelText('Najniža cena');

            expect(lowest).toHaveValue(300);

            await user.clear(lowest);
            await user.tab();

            expect(onChange).toHaveBeenCalledExactlyOnceWith({ min_price: undefined });
        });
    });

    describe('in stock and in season', () => {
        it('are both off by default', () => {
            renderFilters();

            expect(screen.getByRole('checkbox', { name: 'Samo dostupno na stanju' })).not.toBeChecked();
            expect(screen.getByRole('checkbox', { name: 'Samo ono što je sada u sezoni' })).not.toBeChecked();
        });

        it('turn on as the flag "1"', async () => {
            const { user, onChange } = renderFilters();

            await user.click(screen.getByRole('checkbox', { name: 'Samo dostupno na stanju' }));
            expect(onChange).toHaveBeenLastCalledWith({ in_stock: '1' });

            await user.click(screen.getByRole('checkbox', { name: 'Samo ono što je sada u sezoni' }));
            expect(onChange).toHaveBeenLastCalledWith({ in_season: '1' });
        });

        it('show as on, and turn off by dropping the flag', async () => {
            const { user, onChange } = renderFilters({ in_stock: '1', in_season: '1' });
            const inStock = screen.getByRole('checkbox', { name: 'Samo dostupno na stanju' });
            const inSeason = screen.getByRole('checkbox', { name: 'Samo ono što je sada u sezoni' });

            expect(inStock).toBeChecked();
            expect(inSeason).toBeChecked();

            await user.click(inStock);
            expect(onChange).toHaveBeenLastCalledWith({ in_stock: undefined });

            await user.click(inSeason);
            expect(onChange).toHaveBeenLastCalledWith({ in_season: undefined });
        });
    });

    describe('how many filters are on', () => {
        const toggle = () => screen.getByRole('button', { name: /^Filteri/ });

        it('is not counted, and nothing can be reset, while none is', () => {
            renderFilters();

            expect(toggle()).toHaveTextContent(/^Filteri$/);
            expect(screen.queryByRole('button', { name: 'Poništi' })).not.toBeInTheDocument();
        });

        it('is counted on the button that opens the panel on a phone', () => {
            renderFilters({ category_id: '7', city: 'Niš', min_price: '300', in_season: '1' });

            expect(toggle()).toHaveTextContent('Filteri (4)');
        });

        it('counts all seven kinds', () => {
            renderFilters({ category_id: '7', producer_id: '4', city: 'Niš', min_price: '1', max_price: '9', in_stock: '1', in_season: '1' });

            expect(toggle()).toHaveTextContent('Filteri (7)');
        });

        it('does not count the search or the order, which are not filters of this panel', () => {
            renderFilters({ q: 'ajvar', sort: 'price_asc' });

            expect(toggle()).toHaveTextContent(/^Filteri$/);
            expect(screen.queryByRole('button', { name: 'Poništi' })).not.toBeInTheDocument();
        });

        it('offers to reset them all at once', async () => {
            const { user, onReset, onChange } = renderFilters({ in_stock: '1' });

            await user.click(screen.getByRole('button', { name: 'Poništi' }));

            expect(onReset).toHaveBeenCalledTimes(1);
            expect(onChange).not.toHaveBeenCalled();
        });
    });
});
