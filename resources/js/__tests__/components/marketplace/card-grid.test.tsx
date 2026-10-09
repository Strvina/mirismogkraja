import { emitRouterEvent, setPage } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import CardGrid from '@/components/marketplace/card-grid';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const grid = () => screen.getByTestId('card').parentElement as HTMLElement;

const cards = (
    <CardGrid className="grid-cols-2">
        <article data-testid="card">Domaći ajvar</article>
    </CardGrid>
);

// Whether the visitor has clicked through yet only ever goes one way, as in
// a browser tab: the tests run in that order.
describe('CardGrid', () => {
    it('paints the cards as they are on the page the visitor loaded', () => {
        renderOnPage(cards, { url: '/proizvodi' });

        expect(grid()).toHaveClass('grid', 'grid-cols-2');
        expect(grid()).not.toHaveClass('stagger-in');
    });

    it('lets the cards rise in once the visitor moves around the site', () => {
        emitRouterEvent('start');
        renderOnPage(cards, { url: '/proizvodi?page=2' });

        expect(grid()).toHaveClass('stagger-in');
    });

    it('draws a new set of cards when the list changes, so the motion plays again', () => {
        renderOnPage(cards, { url: '/proizvodi?page=2' });
        const before = grid();

        setPage({ url: '/proizvodi?page=3' });

        expect(grid()).not.toBe(before);
    });

    it('keeps the same cards when the page re-renders at the same address', () => {
        renderOnPage(cards, { url: '/proizvodi?page=2' });
        const before = grid();

        setPage({ props: { unreadMessages: 1 } });

        expect(grid()).toBe(before);
    });
});
