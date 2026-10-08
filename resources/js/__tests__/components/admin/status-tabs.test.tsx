import { lastVisit } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import StatusTabs from '@/components/admin/status-tabs';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const tabs = [
    { status: 'pending_payment', label: 'Čeka uplatu' },
    { status: 'active', label: 'Aktivno' },
    { status: 'expired', label: 'Isteklo' },
];

function renderTabs(counts: Record<string, number>, current = 'pending_payment') {
    const view = renderOnPage(
        <StatusTabs routeName="admin.memberships.index" current={current} settingsLabel="Paketi i cene" tabs={tabs} counts={counts} />,
    );

    return { ...view, nav: screen.getByRole('navigation', { name: 'Kartice' }) };
}

describe('StatusTabs', () => {
    it('puts the settings first, then one tab per status with how many items it holds', () => {
        const { nav } = renderTabs({ pending_payment: 3, active: 12, expired: 0 });

        expect(
            within(nav)
                .getAllByRole('link')
                .map((link) => link.textContent),
        ).toEqual(['Paketi i cene', 'Čeka uplatu3', 'Aktivno12', 'Isteklo0']);
    });

    it('counts a tab the server said nothing about as empty', () => {
        const { nav } = renderTabs({ pending_payment: 1 });

        expect(within(nav).getByRole('link', { name: /Aktivno/ })).toHaveTextContent('Aktivno0');
        expect(within(nav).getByRole('link', { name: /Isteklo/ })).toHaveTextContent('Isteklo0');
    });

    it('makes each tab a visit of its own, so the server loads only that tab', () => {
        const { nav } = renderTabs({ pending_payment: 3, active: 12, expired: 0 });

        expect(within(nav).getByRole('link', { name: 'Paketi i cene' })).toHaveAttribute(
            'href',
            route('admin.memberships.index', { status: 'settings' }),
        );
        expect(within(nav).getByRole('link', { name: /Čeka uplatu/ })).toHaveAttribute(
            'href',
            route('admin.memberships.index', { status: 'pending_payment' }),
        );
        expect(within(nav).getByRole('link', { name: /Aktivno/ })).toHaveAttribute('href', route('admin.memberships.index', { status: 'active' }));
    });

    it('keeps the page where it is when the tab changes', async () => {
        const { user, nav } = renderTabs({ pending_payment: 3, active: 12, expired: 0 });

        await user.click(within(nav).getByRole('link', { name: /Aktivno/ }));

        expect(lastVisit()).toMatchObject({
            method: 'get',
            url: route('admin.memberships.index', { status: 'active' }),
            options: { preserveScroll: true },
        });
    });
});
