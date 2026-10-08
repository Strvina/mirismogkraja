import { makeUser } from '@/__tests__/support/factories';
import { renderOnPage } from '@/__tests__/support/render';
import VerifyEmailBanner from '@/components/marketplace/verify-email-banner';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('VerifyEmailBanner', () => {
    it('is not shown to a guest', () => {
        const { container } = renderOnPage(<VerifyEmailBanner />);

        expect(container).toBeEmptyDOMElement();
    });

    it('is not shown to someone who has confirmed their address', () => {
        const { container } = renderOnPage(<VerifyEmailBanner />, {
            props: { auth: { user: makeUser({ email_verified_at: '2026-01-10T08:00:00Z' }) } },
        });

        expect(container).toBeEmptyDOMElement();
    });

    it('tells someone who has not which address to confirm and what stays closed until then', () => {
        renderOnPage(<VerifyEmailBanner />, {
            props: { auth: { user: makeUser({ email: 'milica@example.com', email_verified_at: null }) } },
        });

        expect(
            screen.getByText(
                'Potvrdite email adresu milica@example.com preko linka koji smo vam poslali. Do tada ne možete da šaljete poruke, ocenjujete ni otvorite profil proizvođača.',
            ),
        ).toBeVisible();
    });

    it('offers the way to another confirmation e-mail', () => {
        renderOnPage(<VerifyEmailBanner />, { props: { auth: { user: makeUser({ email_verified_at: null }) } } });

        expect(screen.getByRole('link', { name: 'Niste dobili mejl?' })).toHaveAttribute('href', route('verification.notice'));
    });
});
