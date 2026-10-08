import { makeUser } from '@/__tests__/support/factories';
import { lastVisit } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import MessageThread from '@/pages/messages/show';
import { act, screen } from '@testing-library/react';
import { type ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';

const thread: ComponentProps<typeof MessageThread> = {
    producer: { id: 7, name: 'Gazdinstvo Ana', slug: 'ana', logo_path: null },
    buyer: { id: 8, name: 'Milica', avatar_path: null },
    messages: { data: [], current_page: 1, next_page_url: '/poruke/ana?page=2' },
    isOwner: false,
    blockedBy: null,
    closed: null,
    reportReasons: {},
    outcome: null,
    outcomeLabels: {},
    quickReplies: [],
};

describe('conversation page', () => {
    it('keeps an undelivered message available for retry and discard', async () => {
        const { user } = renderOnPage(<MessageThread {...thread} />, { props: { auth: { user: makeUser({ id: 8 }) } } });
        expect(screen.getByRole('link', { name: 'Starije poruke' })).toHaveAttribute('href', '/poruke/ana?page=2');
        await user.type(screen.getByRole('textbox', { name: 'Poruka' }), 'Da li imate med?');
        await user.click(screen.getByRole('button', { name: 'Pošalji poruku' }));
        expect(lastVisit()).toMatchObject({ method: 'post', url: route('messages.store', 'ana'), data: { body: 'Da li imate med?' } });
        expect(screen.getByRole('textbox', { name: 'Poruka' })).toHaveValue('');
        act(() => lastVisit().drop());
        expect(screen.getByText('Nije poslato')).toBeVisible();
        await user.click(screen.getByRole('button', { name: 'Pokušaj ponovo' }));
        expect(lastVisit().data).toEqual({ body: 'Da li imate med?' });
        act(() => lastVisit().fail({ body: 'Razgovor je zatvoren.' }));
        await user.click(screen.getByRole('button', { name: 'Odbaci' }));
        expect(screen.queryByText('Da li imate med?')).not.toBeInTheDocument();
    });

    it.each(['buyer', 'producer'] as const)('cannot compose when the %s has blocked the thread', (blockedBy) => {
        renderOnPage(<MessageThread {...thread} blockedBy={blockedBy} />);
        expect(screen.queryByRole('textbox', { name: 'Poruka' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Pošalji poruku' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Prijavi problem' })).toBeVisible();
    });

    it.each(['buyer', 'producer'] as const)('cannot compose when the %s account has been removed', (closed) => {
        renderOnPage(<MessageThread {...thread} closed={closed} />);
        expect(screen.queryByRole('textbox', { name: 'Poruka' })).not.toBeInTheDocument();
        expect(screen.getByText(/Prepiska ostaje ovde/)).toBeVisible();
    });

    it('addresses the buyer when the producer sends a reply', async () => {
        const { user } = renderOnPage(<MessageThread {...thread} isOwner />, { props: { auth: { user: makeUser({ id: 9, role: 'seller' }) } } });
        expect(screen.getByRole('button', { name: 'Brzi odgovori' })).toBeVisible();
        await user.type(screen.getByRole('textbox', { name: 'Poruka' }), 'Imamo med.');
        await user.click(screen.getByRole('button', { name: 'Pošalji poruku' }));
        expect(lastVisit()).toMatchObject({ url: route('messages.thread.store', [7, 8]), data: { body: 'Imamo med.' } });
        act(() => lastVisit().succeed());
        expect(screen.queryByText('Nije poslato')).not.toBeInTheDocument();
    });
});
