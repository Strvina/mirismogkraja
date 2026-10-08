import { createUser } from '@/__tests__/support/render';
import PaymentSlipDialog, { type PaymentSlip } from '@/components/marketplace/payment-slip-dialog';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const slip = (overrides: Partial<PaymentSlip> = {}): PaymentSlip => ({
    recipient: 'Vrelina juga d.o.o.',
    recipient_address: 'Obrenovićeva 10, Niš',
    account: '160-0000000123456-78',
    purpose: 'Članarina Premium',
    payment_code: '221',
    model: '97',
    reference: '12-2026',
    amount: '5.990,00',
    payer: 'Mlekara Zapis, Niš',
    qr_url: '/uplatnica/12/qr.png',
    ...overrides,
});

function renderDialog(overrides: Partial<PaymentSlip> = {}, open = true) {
    const onOpenChange = vi.fn();
    const user = createUser();

    render(<PaymentSlipDialog slip={slip(overrides)} downloadUrl="/uplatnica/12.pdf" open={open} onOpenChange={onOpenChange} />);

    return { user, onOpenChange };
}

/** The slip as label → value, the way it is read off the paper form. */
function rows(): Record<string, string> {
    const terms = screen.getAllByRole('term');
    const values = screen.getAllByRole('definition');

    return Object.fromEntries(terms.map((term, index) => [term.textContent, values[index].textContent]));
}

describe('PaymentSlipDialog', () => {
    it('shows nothing while it is closed', () => {
        renderDialog({}, false);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('lays the slip out field by field, always in dinars', () => {
        renderDialog();

        expect(screen.getByRole('dialog')).toHaveAccessibleName('Nalog za uplatu');
        expect(rows()).toEqual({
            Platilac: 'Mlekara Zapis, Niš',
            'Svrha uplate': 'Članarina Premium',
            Primalac: 'Vrelina juga d.o.o., Obrenovićeva 10, Niš',
            'Šifra plaćanja': '221',
            Valuta: 'RSD',
            Iznos: '5.990,00',
            'Račun primaoca': '160-0000000123456-78',
            Model: '97',
            'Poziv na broj': '12-2026',
        });
    });

    it('names the recipient alone when no address is configured', () => {
        renderDialog({ recipient_address: '' });

        expect(rows().Primalac).toBe('Vrelina juga d.o.o.');
    });

    it('shows the QR code a banking app reads', () => {
        renderDialog();

        expect(screen.getByRole('img', { name: 'IPS QR kod za plaćanje' })).toHaveAttribute('src', '/uplatnica/12/qr.png');
    });

    it('offers to copy exactly the three fields that are typed in by hand', () => {
        renderDialog();

        expect(
            within(screen.getByRole('dialog'))
                .getAllByRole('button', { name: /^Kopiraj: / })
                .map((button) => button.getAttribute('aria-label')),
        ).toEqual(['Kopiraj: Iznos', 'Kopiraj: Račun primaoca', 'Kopiraj: Poziv na broj']);
    });

    it.each([
        ['Iznos', '5.990,00'],
        ['Račun primaoca', '160-0000000123456-78'],
        ['Poziv na broj', '12-2026'],
    ])('copies "%s" as it is printed', async (field, value) => {
        const { user } = renderDialog();

        await user.click(screen.getByRole('button', { name: `Kopiraj: ${field}` }));

        expect(await navigator.clipboard.readText()).toBe(value);
    });

    it('survives a browser that refuses the clipboard', async () => {
        const { user } = renderDialog();
        vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('NotAllowedError'));

        await user.click(screen.getByRole('button', { name: 'Kopiraj: Iznos' }));

        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('hands the PDF to the browser as a file the server built', () => {
        renderDialog();

        const download = screen.getByRole('link', { name: 'Preuzmi uplatnicu (PDF)' });

        expect(download).toHaveAttribute('href', '/uplatnica/12.pdf');
        expect(download).toHaveAttribute('download');
    });

    it('asks the page to close it', async () => {
        const { user, onOpenChange } = renderDialog();

        await user.click(screen.getByRole('button', { name: 'Zatvori' }));

        expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    });
});
