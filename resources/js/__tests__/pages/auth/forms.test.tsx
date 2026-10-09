import { lastVisit, visits } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import Login from '@/pages/auth/login';
import Register from '@/pages/auth/register';
import { act, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('authentication pages', () => {
    it('sends remembered sign-in and disables another submission until it finishes', async () => {
        const { user } = renderOnPage(<Login canResetPassword googleEnabled={false} />);
        await user.type(screen.getByLabelText('Email adresa'), 'buyer@example.test');
        await user.type(screen.getByLabelText('Lozinka'), 'secret123');
        await user.click(screen.getByRole('checkbox', { name: 'Zapamti me' }));
        await user.click(screen.getByRole('button', { name: 'Prijavi se' }));
        expect(lastVisit().data).toEqual({ email: 'buyer@example.test', password: 'secret123', remember: true });
        expect(screen.getByRole('button', { name: 'Prijavi se' })).toBeDisabled();
        expect(visits()).toHaveLength(1);
        act(() => lastVisit().fail({ email: 'Prijava nije uspela.' }));
        expect(screen.getByText('Prijava nije uspela.')).toBeVisible();
        expect(screen.getByLabelText('Lozinka')).toHaveValue('');
        expect(screen.getByRole('button', { name: 'Prijavi se' })).toBeEnabled();
    });

    it('keeps sign-in unremembered when the checkbox is not selected', async () => {
        const { user } = renderOnPage(<Login canResetPassword={false} googleEnabled={false} />);
        await user.type(screen.getByLabelText('Email adresa'), 'buyer@example.test');
        await user.type(screen.getByLabelText('Lozinka'), 'secret123');
        await user.click(screen.getByRole('button', { name: 'Prijavi se' }));
        expect(lastVisit().data).toMatchObject({ remember: false });
        expect(screen.queryByText('Zaboravili ste lozinku?')).not.toBeInTheDocument();
    });

    it('submits registration and preserves non-secret fields after server validation fails', async () => {
        const { user } = renderOnPage(<Register />);
        await user.type(screen.getByLabelText('Ime'), 'Ana');
        await user.type(screen.getByLabelText('Email adresa'), 'ana@example.test');
        await user.type(screen.getByLabelText('Lozinka', { exact: true }), 'secret123');
        await user.type(screen.getByLabelText('Potvrda lozinke'), 'secret123');
        await user.click(screen.getByRole('button', { name: 'Napravi nalog' }));
        expect(lastVisit().data).toMatchObject({ name: 'Ana', email: 'ana@example.test', password_confirmation: 'secret123' });
        expect(screen.getByRole('button', { name: 'Napravi nalog' })).toBeDisabled();
        act(() => lastVisit().fail({ email: 'Adresa je zauzeta.' }));
        expect(screen.getByText('Adresa je zauzeta.')).toBeVisible();
        expect(screen.getByLabelText('Email adresa')).toHaveValue('ana@example.test');
        expect(screen.getByLabelText('Lozinka', { exact: true })).toHaveValue('');
        expect(screen.getByLabelText('Potvrda lozinke')).toHaveValue('');
    });
});
