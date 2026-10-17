import { createUser } from '@/__tests__/support/render';
import ProductFilters, { type ProductFilterValues } from '@/components/marketplace/product-filters';
import { render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CATEGORIES = [
    { id: 1, name: 'Zimnica' },
    { id: 7, name: 'Ajvar', parent_id: 1 },
    { id: 2, name: 'Med' },
];
const PRODUCERS = [
    { id: 4, name: 'Mlekara Zapis' },
    { id: 9, name: 'Pčelinjak Rtanj' },
];
const DISTRICTS = [
    { value: 'jablanicki', label: 'Jablanički okrug', cities: ['Leskovac'] },
    { value: 'nisavski', label: 'Nišavski okrug', cities: ['Aleksinac', 'Niš'] },
];

let fetchCount: ReturnType<typeof vi.fn>;

function renderFilters(filters: ProductFilterValues = {}) {
    const onChange = vi.fn();
    const onReset = vi.fn();

    render(
        <ProductFilters
            filters={filters}
            categories={CATEGORIES}
            producers={PRODUCERS}
            districts={DISTRICTS}
            cities={['Aleksinac', 'Leskovac', 'Niš']}
            priceBounds={{ min: 120.5, max: 2499.1 }}
            total={40}
            onChange={onChange}
            onReset={onReset}
        />,
    );

    return { user: createUser(), onChange, onReset };
}

/** The panel beside the list (on a phone the same one opens from "Filteri"). */
const panel = () => within(screen.getByRole('region', { name: 'Filteri' }));
const options = () => screen.getAllByRole('menuitemradio').map((option) => option.textContent);
const applyButton = () => panel().getByRole('button', { name: /^Prikaži rezultate/ });

async function choose(user: ReturnType<typeof createUser>, field: HTMLElement, option: string) {
    await user.click(field);
    await user.click(screen.getByRole('menuitemradio', { name: option }));
}

describe('ProductFilters', () => {
    beforeEach(() => {
        fetchCount = vi.fn(async () => ({ ok: true, json: async () => ({ count: 5 }) }));
        vi.stubGlobal('fetch', fetchCount);
    });
    afterEach(() => vi.unstubAllGlobals());

    describe('choosing, then applying', () => {
        it('shows how many the filters in force show, with nothing to apply yet', () => {
            renderFilters();

            expect(applyButton()).toHaveTextContent('Prikaži rezultate (40)');
            expect(applyButton()).toBeDisabled();
        });

        it('applies nothing until the button, which says beforehand how many it will show', async () => {
            const { user, onChange } = renderFilters({ q: 'ajvar' });

            await choose(user, panel().getByLabelText('Kategorija'), 'Zimnica');

            expect(onChange).not.toHaveBeenCalled();
            await waitFor(() => expect(applyButton()).toHaveTextContent('Prikaži rezultate (5)'));
            // Asked with the search in force, which the panel does not change.
            expect(fetchCount).toHaveBeenCalledWith(route('marketplace.products.count', { category_id: '1', q: 'ajvar' }), expect.anything());

            await user.click(applyButton());

            expect(onChange).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ category_id: '1', city: undefined, in_stock: undefined }));
        });

        it('offers no reset while nothing is in force', () => {
            renderFilters();

            expect(panel().queryByRole('button', { name: 'Poništi' })).not.toBeInTheDocument();
        });

        it('resets everything with one click', async () => {
            const { user, onReset } = renderFilters({ in_stock: '1' });

            await user.click(panel().getByRole('button', { name: 'Poništi' }));

            expect(onReset).toHaveBeenCalledTimes(1);
        });
    });

    describe('category, then subcategory', () => {
        it('offers the general categories first', async () => {
            const { user } = renderFilters();

            await user.click(panel().getByLabelText('Kategorija'));

            expect(options()).toEqual(['Sve kategorije', 'Zimnica', 'Med']);
        });

        it('opens the narrower choice once a category with subcategories is chosen', async () => {
            const { user, onChange } = renderFilters();

            expect(panel().queryByRole('button', { name: /^Potkategorija/ })).not.toBeInTheDocument();
            await choose(user, panel().getByLabelText('Kategorija'), 'Zimnica');
            await user.click(panel().getByRole('button', { name: /^Potkategorija/ }));
            expect(options()).toEqual(['Sve iz „Zimnica”', 'Ajvar']);

            await user.click(screen.getByRole('menuitemradio', { name: 'Ajvar' }));
            await user.click(applyButton());

            expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ category_id: '7' }));
        });

        it('shows a subcategory chosen before under its own category, also when its id arrives as a number', () => {
            renderFilters({ category_id: 7 as unknown as string });

            expect(panel().getByLabelText('Kategorija')).toHaveTextContent('Zimnica');
            expect(panel().getByRole('button', { name: /^Potkategorija/ })).toHaveTextContent('Ajvar');
        });
    });

    describe('district, then town', () => {
        it('has no town to pick until a district is chosen', () => {
            renderFilters();

            expect(panel().getByRole('button', { name: /^Mesto/ })).toBeDisabled();
        });

        it('offers the towns of the chosen district, and lets go of the town when the district changes', async () => {
            const { user, onChange } = renderFilters({ district: 'nisavski', city: 'Niš' });

            await user.click(panel().getByRole('button', { name: /^Mesto/ }));
            expect(options()).toEqual(['Sva mesta', 'Aleksinac', 'Niš']);
            await user.keyboard('{Escape}');

            await choose(user, panel().getByRole('button', { name: /^Okrug/ }), 'Jablanički okrug');
            await user.click(applyButton());

            expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ district: 'jablanicki', city: undefined }));
        });
    });

    describe('price, availability and delivery', () => {
        it('hints at the cheapest and the dearest product, in whole dinars', () => {
            renderFilters();

            expect(panel().getByLabelText('Najniža cena')).toHaveAttribute('placeholder', 'od 120');
            expect(panel().getByLabelText('Najviša cena')).toHaveAttribute('placeholder', 'do 2500');
        });

        it('applies the price range, being available now and the way of delivery together', async () => {
            const { user, onChange } = renderFilters();

            await user.type(panel().getByLabelText('Najniža cena'), '300');
            await user.type(panel().getByLabelText('Najviša cena'), '900');
            await user.click(panel().getByRole('checkbox', { name: 'Dostupno odmah' }));
            await user.click(panel().getByRole('checkbox', { name: 'Lično preuzimanje' }));
            await user.click(applyButton());

            expect(onChange).toHaveBeenCalledWith(
                expect.objectContaining({ min_price: '300', max_price: '900', in_stock: '1', delivery: 'preuzimanje' }),
            );
        });

        it('takes both ways of delivery as no filter at all', async () => {
            const { user, onChange } = renderFilters({ delivery: 'dostava' });

            await user.click(panel().getByRole('checkbox', { name: 'Lično preuzimanje' }));
            await user.click(applyButton());

            expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ delivery: undefined }));
        });
    });

    describe('more filters', () => {
        it('are folded away until asked for', async () => {
            const { user } = renderFilters();

            expect(panel().queryByLabelText('Proizvođač')).not.toBeInTheDocument();
            await user.click(panel().getByRole('button', { name: /Dodatni filteri/ }));

            expect(panel().getByLabelText('Proizvođač')).toBeInTheDocument();
        });

        it('are open when one of them is in force', () => {
            renderFilters({ producer_id: '4' });

            expect(panel().getByLabelText('Proizvođač')).toHaveTextContent('Mlekara Zapis');
        });

        it('narrow by producer, season and how recently it was added', async () => {
            const { user, onChange } = renderFilters();

            await user.click(panel().getByRole('button', { name: /Dodatni filteri/ }));
            await choose(user, panel().getByLabelText('Proizvođač'), 'Pčelinjak Rtanj');
            await user.click(panel().getByRole('checkbox', { name: 'Samo ono što je sada u sezoni' }));
            await user.click(panel().getByRole('radio', { name: 'Poslednja 3 dana' }));
            await user.click(applyButton());

            expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ producer_id: '9', in_season: '1', period: '3' }));
        });
    });

    describe('on a phone', () => {
        it('has one way in, "Filteri", counting what is in force but not the order - nothing said twice beside it', async () => {
            const { user } = renderFilters({ category_id: '2', in_stock: '1', sort: 'price_asc' });
            const open = screen.getByRole('button', { name: /^Filteri i redosled/ });

            expect(open).toHaveTextContent('Filteri i redosled2');
            expect(screen.queryByRole('button', { name: 'Dostupno odmah' })).not.toBeInTheDocument();
            await user.click(open);

            expect(screen.getByRole('dialog', { name: 'Filteri' })).toBeInTheDocument();
        });

        it('sets the order in the panel too, applied with the rest', async () => {
            const onChange = vi.fn();
            const { user } = (() => {
                render(
                    <ProductFilters
                        filters={{}}
                        categories={CATEGORIES}
                        producers={PRODUCERS}
                        cities={[]}
                        priceBounds={{ min: 1, max: 9 }}
                        sortOptions={[
                            { value: '', label: 'Najnovije' },
                            { value: 'price_asc', label: 'Cena: niža prvo' },
                        ]}
                        onChange={onChange}
                        onReset={vi.fn()}
                    />,
                );

                return { user: createUser() };
            })();

            await choose(user, panel().getByLabelText('Redosled'), 'Cena: niža prvo');
            expect(onChange).not.toHaveBeenCalled();
            await user.click(applyButton());

            expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ sort: 'price_asc' }));
        });
    });
});
