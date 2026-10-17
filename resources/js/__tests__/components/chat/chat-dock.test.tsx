import { setMediaQuery } from '@/__tests__/support/browser';
import { setPage, visits } from '@/__tests__/support/inertia';
import { renderOnPage } from '@/__tests__/support/render';
import ChatDock from '@/components/chat/chat-dock';
import ChatLink from '@/components/chat/chat-link';
import { chat } from '@/lib/chat/store';
import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const DESKTOP = '(min-width: 40rem)';
const me = { id: 9, name: 'Milica', email: 'milica@example.com', roles: [] };
const producer = { id: 4, name: 'Pčelinjak Rtanj', slug: 'pcelinjak-rtanj', logo_path: null };
const meta = {
    key: '4-9',
    producer_id: 4,
    buyer_id: 9,
    title: 'Pčelinjak Rtanj',
    avatar_path: null,
    href: '/poruke/pcelinjak-rtanj',
    closed: null,
    blocked_by: null,
    can_send: true,
};

function serve() {
    const fetch = vi.fn(async (url: string) => ({
        ok: true,
        status: 200,
        json: async () =>
            url.includes('chat.conversations')
                ? {
                      threads: [
                          {
                              ...meta,
                              as_producer: false,
                              subtitle: null,
                              last_message: 'Imamo bagremov.',
                              last_mine: false,
                              last_at: '2026-10-16T10:00:00Z',
                              unread: 2,
                          },
                      ],
                      unread: 2,
                  }
                : { thread: meta, messages: [], has_older: false, unread: 0 },
    }));

    vi.stubGlobal('fetch', fetch);

    return fetch;
}

describe('ChatDock', () => {
    beforeEach(() => {
        chat.reset();
        // A computer: on a phone the window takes the screen and has no "minimise".
        setMediaQuery(DESKTOP, true);
    });
    afterEach(() => vi.unstubAllGlobals());

    it('is not there for a guest', () => {
        renderOnPage(<ChatDock />, { url: '/proizvodi', props: { auth: { user: null } } });

        expect(screen.queryByRole('button', { name: /^Poruke/ })).not.toBeInTheDocument();
    });

    it('is not there on the messages pages, where the conversation is the page', () => {
        renderOnPage(<ChatDock />, { url: '/poruke/pcelinjak-rtanj', props: { auth: { user: me }, unreadMessages: 1 } });

        expect(screen.queryByRole('button', { name: /^Poruke/ })).not.toBeInTheDocument();
    });

    it('shows the unread count on its button, and opens the list of conversations', async () => {
        serve();
        const { user } = renderOnPage(<ChatDock />, { url: '/proizvodi', props: { auth: { user: me }, unreadMessages: 2 } });

        await user.click(screen.getByRole('button', { name: 'Poruke, nepročitanih: 2' }));

        const list = await screen.findByRole('dialog', { name: 'Poruke' });
        expect(await screen.findByText('Imamo bagremov.')).toBeInTheDocument();
        expect(list).toHaveTextContent('Nepročitano');
    });

    it('works as Instagram: the list, a conversation in the same window, back to the list, and the cross folds it into the button', async () => {
        serve();
        const { user } = renderOnPage(<ChatDock />, { url: '/proizvodi', props: { auth: { user: me }, unreadMessages: 2 } });

        await user.click(screen.getByRole('button', { name: /^Poruke/ }));
        await user.click(await screen.findByRole('button', { name: /Pčelinjak Rtanj/ }));

        const conversation = await screen.findByRole('dialog', { name: 'Razgovor' });
        await user.type(within(conversation).getByRole('textbox', { name: 'Poruka' }), 'Nedovršeno');

        // Back: the list again, in the same window.
        await user.click(within(conversation).getByRole('button', { name: 'Nazad na razgovore' }));
        const list = await screen.findByRole('dialog', { name: 'Poruke' });
        await user.click(within(list).getByRole('button', { name: /Pčelinjak Rtanj/ }));
        expect(within(await screen.findByRole('dialog', { name: 'Razgovor' })).getByRole('textbox', { name: 'Poruka' })).toHaveValue('Nedovršeno');

        // The cross: folded into the button, which brings it back where it was.
        await user.click(within(screen.getByRole('dialog', { name: 'Razgovor' })).getByRole('button', { name: 'Spusti poruke' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: /^Poruke/ }));
        expect(within(await screen.findByRole('dialog', { name: 'Razgovor' })).getByRole('textbox', { name: 'Poruka' })).toHaveValue('Nedovršeno');
    });

    it('asks the server to count the conversation read only while the window is open, not folded into the button', async () => {
        const fetch = serve();
        const { user } = renderOnPage(<ChatDock />, { url: '/proizvodi', props: { auth: { user: me }, unreadMessages: 2 } });

        chat.openThread({ producerId: 4, buyerId: 9 });
        await screen.findByRole('dialog', { name: 'Razgovor' });
        await waitFor(() => expect(fetch.mock.calls.some(([url]) => String(url).includes('read=1'))).toBe(true));

        await user.click(within(screen.getByRole('dialog', { name: 'Razgovor' })).getByRole('button', { name: 'Spusti poruke' }));
        const asked = fetch.mock.calls.length;
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(fetch.mock.calls.length).toBe(asked);
    });

    it('rings when a message comes in, once, and not for the count the page opened with', () => {
        vi.useFakeTimers();
        const page = (unreadMessages: number) => ({ url: '/proizvodi', props: { auth: { user: me }, unreadMessages } });
        const button = () => screen.getByRole('button', { name: /^Poruke/ });
        const { rerender } = renderOnPage(<ChatDock />, page(0));
        expect(button()).not.toHaveClass('chat-ring');

        // The next poll brings one more.
        setPage(page(1));
        rerender(<ChatDock />);
        expect(button()).toHaveClass('chat-ring');

        act(() => vi.advanceTimersByTime(900));
        expect(button()).not.toHaveClass('chat-ring');

        // Read elsewhere: fewer is no news.
        setPage(page(0));
        rerender(<ChatDock />);
        expect(button()).not.toHaveClass('chat-ring');
        vi.useRealTimers();
    });
});

