import { createUser } from '@/__tests__/support/render';
import FeaturedSection from '@/components/marketplace/featured-section';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

function renderSection() {
    render(
        <FeaturedSection
            title="Istaknuti proizvodi"
            listLabel="Svi proizvodi"
            explanation={<p>Proizvođači su platili da ovi proizvodi budu istaknuti.</p>}
        >
            {[<article key="a">Domaći ajvar</article>, <article key="b">Bagremov med</article>]}
        </FeaturedSection>,
    );

    return { user: createUser() };
}

describe('FeaturedSection', () => {
    it('sets the paid cards apart under a heading of their own', () => {
        renderSection();

        expect(screen.getByRole('heading', { name: 'Istaknuti proizvodi' })).toBeVisible();
        expect(screen.getByText('Domaći ajvar')).toBeVisible();
        expect(screen.getByText('Bagremov med')).toBeVisible();
    });

    it('draws a labelled line between them and the ordinary list', () => {
        renderSection();

        expect(screen.getByRole('separator', { name: 'Svi proizvodi' })).toHaveTextContent('Svi proizvodi');
    });

    it('explains what earns a place there, behind a question mark named after the row', async () => {
        const { user } = renderSection();

        expect(screen.queryByText('Proizvođači su platili da ovi proizvodi budu istaknuti.')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Šta znači „Istaknuti proizvodi”?' }));

        expect(within(screen.getByRole('dialog')).getByText('Proizvođači su platili da ovi proizvodi budu istaknuti.')).toBeVisible();
    });
});
