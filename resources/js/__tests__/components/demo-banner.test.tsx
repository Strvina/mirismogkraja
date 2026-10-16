import { makeUser } from '@/__tests__/support/factories';
import { renderOnPage } from '@/__tests__/support/render';
import DemoBanner from '@/components/demo-banner';
import Login from '@/pages/auth/login';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('a public demo', () => {
    it('says on every page that it is one, and where to sign in', () => {
        renderOnPage(<DemoBanner />, { props: { demo: true, auth: { user: null } } });

        expect(screen.getByText(/Ovo je demo sajta/)).toBeVisible();
        expect(screen.getByRole('link', { name: 'Prijavite se demo nalogom' })).toBeVisible();
    });

    it('does not ask a signed-in visitor to sign in', () => {
        renderOnPage(<DemoBanner />, { props: { demo: true, auth: { user: makeUser() } } });

        expect(screen.getByText(/Ovo je demo sajta/)).toBeVisible();
        expect(screen.queryByRole('link', { name: 'Prijavite se demo nalogom' })).not.toBeInTheDocument();
    });

    it('shows nothing on the real site', () => {
        renderOnPage(<DemoBanner />, { props: { demo: false } });

        expect(screen.queryByText(/Ovo je demo sajta/)).not.toBeInTheDocument();
    });

    it('fills in a demo account on the sign-in page', async () => {
        const { user } = renderOnPage(<Login canResetPassword googleEnabled={false} />, { props: { demo: true } });

        await user.click(screen.getByRole('button', { name: 'Proizvođač' }));

        expect(screen.getByLabelText('Email adresa')).toHaveValue('nicic@example.com');
        expect(screen.getByLabelText('Lozinka')).toHaveValue('password');
    });

    it('offers no demo accounts on the real site', () => {
        renderOnPage(<Login canResetPassword googleEnabled={false} />, { props: { demo: false } });

        expect(screen.queryByText('Demo nalozi')).not.toBeInTheDocument();
    });
});
