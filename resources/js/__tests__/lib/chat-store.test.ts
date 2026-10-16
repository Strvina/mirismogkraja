import { currentPage, setPage } from '@/__tests__/support/inertia';
import { chat } from '@/lib/chat/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const thread = { producerId: 4, buyerId: 9, title: 'Pčelinjak Rtanj' };
const key = '4-9';

const meta = {
    key,
    producer_id: 4,
    buyer_id: 9,
    title: 'Pčelinjak Rtanj',
    avatar_path: null,
    href: '/poruke/pcelinjak',
    closed: null,
    blocked_by: null,
    can_send: true,
};
const message = (id: number, body: string, mine = false) => ({
    id,
    body,
    created_at: `2026-10-16T10:00:0${id}.000000Z`,
    mine,
    sender: { id: mine ? 9 : 2, name: mine ? 'Milica' : 'Rtanj', avatar_path: null },
    product: null,
});

/** The server, answering by address. */
function serve(answer: (url: string, init?: RequestInit) => { status?: number; body: unknown }) {
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
        const { status = 200, body } = answer(url, init);

        return { ok: status < 400, status, json: async () => body };
    });

    vi.stubGlobal('fetch', fetch);

    return fetch;
}

describe('the chat window state', () => {
    beforeEach(() => {
        chat.reset();
        setPage({ props: { unreadMessages: 3 } });
    });
    afterEach(() => vi.unstubAllGlobals());

    it('counts messages as read only when asked to, and puts the server count on the header badge', async () => {
        const fetch = serve(() => ({ body: { thread: meta, messages: [message(1, 'Ima li?')], has_older: false, unread: 2 } }));

        await chat.refresh(thread, { read: false });
        expect(fetch.mock.lastCall?.[0]).not.toContain('read=1');

        await chat.refresh(thread, { read: true });
        expect(fetch.mock.lastCall?.[0]).toContain('read=1');
        expect(currentPage().props.unreadMessages).toBe(2);
    });

    it('asks only for what came after the newest message it holds, and never shows a message twice', async () => {
        let call = 0;
        const fetch = serve(() => {
            call++;

            return call === 1
                ? { body: { thread: meta, messages: [message(1, 'Prva'), message(2, 'Druga')], has_older: true, unread: 0 } }
                : { body: { thread: meta, messages: [message(2, 'Druga'), message(3, 'Treća')], has_older: false, unread: 0 } };
        });

        await chat.refresh(thread, { read: true });
        const arrived = await chat.refresh(thread, { read: true });

        expect(fetch.mock.lastCall?.[0]).toContain('after=2');
        expect(arrived).toBe(true);
        expect(chat.get().threads[key].messages.map((m) => m.body)).toEqual(['Prva', 'Druga', 'Treća']);
        // Only the first answer says whether there is history above.
        expect(chat.get().threads[key].hasOlder).toBe(true);
    });

    it('keeps a message that failed to send, with the reason, and sends it again once', async () => {
        serve(() => ({ status: 422, body: { message: 'x', errors: { body: ['Proizvođač trenutno ne prima nove upite.'] } } }));

        await chat.send(thread, 'Ima li meda?');

        const [failed] = chat.get().threads[key].pending;
        expect(failed).toMatchObject({ body: 'Ima li meda?', failed: true, error: 'Proizvođač trenutno ne prima nove upite.' });

        const fetch = serve((url, init) =>
            init?.method === 'POST' ? { status: 201, body: { message: message(5, 'Ima li meda?', true) } } : { body: {} },
        );

        await chat.send(thread, failed.body, failed.key);

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(chat.get().threads[key].pending).toEqual([]);
        expect(chat.get().threads[key].messages.map((m) => m.body)).toEqual(['Ima li meda?']);
    });

    it('says plainly when the connection is gone', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => {
                throw new TypeError('Failed to fetch');
            }),
        );

        await chat.send(thread, 'Halo?');

        expect(chat.get().threads[key].pending[0].error).toBe('Veza sa serverom nije uspela. Proverite internet i pokušajte ponovo.');
    });

    it('keeps the conversation and what was typed when folded away, and the conversation when closed', () => {
        chat.openThread(thread);
        chat.setDraft(key, 'Nedovršeno');
        chat.minimize();

        expect(chat.get()).toMatchObject({ panel: 'thread', minimized: true, active: thread, drafts: { [key]: 'Nedovršeno' } });

        chat.restore();
        expect(chat.get().minimized).toBe(false);

        chat.close();
        expect(chat.get()).toMatchObject({ panel: 'closed', active: null, drafts: { [key]: 'Nedovršeno' } });
    });

    it("forgets another account's conversation and drafts", () => {
        chat.claim(9);
        chat.openThread(thread);
        chat.setDraft(key, 'Tajna');

        chat.claim(9);
        expect(chat.get().active).toEqual(thread);

        chat.claim(12);
        expect(chat.get()).toMatchObject({ owner: 12, active: null, drafts: {} });
    });

    it('asks the server once for a thread two parts of the window want at the same moment', async () => {
        const fetch = serve(() => ({ body: { thread: meta, messages: [], has_older: false, unread: 0 } }));

        await Promise.all([chat.refresh(thread, { read: true }), chat.refresh(thread, { read: true })]);

        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
