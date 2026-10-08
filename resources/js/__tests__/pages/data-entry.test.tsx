import { makeCategory, makeProduct } from '@/__tests__/support/factories';
import { lastVisit } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import ProductForm from '@/pages/products/product-form';
import WantedCreate from '@/pages/wanted/create';
import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('data entry pages', () => {
    it('updates an existing product with its saved status and shows field errors', async () => {
        const { user } = renderOnPage(
            <ProductForm
                product={makeProduct({ id: 7 })}
                categories={[makeCategory({ id: 1 })]}
                action="/products/7"
                method="put"
                submitLabel="Sačuvaj"
            />,
        );
        await user.clear(screen.getByLabelText('Cena (RSD)'));
        await user.type(screen.getByLabelText('Cena (RSD)'), '750');
        await user.click(screen.getByRole('button', { name: 'Sačuvaj' }));
        expect(lastVisit()).toMatchObject({ method: 'put', url: '/products/7', data: { price: '750', status: 'active', category_id: '1' } });
        act(() => lastVisit().fail({ price: 'Cena nije ispravna.' }));
        expect(screen.getByText('Cena nije ispravna.')).toBeVisible();
        expect(screen.getByLabelText('Cena (RSD)')).toHaveValue(750);
    });

    it('sends wanted-ad defaults and renders server validation', () => {
        renderOnPage(<WantedCreate categories={[]} city="Niš" suggestedTitle="Domaći med" bodyMax={2000} daysOpen={30} />);
        fireEvent.submit(screen.getByRole('button', { name: 'Objavi oglas' }).closest('form')!);
        expect(lastVisit()).toMatchObject({ method: 'post', url: route('wanted.store'), data: { title: 'Domaći med', city: 'Niš', body: '' } });
        act(() => lastVisit().fail({ body: 'Opis je obavezan.' }));
        expect(screen.getByText('Opis je obavezan.')).toBeVisible();
        expect(screen.getByRole('button', { name: 'Objavi oglas' })).toBeEnabled();
    });
});
