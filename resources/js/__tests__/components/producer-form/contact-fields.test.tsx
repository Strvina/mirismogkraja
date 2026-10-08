import { ProducerFormHarness } from '@/__tests__/support/producer-form';
import { createUser } from '@/__tests__/support/render';
import ContactFields from '@/components/producer-form/contact-fields';
import { type ProducerFormData } from '@/components/producer-form/types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

function renderFields(initial: Partial<ProducerFormData> = {}, errors: Partial<Record<keyof ProducerFormData, string>> = {}) {
    const onData = vi.fn();

    render(
        <ProducerFormHarness initial={initial} errors={errors} onData={onData}>
            {(fields) => <ContactFields {...fields} />}
        </ProducerFormHarness>,
    );

    return {
        user: createUser(),
        methods: () => (onData.mock.lastCall?.[0] as ProducerFormData).delivery_methods,
        data: () => onData.mock.lastCall?.[0] as ProducerFormData,
        ownMethod: screen.getByRole('textbox', { name: 'Svoj način dostave' }),
        add: screen.getByRole('button', { name: 'Dodaj' }),
    };
}

describe('ContactFields', () => {
    it('takes a phone and an e-mail for buyers to reach the producer', async () => {
        const { user, data } = renderFields();

        await user.type(screen.getByLabelText('Telefon za kontakt'), '064 123 4567');
        await user.type(screen.getByLabelText('Email za kontakt'), 'zapis@example.com');

        expect(screen.getByLabelText('Email za kontakt')).toHaveAttribute('type', 'email');
        expect(data()).toMatchObject({ phone: '064 123 4567', contact_email: 'zapis@example.com' });
    });

    it("shows the server's message under each field", () => {
        renderFields(
            {},
            { phone: 'Telefon nije ispravan.', contact_email: 'Email adresa nije ispravna.', delivery_methods: 'Izaberite bar jedan način.' },
        );

        expect(screen.getByText('Telefon nije ispravan.')).toBeVisible();
        expect(screen.getByText('Email adresa nije ispravna.')).toBeVisible();
        expect(screen.getByText('Izaberite bar jedan način.')).toBeVisible();
    });

    describe('the usual ways of delivery', () => {
        it('are three checkboxes in one group, none ticked to begin with', () => {
            renderFields();

            expect(screen.getByRole('group', { name: 'Način dostave' })).toBeInTheDocument();
            expect(screen.getAllByRole('checkbox').map((box) => (box as HTMLInputElement).checked)).toEqual([false, false, false]);
            expect(screen.getByRole('checkbox', { name: 'Lična dostava' })).toBeInTheDocument();
            expect(screen.getByRole('checkbox', { name: 'Kurirska služba' })).toBeInTheDocument();
            expect(screen.getByRole('checkbox', { name: 'Lično preuzimanje' })).toBeInTheDocument();
        });

        it('are saved under the keys the server knows, in the order they were ticked', async () => {
            const { user, methods } = renderFields();

            await user.click(screen.getByRole('checkbox', { name: 'Lično preuzimanje' }));
            await user.click(screen.getByRole('checkbox', { name: 'Lična dostava' }));

            expect(methods()).toEqual(['preuzimanje', 'licna_dostava']);
        });

        it('show as ticked when already saved, and can be unticked', async () => {
            const { user, methods } = renderFields({ delivery_methods: ['kurirska_sluzba', 'preuzimanje'] });
            const courier = screen.getByRole('checkbox', { name: 'Kurirska služba' });

            expect(courier).toBeChecked();
            expect(screen.getByRole('checkbox', { name: 'Lična dostava' })).not.toBeChecked();

            await user.click(courier);

            expect(courier).not.toBeChecked();
            expect(methods()).toEqual(['preuzimanje']);
        });
    });

    describe("the producer's own way of delivery", () => {
        it('cannot be added while nothing is typed', async () => {
            const { user, ownMethod, add } = renderFields();

            expect(add).toBeDisabled();

            await user.type(ownMethod, '   ');
            expect(add).toBeDisabled();

            await user.type(ownMethod, 'Autobusom');
            expect(add).toBeEnabled();
        });

        it('is added with the button, trimmed, and the field is emptied for the next one', async () => {
            const { user, methods, ownMethod, add } = renderFields();

            await user.type(ownMethod, '  Autobusom do Niša ');
            await user.click(add);

            expect(methods()).toEqual(['Autobusom do Niša']);
            expect(screen.getByText('Autobusom do Niša')).toBeVisible();
            expect(ownMethod).toHaveValue('');
        });

        it('is added on Enter without sending the whole form', async () => {
            const { user, methods, ownMethod } = renderFields();
            const submitted = vi.fn((event: Event) => event.preventDefault());
            document.querySelector('form')?.addEventListener('submit', submitted);

            await user.type(ownMethod, 'Autobusom do Niša{Enter}');

            expect(methods()).toEqual(['Autobusom do Niša']);
            expect(submitted).not.toHaveBeenCalled();
        });

        it('is kept alongside the usual ways', async () => {
            const { user, methods, ownMethod, add } = renderFields({ delivery_methods: ['preuzimanje'] });

            await user.type(ownMethod, 'Autobusom do Niša');
            await user.click(add);

            expect(methods()).toEqual(['preuzimanje', 'Autobusom do Niša']);
            expect(screen.getByRole('checkbox', { name: 'Lično preuzimanje' })).toBeChecked();
        });

        it('is not added a second time', async () => {
            const { user, methods, ownMethod, add } = renderFields({ delivery_methods: ['Autobusom do Niša'] });

            await user.type(ownMethod, 'Autobusom do Niša');
            await user.click(add);

            expect(methods()).toEqual(['Autobusom do Niša']);
            expect(ownMethod).toHaveValue('');
        });

        it('shows the ones already saved, and only those: a usual way is a checkbox, not a chip', () => {
            renderFields({ delivery_methods: ['preuzimanje', 'Autobusom do Niša', 'Lično na pijaci'] });

            expect(screen.getByRole('button', { name: 'Ukloni „Autobusom do Niša”' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Ukloni „Lično na pijaci”' })).toBeInTheDocument();
            expect(screen.getAllByRole('button', { name: /^Ukloni/ })).toHaveLength(2);
        });

        it('can be removed again', async () => {
            const { user, methods } = renderFields({ delivery_methods: ['preuzimanje', 'Autobusom do Niša'] });

            await user.click(screen.getByRole('button', { name: 'Ukloni „Autobusom do Niša”' }));

            expect(methods()).toEqual(['preuzimanje']);
            expect(screen.queryByText('Autobusom do Niša')).not.toBeInTheDocument();
        });

        it('takes no more than sixty characters', () => {
            const { ownMethod } = renderFields();

            expect(ownMethod).toHaveAttribute('maxlength', '60');
        });
    });
});
