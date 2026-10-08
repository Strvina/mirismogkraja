import { freezeDate, renderOnPage } from '@/__tests__/support/render';
import WantedAdCard, { WantedAdFacts, type WantedAdSummary } from '@/components/marketplace/wanted-ad-card';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const ad = (overrides: Partial<WantedAdSummary> = {}): WantedAdSummary => ({
    id: 12,
    title: 'Paprika za ajvar, 50 kg',
    excerpt: 'Treba mi do kraja septembra, mogu da dođem po nju.',
    quantity: '50 kg',
    city: 'Niš',
    category: 'Povrće',
    author: 'Milica',
    created_at: '2026-10-10T10:00:00Z',
    responses_count: 3,
    ...overrides,
});

describe('WantedAdFacts', () => {
    it('puts category, quantity and place on one line', () => {
        const { container } = renderOnPage(<WantedAdFacts ad={{ category: 'Povrće', quantity: '50 kg', city: 'Niš' }} />);

        expect(container).toHaveTextContent('Povrće50 kgNiš');
    });

    it('shows only what the buyer filled in', () => {
        const { container } = renderOnPage(<WantedAdFacts ad={{ category: null, quantity: '50 kg', city: null }} />);

        expect(container).toHaveTextContent(/^50 kg$/);
    });

    it('takes no room when the buyer filled in none of them', () => {
        const { container } = renderOnPage(<WantedAdFacts ad={{ category: null, quantity: null, city: null }} />);

        expect(container).toBeEmptyDOMElement();
    });
});

describe('WantedAdCard', () => {
    const card = () => screen.getByRole('link');

    it('leads to the ad and says what is wanted', () => {
        renderOnPage(<WantedAdCard ad={ad()} />);

        expect(card()).toHaveAttribute('href', route('wanted.show', 12));
        expect(screen.getByRole('heading', { name: 'Paprika za ajvar, 50 kg' })).toBeVisible();
        expect(screen.getByText('Treba mi do kraja septembra, mogu da dođem po nju.')).toBeVisible();
    });

    it('says who is asking, how long ago, and how many producers have answered', () => {
        freezeDate('2026-10-12T10:00:00Z');
        renderOnPage(<WantedAdCard ad={ad()} />);

        expect(card()).toHaveTextContent('Milica · pre 2 dana');
        expect(screen.getByText('Odgovora: 3')).toBeVisible();
    });

    it('says so when nobody has answered yet', () => {
        renderOnPage(<WantedAdCard ad={ad({ responses_count: 0 })} />);

        expect(screen.getByText('Odgovora: 0')).toBeVisible();
    });

    it('shows the author on their own open ad as on any other', () => {
        renderOnPage(<WantedAdCard ad={ad()} state="open" />);

        expect(card()).toHaveTextContent('Milica ·');
        expect(card()).not.toHaveTextContent('Otvoren');
    });

    it.each([
        ['expired', 'Istekao'],
        ['closed', 'Zatvoren'],
        ['blocked', 'Sklonjen'],
    ] as const)('tells the author their ad is %s ("%s") in place of their own name', (state, label) => {
        renderOnPage(<WantedAdCard ad={ad()} state={state} />);

        expect(screen.getByText(label)).toBeVisible();
        expect(card()).not.toHaveTextContent('Milica');
    });
});
