import { lastVisit, visits } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import DeleteUser from '@/components/delete-user';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

async function openDialog(hasPassword = true) {
    const view = renderOnPage(<DeleteUser hasPassword={hasPassword} />);

    await view.user.click(screen.getByRole('button', { name: 'Obriši nalog' }));

    const dialog = screen.getByRole('dialog');

    return { ...view, dialog, confirm: () => within(dialog).getByRole('button', { name: 'Obriši nalog' }) };
}

describe('DeleteUser', () => {
    it('warns before anything can be deleted, with the dialog closed', () => {
        renderOnPage(<DeleteUser />);

        expect(screen.getByText('Budite oprezni — ova radnja se ne može poništiti.')).toBeVisible();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(visits()).toHaveLength(0);
    });

    it('asks for the password of an account that has one', async () => {
        const { dialog } = await openDialog();

        expect(dialog).toHaveAccessibleName('Da li ste sigurni da želite da obrišete nalog?');
        expect(dialog).toHaveAccessibleDescription(/Unesite lozinku da potvrdite/);
        expect(within(dialog).getByLabelText('Lozinka')).toHaveAttribute('type', 'password');
    });

    it('asks a Google account, which has no password, for its e-mail address instead', async () => {
        const { dialog } = await openDialog(false);

        expect(dialog).toHaveAccessibleDescription(/Upišite e-mail adresu naloga da potvrdite/);
        expect(within(dialog).getByLabelText('Email adresa')).toHaveAttribute('type', 'email');
        expect(within(dialog).queryByLabelText('Lozinka')).not.toBeInTheDocument();
    });

    it('sends the confirmation with the delete request', async () => {
        const { user, dialog, confirm } = await openDialog();

        await user.type(within(dialog).getByLabelText('Lozinka'), 'tajna-lozinka');
        await user.click(confirm());

        expect(visits()).toHaveLength(1);
        expect(lastVisit()).toMatchObject({
            method: 'delete',
            url: route('profile.destroy'),
            data: { password: 'tajna-lozinka' },
            options: { preserveScroll: true },
        });
    });

    it('sends the e-mail address in the same field for a Google account', async () => {
        const { user, dialog, confirm } = await openDialog(false);

        await user.type(within(dialog).getByLabelText('Email adresa'), 'milica@example.com');
        await user.click(confirm());

        expect(lastVisit()).toMatchObject({ method: 'delete', data: { password: 'milica@example.com' } });
    });

    it('cannot be sent twice while the server is answering', async () => {
        const { user, dialog, confirm } = await openDialog();

        await user.type(within(dialog).getByLabelText('Lozinka'), 'tajna-lozinka');
        await user.click(confirm());

        expect(confirm()).toBeDisabled();

        lastVisit().fail({ password: 'Lozinka nije tačna.' });

        expect(confirm()).toBeEnabled();
    });

    it('shows a wrong password where it was typed, and clears the field for another try', async () => {
        const { user, dialog, confirm } = await openDialog();
        const password = within(dialog).getByLabelText('Lozinka');

        await user.type(password, 'pogresna');
        await user.click(confirm());
        lastVisit().fail({ password: 'Lozinka nije tačna.' });

        expect(within(dialog).getByText('Lozinka nije tačna.')).toBeVisible();
        expect(password).toHaveValue('');
        expect(password).toHaveFocus();
    });

    it('forgets the error and the typed text when the visitor backs out', async () => {
        const { user, dialog, confirm } = await openDialog();

        await user.type(within(dialog).getByLabelText('Lozinka'), 'pogresna');
        await user.click(confirm());
        lastVisit().fail({ password: 'Lozinka nije tačna.' });
        await user.click(within(dialog).getByRole('button', { name: 'Otkaži' }));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Obriši nalog' }));

        expect(screen.queryByText('Lozinka nije tačna.')).not.toBeInTheDocument();
        expect(within(screen.getByRole('dialog')).getByLabelText('Lozinka')).toHaveValue('');
    });
});
