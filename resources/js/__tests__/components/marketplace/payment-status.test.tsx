import { HowItWorks, linkedSlipId, PaymentStatusBadge } from '@/components/marketplace/payment-status';
import { loadLocale } from '@/lib/i18n';
import { render, screen } from '@testing-library/react';
import { Banknote, MousePointerClick, Rocket } from 'lucide-react';
import { describe, expect, it } from 'vitest';

describe('PaymentStatusBadge', () => {
    it.each([
        ['pending_payment', 'Čeka uplatu'],
        ['active', 'Aktivno'],
        ['expired', 'Isteklo'],
        ['cancelled', 'Otkazano'],
    ] as const)('calls %s "%s"', (status, label) => {
        render(<PaymentStatusBadge status={status} />);

        expect(screen.getByText(label)).toBeVisible();
    });

    it("uses the page's own word when it has a better one", () => {
        render(<PaymentStatusBadge status="active" label="Čeka red" />);

        expect(screen.getByText('Čeka red')).toBeVisible();
        expect(screen.queryByText('Aktivno')).not.toBeInTheDocument();
    });

    it('translates the status', async () => {
        await loadLocale('en');
        render(<PaymentStatusBadge status="pending_payment" />);

        expect(screen.queryByText('Čeka uplatu')).not.toBeInTheDocument();
    });
});

describe('HowItWorks', () => {
    it('numbers the steps in the order they were given', () => {
        render(
            <HowItWorks
                steps={[
                    { icon: MousePointerClick, title: 'Izaberite paket', text: 'Izbor još nije plaćanje.' },
                    { icon: Banknote, title: 'Platite uplatnicom', text: 'Skenirajte QR kod.' },
                    { icon: Rocket, title: 'Počinje kad vidimo uplatu', text: 'Javljamo vam obaveštenjem.' },
                ]}
            />,
        );

        expect(screen.getAllByRole('listitem').map((step) => step.textContent)).toEqual([
            'Korak 1Izaberite paketIzbor još nije plaćanje.',
            'Korak 2Platite uplatnicomSkenirajte QR kod.',
            'Korak 3Počinje kad vidimo uplatuJavljamo vam obaveštenjem.',
        ]);
    });
});

describe('linkedSlipId', () => {
    const at = (address: string) => window.history.replaceState(null, '', address);

    it('reads the slip a notification pointed at', () => {
        at('/clanarina?uplatnica=12');

        expect(linkedSlipId()).toBe(12);
    });

    it('finds it among other parameters', () => {
        at('/isticanje?tab=aktivno&uplatnica=7#lista');

        expect(linkedSlipId()).toBe(7);
    });

    it.each([
        '/clanarina',
        '/clanarina?uplatnica=',
        '/clanarina?uplatnica=abc',
        '/clanarina?uplatnica=0',
        '/clanarina?uplatnica=-3',
        '/clanarina?uplatnica=1.5',
    ])('is nothing for %s', (address) => {
        at(address);

        expect(linkedSlipId()).toBeNull();
    });
});
