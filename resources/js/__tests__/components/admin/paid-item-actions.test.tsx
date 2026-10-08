import { lastVisit, visits } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import PaidItemActions, { PaidItemRow, type PaidItemFields } from '@/components/admin/paid-item-actions';
import ConfirmHost from '@/components/confirm-host';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const item = (overrides: Partial<PaidItemFields> = {}): PaidItemFields => ({
    id: 12,
    status: 'pending_payment',
    amount_rsd: 5990,
    paid_kind: 'clanarina',
    anchor: 'clanarina-12',
    ...overrides,
});

function renderActions(fields: PaidItemFields, onConfirm?: () => void) {
    return renderOnPage(
        <>
            <PaidItemActions item={fields} what="članarinu za Mlekara Zapis" onConfirm={onConfirm} />
            <ConfirmHost />
        </>,
    );
}

describe('PaidItemActions', () => {
    describe('a request that is not paid yet', () => {
        it('can be confirmed as paid, which is left to the page', async () => {
            const onConfirm = vi.fn();
            const { user } = renderActions(item(), onConfirm);

            await user.click(screen.getByRole('button', { name: 'Uplata primljena' }));

            expect(onConfirm).toHaveBeenCalledTimes(1);
            expect(visits()).toHaveLength(0);
        });

        it('can be cancelled at once, with no question asked', async () => {
            const { user } = renderActions(item({ paid_kind: 'isticanje', id: 31 }), vi.fn());

            await user.click(screen.getByRole('button', { name: 'Otkaži' }));

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            expect(lastVisit()).toMatchObject({
                method: 'patch',
                url: route('admin.paid.cancel', ['isticanje', 31]),
                options: { preserveScroll: true },
            });
        });

        it('offers no confirmation where the page has none to offer', () => {
            renderActions(item());

            expect(screen.queryByRole('button', { name: 'Uplata primljena' })).not.toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Otkaži' })).toBeInTheDocument();
        });
    });

    describe('something that is running', () => {
        it('can only be deactivated', () => {
            renderActions(item({ status: 'active' }), vi.fn());

            expect(screen.getAllByRole('button')).toHaveLength(1);
            expect(screen.getByRole('button', { name: 'Deaktiviraj' })).toBeInTheDocument();
        });

        it('asks first, naming what would stop', async () => {
            const { user } = renderActions(item({ status: 'active' }));

            await user.click(screen.getByRole('button', { name: 'Deaktiviraj' }));

            const dialog = screen.getByRole('dialog');

            expect(dialog).toHaveAccessibleName('Deaktivirati članarinu za Mlekara Zapis?');
            expect(dialog).toHaveAccessibleDescription(/Prestaje odmah i prelazi u otkazane/);
            expect(visits()).toHaveLength(0);
        });

        it('cancels it on the server after a yes', async () => {
            const { user } = renderActions(item({ status: 'active', paid_kind: 'kampanja', id: 5 }));

            await user.click(screen.getByRole('button', { name: 'Deaktiviraj' }));
            await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Obriši' }));

            expect(lastVisit()).toMatchObject({ method: 'patch', url: route('admin.paid.cancel', ['kampanja', 5]) });
        });

        it('does nothing after a no', async () => {
            const { user } = renderActions(item({ status: 'active' }));

            await user.click(screen.getByRole('button', { name: 'Deaktiviraj' }));
            await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Odustani' }));

            expect(visits()).toHaveLength(0);
        });
    });

    it.each(['expired', 'cancelled'])('offers nothing for what is %s', (status) => {
        renderActions(item({ status }), vi.fn());

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});

describe('PaidItemRow', () => {
    it('shows what it is, its facts and its actions, under the anchor a notification points at', () => {
        const { container } = renderOnPage(
            <PaidItemRow
                item={item()}
                title="Mlekara Zapis"
                subtitle="Premium, godinu dana"
                facts={['5.990 RSD', 'Poziv na broj 12-2026']}
                actions={<button type="button">Uplata primljena</button>}
            />,
        );

        expect(container.querySelector('#clanarina-12')).toBeInTheDocument();
        expect(screen.getByText('Mlekara Zapis')).toBeVisible();
        expect(screen.getByText('Premium, godinu dana')).toBeVisible();
        expect(screen.getAllByRole('listitem').map((fact) => fact.textContent)).toEqual(['5.990 RSD', 'Poziv na broj 12-2026']);
        expect(screen.getByRole('button', { name: 'Uplata primljena' })).toBeInTheDocument();
    });

    it('leaves out the subtitle and the actions it was not given', () => {
        renderOnPage(<PaidItemRow item={item()} title="Mlekara Zapis" facts={['5.990 RSD']} />);

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(1);
    });
});
