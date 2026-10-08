import { lastVisit, visits } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import ContactCard from '@/components/producer-page/contact-card';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

interface Contact {
    has_phone?: boolean;
    contact_email?: string | null;
    address?: string | null;
}

function renderCard({ has_phone = true, contact_email = null, address = null }: Contact = {}, phone?: string | null) {
    return renderOnPage(<ContactCard producer={{ id: 7, has_phone, contact_email, address }} phone={phone} />);
}

/** Following a tel:, mailto: or app link would leave the test page. */
function stay(link: HTMLElement) {
    link.addEventListener('click', (event) => event.preventDefault());

    return link;
}

describe('ContactCard', () => {
    let beacon: MockInstance<typeof navigator.sendBeacon>;

    beforeEach(() => {
        beacon = vi.spyOn(navigator, 'sendBeacon').mockReturnValue(true);
    });

    it('is not there for a producer who gave no way to reach them', () => {
        const { container } = renderCard({ has_phone: false });

        expect(container).toBeEmptyDOMElement();
    });

    describe('the phone number', () => {
        it('is not in the page until asked for', () => {
            const { container } = renderCard();

            expect(screen.getByRole('button', { name: 'Prikaži broj' })).toBeInTheDocument();
            expect(container).not.toHaveTextContent(/\d{3}/);
            expect(screen.queryByRole('link')).not.toBeInTheDocument();
        });

        it('is fetched alone on "Prikaži broj", and the reveal is counted', async () => {
            const { user } = renderCard();

            await user.click(screen.getByRole('button', { name: 'Prikaži broj' }));

            expect(beacon).toHaveBeenCalledExactlyOnceWith(route('statistics.click', [7, 'phone_reveal']));
            expect(lastVisit()).toMatchObject({ reload: true, options: { only: ['phone'] } });
        });

        it('says it is loading and cannot be asked for twice meanwhile', async () => {
            const { user } = renderCard();

            await user.click(screen.getByRole('button', { name: 'Prikaži broj' }));

            expect(screen.getByRole('button', { name: 'Učitavanje…' })).toBeDisabled();
            expect(visits()).toHaveLength(1);
        });

        it('can be asked for again if the request fails', async () => {
            const { user } = renderCard();

            await user.click(screen.getByRole('button', { name: 'Prikaži broj' }));
            lastVisit().drop();

            expect(screen.getByRole('button', { name: 'Prikaži broj' })).toBeEnabled();
        });

        it('is a link that dials, once it has arrived', () => {
            renderCard({}, '018 123 456');

            expect(screen.getByRole('link', { name: '018 123 456' })).toHaveAttribute('href', 'tel:018 123 456');
            expect(screen.queryByRole('button', { name: 'Prikaži broj' })).not.toBeInTheDocument();
        });

        it('comes with Viber and WhatsApp when it is a mobile number', () => {
            renderCard({}, '064 123 4567');

            expect(screen.getByRole('link', { name: 'Viber' })).toHaveAttribute('href', 'viber://chat?number=%2B381641234567');
            expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', 'https://wa.me/381641234567');
        });

        it('comes with neither when it is a landline, which has no app behind it', () => {
            renderCard({}, '018 123 456');

            expect(screen.queryByRole('link', { name: 'Viber' })).not.toBeInTheDocument();
            expect(screen.queryByRole('link', { name: 'WhatsApp' })).not.toBeInTheDocument();
        });

        it.each([
            ['Viber', 'viber_click'],
            ['WhatsApp', 'whatsapp_click'],
        ])('counts a click on %s', async (app, event) => {
            const { user } = renderCard({}, '064 123 4567');

            await user.click(stay(screen.getByRole('link', { name: app })));

            expect(beacon).toHaveBeenCalledExactlyOnceWith(route('statistics.click', [7, event]));
        });

        it('is left out, button and all, for a producer who gave none', () => {
            renderCard({ has_phone: false, contact_email: 'zapis@example.com' });

            expect(screen.queryByText('Telefon')).not.toBeInTheDocument();
            expect(screen.queryByRole('button')).not.toBeInTheDocument();
        });
    });

    it('shows the e-mail as a link that writes, and counts the click', async () => {
        const { user } = renderCard({ has_phone: false, contact_email: 'zapis@example.com' });
        const email = screen.getByRole('link', { name: 'zapis@example.com' });

        expect(email).toHaveAttribute('href', 'mailto:zapis@example.com');

        await user.click(stay(email));

        expect(beacon).toHaveBeenCalledExactlyOnceWith(route('statistics.click', [7, 'email_click']));
    });

    it('shows the address as plain text', () => {
        renderCard({ has_phone: false, address: 'Glavna 1, Svrljig' });

        expect(screen.getByText('Glavna 1, Svrljig')).toBeVisible();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('shows all three side by side', () => {
        renderCard({ has_phone: true, contact_email: 'zapis@example.com', address: 'Glavna 1, Svrljig' }, '064 123 4567');

        expect(screen.getByText('Telefon')).toBeVisible();
        expect(screen.getByText('Email')).toBeVisible();
        expect(screen.getByText('Adresa')).toBeVisible();
    });
});
