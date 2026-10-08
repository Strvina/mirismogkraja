import { lastVisit } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import OutcomeBar from '@/components/messages/outcome-bar';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const LABELS = { contacted: 'Čuli smo se', sold: 'Prodato', cancelled: 'Otkazano' };

const renderBar = (outcome: string | null) => renderOnPage(<OutcomeBar producerId={7} buyerId={22} outcome={outcome} labels={LABELS} />);

const choice = (name: string) => screen.getByRole('button', { name });

describe('OutcomeBar', () => {
    it('offers the ways an inquiry can end, none chosen to begin with', () => {
        renderBar(null);

        Object.values(LABELS).forEach((label) => expect(choice(label)).toHaveAttribute('aria-pressed', 'false'));
    });

    it('marks the one that was chosen', () => {
        renderBar('sold');

        expect(choice('Prodato')).toHaveAttribute('aria-pressed', 'true');
        expect(choice('Čuli smo se')).toHaveAttribute('aria-pressed', 'false');
        expect(choice('Otkazano')).toHaveAttribute('aria-pressed', 'false');
    });

    it('saves a choice for this producer and this buyer, asking back only for the outcome', async () => {
        const { user } = renderBar(null);

        await user.click(choice('Prodato'));

        expect(lastVisit()).toMatchObject({
            method: 'patch',
            url: route('messages.outcome', [7, 22]),
            data: { status: 'sold' },
            options: { preserveScroll: true, only: ['outcome'] },
        });
    });

    it('changes to another one directly', async () => {
        const { user } = renderBar('contacted');

        await user.click(choice('Otkazano'));

        expect(lastVisit()).toMatchObject({ data: { status: 'cancelled' } });
    });

    it('clears the note when the chosen one is clicked again', async () => {
        const { user } = renderBar('sold');

        await user.click(choice('Prodato'));

        expect(lastVisit()).toMatchObject({ method: 'patch', data: { status: null } });
    });

    it('explains, right where it is, that the note is optional and the buyer never sees it', async () => {
        const { user } = renderBar(null);

        await user.click(screen.getByRole('button', { name: 'Šta je ishod upita?' }));

        expect(screen.getByRole('dialog')).toHaveTextContent('Ishod upita — samo za evidenciju');
        expect(screen.getByRole('dialog')).toHaveTextContent('Kupac ovo ne vidi.');
    });
});
