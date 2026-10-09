import { makeProducer } from '@/__tests__/support/factories';
import { lastVisit, visits } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import ProducerForm from '@/pages/producers/producer-form';
import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Leaflet is tested separately; these checks exercise form submission.
vi.mock('@/components/marketplace/map', () => ({ LocationPicker: () => null }));

describe('producer form', () => {
    it('updates contact and delivery data without replacing the saved location', async () => {
        const { user } = renderOnPage(
            <ProducerForm
                producer={makeProducer({ lat: '43.3', lng: '21.9', phone: '0601234567' })}
                action="/producers/7"
                method="put"
                submitLabel="Sačuvaj"
            />,
        );
        await user.clear(screen.getByLabelText('Telefon za kontakt'));
        await user.type(screen.getByLabelText('Telefon za kontakt'), '0617654321');
        await user.click(screen.getByRole('checkbox', { name: 'Lično preuzimanje' }));
        await user.click(screen.getByRole('button', { name: 'Sačuvaj' }));
        expect(lastVisit()).toMatchObject({
            method: 'put',
            url: '/producers/7',
            data: { phone: '0617654321', lat: '43.3', lng: '21.9', delivery_methods: ['preuzimanje'] },
        });
        expect(screen.getByRole('button', { name: 'Sačuvaj' })).toBeDisabled();
        act(() => lastVisit().fail({ phone: 'Broj nije ispravan.' }));
        expect(screen.getByText('Broj nije ispravan.')).toBeVisible();
        expect(screen.getByLabelText('Telefon za kontakt')).toHaveValue('0617654321');
    });

    it('advances on Enter and returns to the contact step after server validation', async () => {
        const { user } = renderOnPage(<ProducerForm wizard action="/producers" method="post" submitLabel="Pošalji" />);
        expect(screen.getByRole('button', { name: 'Dalje' })).toBeDisabled();
        await user.type(screen.getByLabelText('Naziv proizvođača'), 'Gazdinstvo Ana');
        fireEvent.submit(screen.getByLabelText('Naziv proizvođača').closest('form')!);
        expect(visits()).toHaveLength(0);
        await user.type(screen.getByLabelText('Telefon za kontakt'), 'wrong');
        await user.click(screen.getByRole('button', { name: 'Dalje' }));
        await user.click(screen.getByRole('button', { name: 'Dalje' }));
        await user.click(screen.getByRole('button', { name: 'Pošalji' }));
        expect(lastVisit()).toMatchObject({ method: 'post', url: '/producers', data: { name: 'Gazdinstvo Ana', phone: 'wrong', products: [] } });
        act(() => lastVisit().fail({ phone: 'Broj nije ispravan.' }));
        expect(screen.getByLabelText('Telefon za kontakt')).toHaveValue('wrong');
        expect(screen.getByText('Broj nije ispravan.')).toBeVisible();
        expect(screen.queryByRole('button', { name: 'Pošalji' })).not.toBeInTheDocument();
    });
});
