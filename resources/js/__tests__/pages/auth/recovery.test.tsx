import { makeUser } from '@/__tests__/support/factories';
import { lastVisit } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import ConfirmPassword from '@/pages/auth/confirm-password';
import ForgotPassword from '@/pages/auth/forgot-password';
import ResetPassword from '@/pages/auth/reset-password';
import TwoFactorChallenge from '@/pages/auth/two-factor-challenge';
import Password from '@/pages/settings/password';
import { act, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('account recovery and sensitive forms', () => {
    it('sends the reset token and clears both secrets on failure', async () => {
        const { user } = renderOnPage(<ResetPassword token="reset-token" email="ana@example.test" />);
        expect(screen.getByLabelText('Email')).toHaveAttribute('readonly');
        await user.type(screen.getByLabelText('Lozinka', { exact: true }), 'secret123');
        await user.type(screen.getByLabelText('Potvrda lozinke'), 'secret123');
        await user.click(screen.getByRole('button', { name: 'Sačuvaj novu lozinku' }));
        expect(lastVisit()).toMatchObject({
            method: 'post',
            url: route('password.store'),
            data: { token: 'reset-token', email: 'ana@example.test' },
        });
        expect(screen.getByRole('button', { name: 'Sačuvaj novu lozinku' })).toBeDisabled();
        act(() => lastVisit().fail({ password: 'Link je istekao.' }));
        expect(screen.getByText('Link je istekao.')).toBeVisible();
        expect(screen.getByLabelText('Lozinka', { exact: true })).toHaveValue('');
        expect(screen.getByLabelText('Potvrda lozinke')).toHaveValue('');
    });

    it('requests a reset and shows an actionable error while retaining the address', async () => {
        const { user } = renderOnPage(<ForgotPassword status="Proverite svoj email." />);
        expect(screen.getByText('Proverite svoj email.')).toBeVisible();
        await user.type(screen.getByLabelText('Email adresa'), 'ana@example.test');
        await user.click(screen.getByRole('button', { name: /Pošalji/ }));
        expect(lastVisit()).toMatchObject({ method: 'post', url: route('password.email'), data: { email: 'ana@example.test', captcha: '' } });
        act(() => lastVisit().fail({ email: 'Pokušajte kasnije.' }));
        expect(screen.getByText('Pokušajte kasnije.')).toBeVisible();
        expect(screen.getByLabelText('Email adresa')).toHaveValue('ana@example.test');
    });

    it('clears a rejected authenticator code before switching to recovery mode', async () => {
        const { user } = renderOnPage(<TwoFactorChallenge />);
        await user.type(screen.getByLabelText('Kod'), '123456');
        await user.click(screen.getByRole('button', { name: 'Prijavi se' }));
        expect(lastVisit().data).toEqual({ code: '123456', recovery_code: '' });
        act(() => lastVisit().fail({ code: 'Kod nije ispravan.' }));
        expect(screen.getByText('Kod nije ispravan.')).toBeVisible();
        expect(screen.getByLabelText('Kod')).toHaveValue('');
        await user.click(screen.getByRole('button', { name: /Nemam telefon/ }));
        expect(screen.queryByText('Kod nije ispravan.')).not.toBeInTheDocument();
        await user.type(screen.getByLabelText('Rezervni kod'), 'recovery-code');
        await user.click(screen.getByRole('button', { name: 'Prijavi se' }));
        expect(lastVisit().data).toEqual({ code: '', recovery_code: 'recovery-code' });
    });

    it('clears the confirmation password even after a server error', async () => {
        const { user } = renderOnPage(<ConfirmPassword />);
        await user.type(screen.getByLabelText('Lozinka'), 'secret123');
        await user.click(screen.getByRole('button', { name: 'Potvrdi lozinku' }));
        expect(lastVisit()).toMatchObject({ method: 'post', url: route('password.confirm') });
        act(() => lastVisit().fail({ password: 'Pogrešna lozinka.' }));
        expect(screen.getByText('Pogrešna lozinka.')).toBeVisible();
        expect(screen.getByLabelText('Lozinka')).toHaveValue('');
    });

    it('focuses and clears a rejected current password without clearing the new one', async () => {
        const { user } = renderOnPage(<Password />, { props: { auth: { user: makeUser() } } });
        await user.type(screen.getByLabelText('Trenutna lozinka'), 'wrong123');
        await user.type(screen.getByLabelText('Nova lozinka'), 'secret123');
        await user.type(screen.getByLabelText('Potvrda nove lozinke'), 'secret123');
        await user.click(screen.getByRole('button', { name: 'Sačuvaj lozinku' }));
        expect(lastVisit()).toMatchObject({ method: 'put', url: route('password.update') });
        act(() => lastVisit().fail({ current_password: 'Pogrešna lozinka.' }));
        expect(screen.getByLabelText('Trenutna lozinka')).toHaveFocus();
        expect(screen.getByLabelText('Trenutna lozinka')).toHaveValue('');
        expect(screen.getByLabelText('Nova lozinka')).toHaveValue('secret123');
    });

    it('lets a Google-only account set its first password and clears secrets on success', async () => {
        const { user } = renderOnPage(<Password hasPassword={false} />, { props: { auth: { user: makeUser() } } });
        expect(screen.getByText(/Prijavljujete se preko Google naloga/)).toBeVisible();
        await user.type(screen.getByLabelText('Nova lozinka'), 'secret123');
        await user.type(screen.getByLabelText('Potvrda nove lozinke'), 'secret123');
        await user.click(screen.getByRole('button', { name: 'Sačuvaj lozinku' }));
        expect(lastVisit().data).toMatchObject({ current_password: '', password: 'secret123' });
        act(() => lastVisit().succeed());
        expect(screen.getByLabelText('Nova lozinka')).toHaveValue('');
        expect(screen.getByLabelText('Potvrda nove lozinke')).toHaveValue('');
    });
});
