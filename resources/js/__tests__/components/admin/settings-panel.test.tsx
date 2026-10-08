import { createUser } from '@/__tests__/support/render';
import SettingsPanel, { Saved } from '@/components/admin/settings-panel';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('Saved', () => {
    it('says "saved" only after a save', () => {
        const { rerender, container } = render(<Saved show={false} />);

        expect(container).toBeEmptyDOMElement();

        rerender(<Saved show />);

        expect(screen.getByText('Sačuvano')).toBeVisible();
    });
});

describe('SettingsPanel', () => {
    const panel = () => screen.getByRole('group');

    it('is folded away by default, showing its title and a one-line summary', () => {
        render(
            <SettingsPanel title="Cena isticanja" summary="1.000 RSD za 7 dana">
                <button type="button">Sačuvaj</button>
            </SettingsPanel>,
        );

        expect(panel()).not.toHaveAttribute('open');
        expect(screen.getByText('Cena isticanja')).toBeVisible();
        expect(screen.getByText('1.000 RSD za 7 dana')).toBeVisible();
    });

    it('opens on a click on its title', async () => {
        const user = createUser();
        render(
            <SettingsPanel title="Cena isticanja" lead="Koliko proizvođač plaća da bude istaknut.">
                <button type="button">Sačuvaj</button>
            </SettingsPanel>,
        );

        await user.click(screen.getByText('Cena isticanja'));

        expect(panel()).toHaveAttribute('open');
        expect(screen.getByText('Koliko proizvođač plaća da bude istaknut.')).toBeVisible();
    });

    it('can start open', () => {
        render(
            <SettingsPanel title="Cena isticanja" defaultOpen>
                <button type="button">Sačuvaj</button>
            </SettingsPanel>,
        );

        expect(panel()).toHaveAttribute('open');
    });
});
