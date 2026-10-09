import { makeMessage } from '@/__tests__/support/factories';
import { lastVisit, visits } from '@/__tests__/support/inertia';
import { type Message } from '@/components/messages/types';
import { useOptimisticSend } from '@/hooks/use-optimistic-send';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const URL = '/poruke/mlekara-zapis';

function setup(delivered: Message[] = []) {
    const pausePolling = vi.fn();
    const resumePolling = vi.fn();
    const hook = renderHook((thread: Message[]) => useOptimisticSend({ url: URL, delivered: thread, pausePolling, resumePolling }), {
        initialProps: delivered,
    });

    return {
        ...hook,
        pausePolling,
        resumePolling,
        send: (text: string) => {
            // Each message is keyed by the moment it was written.
            vi.advanceTimersByTime(1000);
            act(() => hook.result.current.send(text));
        },
        awaiting: () => hook.result.current.awaiting.map((message) => ({ body: message.body, failed: message.failed })),
    };
}

describe('useOptimisticSend', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-12T10:00:00Z') });
    });

    it('shows the message at once, before the server has answered', () => {
        const thread = setup();

        thread.send('Da li imate ajvar?');

        expect(thread.awaiting()).toEqual([{ body: 'Da li imate ajvar?', failed: false }]);
        expect(thread.result.current.pendingCount).toBe(1);
        expect(thread.result.current.awaiting[0].created_at).toBe('2026-10-12T10:00:01.000Z');
    });

    it('posts the text to the conversation, quietly and without losing the place in it', () => {
        const thread = setup();

        thread.send('Da li imate ajvar?');

        expect(visits()).toHaveLength(1);
        expect(lastVisit()).toMatchObject({
            method: 'post',
            url: URL,
            data: { body: 'Da li imate ajvar?' },
            options: { preserveScroll: true, preserveState: true, only: ['messages', 'unreadMessages'], showProgress: false },
        });
    });

    it('holds the polling back while the message is on its way, and lets it go after', () => {
        const thread = setup();

        thread.send('Da li imate ajvar?');
        expect(thread.pausePolling).toHaveBeenCalledTimes(1);
        expect(thread.resumePolling).not.toHaveBeenCalled();

        lastVisit().succeed();
        expect(thread.resumePolling).toHaveBeenCalledTimes(1);
    });

    it("drops its own copy once the server's has arrived", () => {
        const thread = setup();

        thread.send('Da li imate ajvar?');
        lastVisit().succeed();

        expect(thread.awaiting()).toEqual([]);
        expect(thread.result.current.pendingCount).toBe(0);
    });

    it('marks the message as not sent when the server refuses it', () => {
        const thread = setup();

        thread.send('Da li imate ajvar?');
        lastVisit().fail({ body: 'Previše poruka. Pokušajte malo kasnije.' });

        expect(thread.awaiting()).toEqual([{ body: 'Da li imate ajvar?', failed: true }]);
        expect(thread.resumePolling).toHaveBeenCalledTimes(1);
    });

    it('marks the message as not sent when the request never got an answer', () => {
        const thread = setup();

        thread.send('Da li imate ajvar?');
        lastVisit().drop();

        expect(thread.awaiting()).toEqual([{ body: 'Da li imate ajvar?', failed: true }]);
        expect(thread.resumePolling).toHaveBeenCalledTimes(1);
    });

    it('sends a failed message again on retry, and it looks sent meanwhile', () => {
        const thread = setup();

        thread.send('Da li imate ajvar?');
        lastVisit().drop();

        act(() => thread.result.current.retry(thread.result.current.awaiting[0]));

        expect(thread.awaiting()).toEqual([{ body: 'Da li imate ajvar?', failed: false }]);
        expect(visits()).toHaveLength(2);
        expect(lastVisit()).toMatchObject({ method: 'post', url: URL, data: { body: 'Da li imate ajvar?' } });
        expect(thread.pausePolling).toHaveBeenCalledTimes(2);

        lastVisit().succeed();
        expect(thread.awaiting()).toEqual([]);
    });

    it('can fail a second time', () => {
        const thread = setup();

        thread.send('Da li imate ajvar?');
        lastVisit().drop();
        act(() => thread.result.current.retry(thread.result.current.awaiting[0]));
        lastVisit().drop();

        expect(thread.awaiting()).toEqual([{ body: 'Da li imate ajvar?', failed: true }]);
    });

    it('forgets a failed message that is discarded, without sending anything', () => {
        const thread = setup();

        thread.send('Da li imate ajvar?');
        lastVisit().drop();

        act(() => thread.result.current.discard(thread.result.current.awaiting[0]));

        expect(thread.awaiting()).toEqual([]);
        expect(thread.result.current.pendingCount).toBe(0);
        expect(visits()).toHaveLength(1);
    });

    it('keeps several messages in the order they were written, each with its own fate', () => {
        const thread = setup();

        thread.send('Prva');
        const first = lastVisit();
        thread.send('Druga');
        const second = lastVisit();
        thread.send('Treća');

        first.succeed();
        second.drop();

        expect(thread.awaiting()).toEqual([
            { body: 'Druga', failed: true },
            { body: 'Treća', failed: false },
        ]);
    });

    describe('while the thread already holds the server copy', () => {
        // The new props are applied a render before onSuccess runs.
        it('does not show the same message twice', () => {
            const thread = setup();

            thread.send('Da li imate ajvar?');
            thread.rerender([makeMessage({ mine: true, body: 'Da li imate ajvar?' })]);

            expect(thread.awaiting()).toEqual([]);
            expect(thread.result.current.pendingCount).toBe(1);
        });

        it('is not fooled by the other side having written the same words', () => {
            const thread = setup();

            thread.send('Dobar dan');
            thread.rerender([makeMessage({ mine: false, body: 'Dobar dan' })]);

            expect(thread.awaiting()).toEqual([{ body: 'Dobar dan', failed: false }]);
        });

        it('keeps the second of two identical messages until its own copy lands', () => {
            const thread = setup();

            thread.send('Halo?');
            thread.send('Halo?');
            thread.rerender([makeMessage({ mine: true, body: 'Halo?' })]);

            expect(thread.awaiting()).toEqual([{ body: 'Halo?', failed: false }]);

            thread.rerender([makeMessage({ mine: true, body: 'Halo?' }), makeMessage({ mine: true, body: 'Halo?' })]);

            expect(thread.awaiting()).toEqual([]);
        });

        it('keeps a failed message even if the same text was delivered before', () => {
            const thread = setup([makeMessage({ mine: true, body: 'Halo?' })]);

            thread.send('Halo?');
            lastVisit().drop();

            expect(thread.awaiting()).toEqual([{ body: 'Halo?', failed: true }]);
        });
    });
});
