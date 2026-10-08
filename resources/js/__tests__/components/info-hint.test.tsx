import { createUser } from '@/__tests__/support/render';
import InfoHint from '@/components/info-hint';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

function renderHint(title?: string) {
    render(
        <InfoHint label="Šta je ishod upita?" title={title}>
            <p>Nije obavezno i ne utiče ni na šta.</p>
        </InfoHint>,
    );

    return { user: createUser(), button: screen.getByRole('button', { name: 'Šta je ishod upita?' }) };
}

describe('InfoHint', () => {
    it('keeps the explanation out of the way until it is asked for', () => {
        renderHint('Ishod upita');

        expect(screen.queryByText('Nije obavezno i ne utiče ni na šta.')).not.toBeInTheDocument();
        expect(screen.queryByText('Ishod upita')).not.toBeInTheDocument();
    });

    it('opens on a click, so it works on a phone, with its title', async () => {
        const { user, button } = renderHint('Ishod upita');

        await user.click(button);

        expect(screen.getByText('Ishod upita')).toBeVisible();
        expect(screen.getByText('Nije obavezno i ne utiče ni na šta.')).toBeVisible();
        expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('opens without a title when none is given', async () => {
        const { user, button } = renderHint();

        await user.click(button);

        expect(screen.getByText('Nije obavezno i ne utiče ni na šta.')).toBeVisible();
    });

    it('closes again on a second click and on Escape', async () => {
        const { user, button } = renderHint('Ishod upita');

        await user.click(button);
        await user.click(button);
        expect(screen.queryByText('Nije obavezno i ne utiče ni na šta.')).not.toBeInTheDocument();

        await user.click(button);
        await user.keyboard('{Escape}');
        expect(screen.queryByText('Nije obavezno i ne utiče ni na šta.')).not.toBeInTheDocument();
    });
});
