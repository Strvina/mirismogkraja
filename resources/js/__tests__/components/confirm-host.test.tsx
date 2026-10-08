import { createUser } from '@/__tests__/support/render';
import ConfirmHost from '@/components/confirm-host';
import { ask, type ConfirmOptions } from '@/lib/confirm';
import { act, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

/** Some page asks; the host, mounted beside the app, shows the question. */
function askOnPage(options: ConfirmOptions) {
    const user = createUser();
    let answer: Promise<boolean> = Promise.resolve(false);

    render(<ConfirmHost />);
    act(() => {
        answer = ask(options);
    });

    return { user, answer: () => answer, dialog: () => screen.getByRole('dialog') };
}

describe('ConfirmHost', () => {
    it('shows nothing until a question is asked', () => {
        render(<ConfirmHost />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows the question and what a yes will do', () => {
        const { dialog } = askOnPage({ title: 'Obrisati oglas „Paprika”?', description: 'Ova radnja se ne može poništiti.' });

        expect(dialog()).toHaveAccessibleName('Obrisati oglas „Paprika”?');
        expect(dialog()).toHaveAccessibleDescription('Ova radnja se ne može poništiti.');
        expect(within(dialog()).getByText('Ova radnja se ne može poništiti.')).toBeVisible();
    });

    it('describes the dialog by its title when no description was given', () => {
        const { dialog } = askOnPage({ title: 'Zatvoriti oglas?' });

        expect(dialog()).toHaveAccessibleDescription('Zatvoriti oglas?');
    });

    it('offers "Potvrdi" for an ordinary question', () => {
        const { dialog } = askOnPage({ title: 'Zatvoriti oglas?' });

        expect(within(dialog()).getByRole('button', { name: 'Potvrdi' })).toBeInTheDocument();
        expect(within(dialog()).getByRole('button', { name: 'Odustani' })).toBeInTheDocument();
    });

    it('offers "Obriši" for something that cannot be undone', () => {
        const { dialog } = askOnPage({ title: 'Obrisati sliku?', tone: 'danger' });

        expect(within(dialog()).getByRole('button', { name: 'Obriši' })).toBeInTheDocument();
        expect(within(dialog()).queryByRole('button', { name: 'Potvrdi' })).not.toBeInTheDocument();
    });

    it("uses the asker's own word for yes", () => {
        const { dialog } = askOnPage({ title: 'Blokirati razgovor?', confirmLabel: 'Blokiraj', tone: 'danger' });

        expect(within(dialog()).getByRole('button', { name: 'Blokiraj' })).toBeInTheDocument();
        expect(within(dialog()).queryByRole('button', { name: 'Obriši' })).not.toBeInTheDocument();
    });

    it('puts the keyboard on the yes button', () => {
        const { dialog } = askOnPage({ title: 'Zatvoriti oglas?' });

        expect(within(dialog()).getByRole('button', { name: 'Potvrdi' })).toHaveFocus();
    });

    it('answers yes and closes', async () => {
        const { user, answer, dialog } = askOnPage({ title: 'Zatvoriti oglas?' });

        await user.click(within(dialog()).getByRole('button', { name: 'Potvrdi' }));

        expect(await answer()).toBe(true);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('answers no on "Odustani" and closes', async () => {
        const { user, answer, dialog } = askOnPage({ title: 'Zatvoriti oglas?' });

        await user.click(within(dialog()).getByRole('button', { name: 'Odustani' }));

        expect(await answer()).toBe(false);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('takes Escape as a no', async () => {
        const { user, answer } = askOnPage({ title: 'Obrisati sliku?', tone: 'danger' });

        await user.keyboard('{Escape}');

        expect(await answer()).toBe(false);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows the next question after the first is answered', async () => {
        const { user, dialog } = askOnPage({ title: 'Prvo pitanje?' });

        await user.click(within(dialog()).getByRole('button', { name: 'Potvrdi' }));
        act(() => {
            ask({ title: 'Drugo pitanje?' });
        });

        expect(dialog()).toHaveAccessibleName('Drugo pitanje?');

        await user.keyboard('{Escape}');
    });
});