describe('ChatLink', () => {
    beforeEach(() => chat.reset());
    afterEach(() => vi.unstubAllGlobals());

    it('opens the conversation in the window, on the page one is on', async () => {
        serve();
        const { user } = renderOnPage(
            <>
                <ChatLink producer={producer}>Pošalji poruku</ChatLink>
                <ChatDock />
            </>,
            { url: '/proizvodjac/pcelinjak-rtanj', props: { auth: { user: me }, unreadMessages: 0 } },
        );

        await user.click(screen.getByRole('link', { name: 'Pošalji poruku' }));

        expect(await screen.findByRole('dialog', { name: 'Razgovor' })).toBeInTheDocument();
        expect(chat.get().active).toMatchObject({ producerId: 4, buyerId: 9 });
        expect(visits()).toEqual([]);
    });

    it("is the conversation's page where there is no window", async () => {
        const { user } = renderOnPage(<ChatLink producer={producer}>Pošalji poruku</ChatLink>, { props: { auth: { user: null } } });

        await user.click(screen.getByRole('link', { name: 'Pošalji poruku' }));

        expect(visits()[0]).toMatchObject({ method: 'get', url: route('messages.show', 'pcelinjak-rtanj') });
    });
});

describe('ChatDock on a phone', () => {
    beforeEach(() => chat.reset());
    afterEach(() => vi.unstubAllGlobals());

    it('takes the screen and holds the page still, with a way back to the list', async () => {
        serve();
        const { user } = renderOnPage(<ChatDock />, { url: '/proizvodi', props: { auth: { user: me }, unreadMessages: 0 } });

        chat.openThread({ producerId: 4, buyerId: 9, title: 'Pčelinjak Rtanj' });

        expect(await screen.findByRole('dialog', { name: 'Razgovor' })).toHaveAttribute('aria-modal', 'true');
        expect(document.documentElement.style.overflow).toBe('hidden');
        // The corner button would only be in the way of the message box.
        expect(screen.queryByRole('button', { name: /^Poruke/ })).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Nazad na razgovore' }));
        expect(await screen.findByRole('dialog', { name: 'Poruke' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Spusti poruke' }));
        expect(document.documentElement.style.overflow).toBe('');
    });
});
