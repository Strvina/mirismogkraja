import { lastVisit } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import Footer from '@/components/marketplace/footer';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('Footer', () => {
    it('gives the address visitors write to, as the site is configured', () => {
        renderOnPage(<Footer />, { props: { contactEmail: 'zdravo@vrelinajuga.rs' } });

        expect(screen.getByRole('link', { name: 'zdravo@vrelinajuga.rs' })).toHaveAttribute('href', 'mailto:zdravo@vrelinajuga.rs');
    });

    it('links to the terms and the privacy policy', () => {
        renderOnPage(<Footer />);

        expect(screen.getByRole('link', { name: 'Uslovi korišćenja' })).toHaveAttribute('href', route('legal.terms'));
        expect(screen.getByRole('link', { name: 'Politika privatnosti' })).toHaveAttribute('href', route('legal.privacy'));
    });

    it('swaps the page instead of reloading the site when a link is followed', async () => {
        const { user } = renderOnPage(<Footer />);

        await user.click(screen.getByRole('link', { name: 'Česta pitanja' }));

        expect(lastVisit()).toMatchObject({ method: 'get', url: route('info.faq') });
    });
});
