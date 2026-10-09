import { makeCategory, makeProducer, makeUser } from '@/__tests__/support/factories';
import { lastVisit } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import AdminCategories from '@/pages/admin/categories/index';
import ProducerPause from '@/pages/producers/pause';
import { act, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('management forms', () => {
    it('creates a subcategory and clears the form only after acceptance', async () => {
        const category = { ...makeCategory({ id: 1, name: 'Povrće' }), slug: 'povrce', search_name: null, intro: null, products_count: 2 };
        const { user } = renderOnPage(<AdminCategories categories={[category]} />, { props: { auth: { user: makeUser({ role: 'admin' }) } } });
        await user.type(screen.getByLabelText('Naziv nove kategorije'), 'Ajvar');
        await user.selectOptions(screen.getByLabelText('Nadređena kategorija'), '1');
        await user.click(screen.getByRole('button', { name: 'Dodaj' }));
        expect(lastVisit()).toMatchObject({ method: 'post', url: route('admin.categories.store'), data: { name: 'Ajvar', parent_id: '1' } });
        expect(screen.getByRole('button', { name: 'Dodaj' })).toBeDisabled();
        act(() => lastVisit().fail({ name: 'Kategorija već postoji.' }));
        expect(screen.getByText('Kategorija već postoji.')).toBeVisible();
        expect(screen.getByLabelText('Naziv nove kategorije')).toHaveValue('Ajvar');
        await user.click(screen.getByRole('button', { name: 'Dodaj' }));
        act(() => lastVisit().succeed());
        expect(screen.getByLabelText('Naziv nove kategorije')).toHaveValue('');
        expect(screen.getByLabelText('Nadređena kategorija')).toHaveValue('');
    });

    it('activates a pause and retains the note when validation fails', async () => {
        const { user } = renderOnPage(
            <ProducerPause
                producer={makeProducer({ id: 7 })}
                pause={{ paused: false, until: null, note: null }}
                followersCount={3}
                maxDate="2027-01-01"
            />,
            { props: { auth: { user: makeUser({ role: 'seller' }) } } },
        );
        await user.type(screen.getByLabelText('Poruka posetiocima (neobavezno)'), 'Vraćamo se uskoro.');
        await user.click(screen.getByRole('button', { name: 'Uključi pauzu' }));
        expect(lastVisit()).toMatchObject({
            method: 'put',
            url: route('producers.pause.update', 7),
            data: { paused: true, until: '', note: 'Vraćamo se uskoro.' },
        });
        act(() => lastVisit().fail({ until: 'Datum nije ispravan.' }));
        expect(screen.getByText('Datum nije ispravan.')).toBeVisible();
        expect(screen.getByLabelText('Poruka posetiocima (neobavezno)')).toHaveValue('Vraćamo se uskoro.');
    });

    it('deactivates an existing pause without submitting the activation form', async () => {
        const { user } = renderOnPage(
            <ProducerPause
                producer={makeProducer({ id: 7 })}
                pause={{ paused: true, until: null, note: 'Na odmoru.' }}
                followersCount={3}
                maxDate="2027-01-01"
            />,
        );
        await user.click(screen.getByRole('button', { name: 'Isključi pauzu' }));
        expect(lastVisit().data).toMatchObject({ paused: false, note: 'Na odmoru.' });
        expect(screen.getByRole('button', { name: 'Isključi pauzu' })).toBeDisabled();
    });
});
