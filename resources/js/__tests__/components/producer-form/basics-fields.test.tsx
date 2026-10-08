import { ProducerFormHarness } from '@/__tests__/support/producer-form';
import { createUser } from '@/__tests__/support/render';
import BasicsFields from '@/components/producer-form/basics-fields';
import { type ProducerFormData } from '@/components/producer-form/types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The map itself is Leaflet's; here it is a button that "clicks" one point.
vi.mock('@/components/marketplace/map', () => ({
    LocationPicker: ({
        value,
        onChange,
    }: {
        value: { lat: number; lng: number } | null;
        onChange: (point: { lat: number; lng: number }) => void;
    }) => (
        <button type="button" onClick={() => onChange({ lat: 43.41235, lng: 22.02 })}>
            {value ? `Mapa: ${value.lat}, ${value.lng}` : 'Mapa: bez tačke'}
        </button>
    ),
}));

function renderFields(initial: Partial<ProducerFormData> = {}, errors: Partial<Record<keyof ProducerFormData, string>> = {}) {
    const onData = vi.fn();

    render(
        <ProducerFormHarness initial={initial} errors={errors} onData={onData}>
            {(fields) => <BasicsFields {...fields} />}
        </ProducerFormHarness>,
    );

    return { user: createUser(), data: () => onData.mock.lastCall?.[0] as ProducerFormData };
}

describe('BasicsFields', () => {
    it('asks for the name, which is required, and for the town and address, which are not', () => {
        renderFields();

        expect(screen.getByLabelText('Naziv proizvođača')).toBeRequired();
        expect(screen.getByLabelText('Grad')).not.toBeRequired();
        expect(screen.getByLabelText('Adresa')).not.toBeRequired();
    });

    it('starts from what is already saved', () => {
        renderFields({ name: 'Mlekara Zapis', city: 'Svrljig', address: 'Glavna 1' });

        expect(screen.getByLabelText('Naziv proizvođača')).toHaveValue('Mlekara Zapis');
        expect(screen.getByLabelText('Grad')).toHaveValue('Svrljig');
        expect(screen.getByLabelText('Adresa')).toHaveValue('Glavna 1');
    });

    it('writes what is typed into the form', async () => {
        const { user, data } = renderFields();

        await user.type(screen.getByLabelText('Naziv proizvođača'), 'Mlekara Zapis');
        await user.type(screen.getByLabelText('Grad'), 'Svrljig');
        await user.type(screen.getByLabelText('Adresa'), 'Glavna 1');

        expect(data()).toMatchObject({ name: 'Mlekara Zapis', city: 'Svrljig', address: 'Glavna 1' });
    });

    it("shows the server's message under the field it is about", () => {
        renderFields({}, { name: 'Ovaj naziv je već zauzet.', city: 'Grad je predugačak.', address: 'Adresa je predugačka.' });

        expect(screen.getByText('Ovaj naziv je već zauzet.')).toBeVisible();
        expect(screen.getByText('Grad je predugačak.')).toBeVisible();
        expect(screen.getByText('Adresa je predugačka.')).toBeVisible();
    });

    describe('the point on the map', () => {
        it('is optional and empty to begin with', () => {
            renderFields();

            expect(screen.getByText('Lokacija na mapi (opciono)')).toBeVisible();
            expect(screen.getByRole('button', { name: 'Mapa: bez tačke' })).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'Ukloni lokaciju' })).not.toBeInTheDocument();
        });

        it('is kept in the form as two decimal strings once clicked', async () => {
            const { user, data } = renderFields();

            await user.click(screen.getByRole('button', { name: 'Mapa: bez tačke' }));

            expect(data()).toMatchObject({ lat: '43.41235', lng: '22.02' });
            expect(screen.getByRole('button', { name: 'Mapa: 43.41235, 22.02' })).toBeInTheDocument();
        });

        it('shows a saved point on the map', () => {
            renderFields({ lat: '43.5', lng: '22.1' });

            expect(screen.getByRole('button', { name: 'Mapa: 43.5, 22.1' })).toBeInTheDocument();
        });

        it('can be taken away again, which empties both values', async () => {
            const { user, data } = renderFields({ lat: '43.5', lng: '22.1' });

            await user.click(screen.getByRole('button', { name: 'Ukloni lokaciju' }));

            expect(data()).toMatchObject({ lat: '', lng: '' });
            expect(screen.getByRole('button', { name: 'Mapa: bez tačke' })).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'Ukloni lokaciju' })).not.toBeInTheDocument();
        });

        it('counts half a point as no point', () => {
            renderFields({ lat: '43.5', lng: '' });

            expect(screen.getByRole('button', { name: 'Mapa: bez tačke' })).toBeInTheDocument();
        });

        it('shows an error on either coordinate once, under the map', () => {
            const { unmount } = render(
                <ProducerFormHarness errors={{ lat: 'Tačka je van Srbije.', lng: 'Dužina nije ispravna.' }}>
                    {(fields) => <BasicsFields {...fields} />}
                </ProducerFormHarness>,
            );
            expect(screen.getByText('Tačka je van Srbije.')).toBeVisible();
            expect(screen.queryByText('Dužina nije ispravna.')).not.toBeInTheDocument();
            unmount();

            renderFields({}, { lng: 'Dužina nije ispravna.' });
            expect(screen.getByText('Dužina nije ispravna.')).toBeVisible();
        });
    });
});
