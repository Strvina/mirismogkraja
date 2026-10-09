import { makeUser } from '@/__tests__/support/factories';
import { lastVisit } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import Profile from '@/pages/settings/profile';
import WantedShow from '@/pages/wanted/show';
import { act, screen } from '@testing-library/react';
import { type ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';

const wanted: ComponentProps<typeof WantedShow> = {
    ad: {
        id: 7,
        title: 'Kupujem med',
        excerpt: 'Tražim med.',
        body: 'Tražim domaći med.',
        quantity: '5 kg',
        city: 'Niš',
        category: 'Med',
        author: 'Milica',
        created_at: '2026-10-01T10:00:00Z',
        expires_at: '2026-10-31T10:00:00Z',
        responses_count: 0,
        state: 'open',
    },
    isAuthor: false,
    responders: [],
    producers: [{ id: 9, name: 'Pčelinjak Ana', answered: false }],
    canRespond: true,
};

describe('wanted offers and account settings', () => {
    it('sends an offer as the eligible producer and retains the offer after refusal', async () => {
        const { user } = renderOnPage(<WantedShow {...wanted} />, { props: { auth: { user: makeUser({ role: 'seller' }) } } });
        await user.type(screen.getByRole('textbox', { name: 'Odgovor kupcu' }), 'Imamo 5 kg meda.');
        await user.click(screen.getByRole('button', { name: 'Pošalji ponudu' }));
        expect(lastVisit()).toMatchObject({ method: 'post', url: route('wanted.respond', 7), data: { producer_id: 9, body: 'Imamo 5 kg meda.' } });
        expect(screen.getByRole('button', { name: 'Pošalji ponudu' })).toBeDisabled();
        act(() => lastVisit().fail({ body: 'Već ste odgovorili.' }));
        expect(screen.getByText('Već ste odgovorili.')).toBeVisible();
        expect(screen.getByRole('textbox', { name: 'Odgovor kupcu' })).toHaveValue('Imamo 5 kg meda.');
    });

    it.each(['closed', 'already answered'] as const)('does not offer another response when %s', (condition) => {
        renderOnPage(
            <WantedShow
                {...wanted}
                ad={{ ...wanted.ad, state: condition === 'closed' ? 'closed' : 'open' }}
                producers={[{ ...wanted.producers[0], answered: condition === 'already answered' }]}
            />,
        );
        expect(screen.queryByRole('textbox', { name: 'Odgovor kupcu' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Pošalji ponudu' })).not.toBeInTheDocument();
    });

    it('asks a visitor to sign in before offering to a buyer', () => {
        renderOnPage(<WantedShow {...wanted} canRespond={false} producers={[]} />);
        expect(screen.getAllByRole('link', { name: 'Prijavite se' }).some((link) => link.getAttribute('href') === route('login'))).toBe(true);
        expect(screen.queryByRole('textbox', { name: 'Odgovor kupcu' })).not.toBeInTheDocument();
    });

    it('saves both email notification preferences and preserves settings on validation failure', async () => {
        const { user } = renderOnPage(<Profile mustVerifyEmail hasPassword />, { props: { auth: { user: makeUser() } } });
        await user.click(screen.getByRole('checkbox', { name: /Mejl kad dobijem novu poruku/ }));
        await user.click(screen.getByRole('checkbox', { name: /Nedeljni pregled od proizvođača/ }));
        await user.click(screen.getByRole('button', { name: 'Sačuvaj' }));
        expect(lastVisit()).toMatchObject({
            method: 'patch',
            url: route('profile.update'),
            data: { notify_messages_by_email: false, notify_weekly_digest: false },
        });
        act(() => lastVisit().fail({ email: 'Email već postoji.' }));
        expect(screen.getByText('Email već postoji.')).toBeVisible();
        expect(screen.getByRole('checkbox', { name: /Mejl kad dobijem novu poruku/ })).not.toBeChecked();
    });

    it('shows the verification reminder for an unverified account', () => {
        renderOnPage(<Profile mustVerifyEmail hasPassword={false} />, { props: { auth: { user: makeUser({ email_verified_at: null }) } } });
        expect(screen.getByText('Vaša email adresa nije potvrđena.')).toBeVisible();
    });
});
