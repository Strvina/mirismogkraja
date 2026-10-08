import { lastVisit } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import FavoriteButton from '@/components/favorite-button';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('FavoriteButton', () => {
    it('offers to save a producer', () => {
        renderOnPage(<FavoriteButton type="producer" id={4} isFavorited={false} />);

        expect(screen.getByRole('button', { name: 'Omiljeni proizvođač' })).toBeInTheDocument();
    });

    it('offers to save a product', () => {
        renderOnPage(<FavoriteButton type="product" id={9} isFavorited={false} />);

        expect(screen.getByRole('button', { name: 'Omiljeni proizvod' })).toBeInTheDocument();
    });

    it('says so when it is already saved, whatever it is', () => {
        renderOnPage(<FavoriteButton type="product" id={9} isFavorited />);

        expect(screen.getByRole('button', { name: 'Omiljeno' })).toBeInTheDocument();
    });

    it.each([
        ['producer', 4],
        ['product', 9],
    ] as const)('toggles the %s on the server and keeps the page where it is', async (type, id) => {
        const { user } = renderOnPage(<FavoriteButton type={type} id={id} isFavorited={false} />);

        await user.click(screen.getByRole('button'));

        expect(lastVisit()).toMatchObject({
            method: 'post',
            url: route('favorites.toggle'),
            data: { favoritable_type: type, favoritable_id: id },
            options: { preserveScroll: true },
        });
    });
});
