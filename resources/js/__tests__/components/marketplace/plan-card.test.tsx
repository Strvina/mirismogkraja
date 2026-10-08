import PlanCard, { type Plan } from '@/components/marketplace/plan-card';
import { loadLocale } from '@/lib/i18n';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const plan = (overrides: Partial<Plan> = {}): Plan => ({
    id: 2,
    name: 'Premium',
    description: null,
    price_rsd: 5990,
    features: null,
    level: 2,
    ...overrides,
});

const LABELS = { statistics: 'Statistika poseta i upita', badge: 'Oznaka Premium na profilu' };

describe('PlanCard', () => {
    it('shows the name and the yearly price, grouped as dinars are written', () => {
        render(<PlanCard plan={plan()} featureLabels={LABELS} />);

        expect(screen.getByRole('heading', { name: 'Premium' })).toBeVisible();
        expect(screen.getByText(/5\.990/)).toHaveTextContent('5.990 RSD / god');
    });

    it("groups the price the reader's way", async () => {
        await loadLocale('en');
        render(<PlanCard plan={plan()} featureLabels={LABELS} />);

        expect(screen.getByText(/5,990/)).toBeVisible();
    });

    it('lists what the plan unlocks in plain words', () => {
        render(<PlanCard plan={plan({ features: ['statistics', 'badge'] })} featureLabels={LABELS} />);

        expect(screen.getAllByRole('listitem').map((feature) => feature.textContent)).toEqual([
            'Statistika poseta i upita',
            'Oznaka Premium na profilu',
        ]);
    });

    it('shows a feature it has no words for by its key rather than dropping it', () => {
        render(<PlanCard plan={plan({ features: ['statistics', 'csv_export'] })} featureLabels={LABELS} />);

        expect(screen.getAllByRole('listitem').map((feature) => feature.textContent)).toEqual(['Statistika poseta i upita', 'csv_export']);
    });

    it.each([[null], [[]]])('has no list for a plan with no features (%j)', (features) => {
        render(<PlanCard plan={plan({ features })} featureLabels={LABELS} />);

        expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    it('shows the description when the plan has one', () => {
        render(<PlanCard plan={plan({ description: 'Za proizvođače koji žele više upita.' })} featureLabels={LABELS} />);

        expect(screen.getByText('Za proizvođače koji žele više upita.')).toBeVisible();
    });

    it('carries what the page lets the reader do with the plan', () => {
        render(
            <PlanCard plan={plan()} featureLabels={LABELS}>
                <button type="button">Izaberi paket</button>
            </PlanCard>,
        );

        expect(screen.getByRole('button', { name: 'Izaberi paket' })).toBeInTheDocument();
    });
});
