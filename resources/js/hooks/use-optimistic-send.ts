import { type Message, type PendingMessage } from '@/components/messages/types';
import { router } from '@inertiajs/react';
import { useState } from 'react';

/**
 * Sending a message so it appears at once. A send is a POST followed by a
 * redirect - two trips - so waiting for the server's echo made every
 * message feel slow; instead it is drawn right away and quietly replaced
 * by the server's copy when that arrives.
 */
export function useOptimisticSend({
    url,
    delivered,
    pausePolling,
    resumePolling,
}: {
    url: string;
    /** The thread as the server last sent it. */
    delivered: Message[];
    // A poll landing mid-send would bring the message back from the server
    // while its local copy is still on screen, showing it twice.
    pausePolling: () => void;
    resumePolling: () => void;
}) {
    const [pending, setPending] = useState<PendingMessage[]>([]);

    const markFailed = (key: number) => setPending((queued) => queued.map((item) => (item.key === key ? { ...item, failed: true } : item)));

    const deliver = (message: PendingMessage) => {
        pausePolling();

        let answered = false;

        router.post(
            url,
            { body: message.body },
            {
                preserveScroll: true,
                // Keep the panel mounted so its scroll position and the
                // composer's focus survive the round trip.
                preserveState: true,
                // The reply only changes the thread and the badge.
                only: ['messages', 'unreadMessages'],
                // The message is already in the thread; a loading bar would
                // only suggest a wait. Failures show on the message itself.
                showProgress: false,
                onSuccess: () => {
                    answered = true;
                    setPending((queued) => queued.filter((item) => item.key !== message.key));
                },
                onError: () => {
                    answered = true;
                    markFailed(message.key);
                },
                onFinish: () => {
                    resumePolling();

                    // Inertia calls onError only when the server answered. A
                    // request that never got there - no connection, server
                    // down, cancelled - ends up here and nowhere else, so
                    // without this the message would look delivered forever.
                    if (!answered) {
                        markFailed(message.key);
                    }
                },
            },
        );
    };

    const send = (text: string) => {
        const message: PendingMessage = { key: Date.now(), body: text, created_at: new Date().toISOString(), failed: false };

        setPending((queued) => [...queued, message]);
        deliver(message);
    };

    const retry = (message: PendingMessage) => {
        setPending((queued) => queued.map((item) => (item.key === message.key ? { ...item, failed: false } : item)));
        deliver(message);
    };

    const discard = (message: PendingMessage) => setPending((queued) => queued.filter((item) => item.key !== message.key));

    // onSuccess runs after the new props are applied, so for one render the
    // thread can hold both the server's copy of a message and the local one
    // it replaces. Matching them up here keeps that frame from flickering.
    // Counting, rather than "some message has this text", keeps the second
    // of two identical messages visible until its own reply lands.
    const mine = delivered.filter((message) => message.mine).map((message) => message.body);
    const awaiting = pending.filter((message) => {
        if (message.failed) {
            return true;
        }

        const index = mine.indexOf(message.body);

        if (index === -1) {
            return true;
        }

        mine.splice(index, 1);

        return false;
    });

    return { awaiting, pendingCount: pending.length, send, retry, discard };
}
