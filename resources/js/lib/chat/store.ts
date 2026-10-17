import { type Message, type PendingMessage } from '@/components/messages/types';
import { t } from '@/lib/i18n';
import { router } from '@inertiajs/react';
import { useSyncExternalStore } from 'react';
import { ChatError, chatApi, type ChatThreadMeta, type ChatThreadSummary } from './api';

/**
 * The chat window's state, kept outside React.
 *
 * The window works as Instagram's messages do: the chat button opens it on
 * the list of conversations; a conversation opens in it, with "back" to the
 * list; the cross folds it into the button again, and the button brings it
 * back as it was left - the list, or the conversation.
 *
 * Every page is drawn in a layout of its own, so a component's state is
 * gone at each click: here whether the window is open, what it shows, what
 * was typed and what it holds survive moving between pages - and all but
 * the messages a reload of the tab (sessionStorage).
 * One store, so two parts of the window never ask the server for the same
 * thing twice.
 */

/** A thread, named by its producer and its buyer - whichever side is looking. */
export interface ThreadRef {
    producerId: number;
    buyerId: number;
    /** Shown in the header until the thread's own answer arrives. */
    title?: string;
    avatarPath?: string | null;
}

export interface ThreadState {
    meta: ChatThreadMeta | null;
    messages: Message[];
    hasOlder: boolean;
    loading: boolean;
    loadingOlder: boolean;
    /** Why the thread could not be shown, if it could not. */
    error: string | null;
    /** Sent from here and not yet confirmed, or failed - with why. */
    pending: (PendingMessage & { error?: string })[];
}

/** What the window shows: every conversation, or one of them. */
export type View = 'list' | 'thread';

export interface ChatState {
    /** Whose window this is: what a tab remembers is not the next account's to show. */
    owner: number | null;
    /** Open, or folded into the chat button. */
    open: boolean;
    view: View;
    /** The conversation the window shows when its view is a conversation. */
    active: ThreadRef | null;
    drafts: Record<string, string>;
    threads: Record<string, ThreadState>;
    list: { items: ChatThreadSummary[]; loading: boolean; error: string | null; loaded: boolean };
}

const STORAGE_KEY = 'chat-window';

export const threadKey = (ref: Pick<ThreadRef, 'producerId' | 'buyerId'>) => `${ref.producerId}-${ref.buyerId}`;

const emptyThread = (): ThreadState => ({ meta: null, messages: [], hasOlder: false, loading: false, loadingOlder: false, error: null, pending: [] });

type Kept = Pick<ChatState, 'owner' | 'open' | 'view' | 'active' | 'drafts'>;

const folded = (): Kept => ({ owner: null, open: false, view: 'list', active: null, drafts: {} });

function restored(): Kept {
    try {
        const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<Kept> | null;

        return saved ? { ...folded(), ...saved, view: saved.view === 'thread' && saved.active ? 'thread' : 'list' } : folded();
    } catch {
        return folded();
    }
}

let state: ChatState = {
    ...(typeof window === 'undefined' ? folded() : restored()),
    threads: {},
    list: { items: [], loading: false, error: null, loaded: false },
};

const listeners = new Set<() => void>();

function set(next: Partial<ChatState>) {
    state = { ...state, ...next };

    try {
        sessionStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ owner: state.owner, open: state.open, view: state.view, active: state.active, drafts: state.drafts }),
        );
    } catch {
        // A private window without storage: the window still works, it just forgets on reload.
    }

    listeners.forEach((listener) => listener());
}

function setThread(key: string, update: (thread: ThreadState) => Partial<ThreadState>) {
    const thread = { ...(state.threads[key] ?? emptyThread()) };
    Object.assign(thread, update(thread));
    const newest = thread.messages[thread.messages.length - 1];

    // The list says the same last word as the conversation, without waiting for it to be asked again.
    const items = newest
        ? state.list.items.map((item) =>
              item.key === key && item.last_at <= newest.created_at
                  ? { ...item, last_message: newest.body, last_mine: newest.mine, last_at: newest.created_at }
                  : item,
          )
        : state.list.items;

    set({ threads: { ...state.threads, [key]: thread }, list: { ...state.list, items } });
}

/** Messages by id, oldest first: a poll and a send that both bring a message keep one of it. */
function merge(current: Message[], incoming: Message[]): Message[] {
    const byId = new Map(current.map((message) => [message.id, message]));

    incoming.forEach((message) => byId.set(message.id, message));

    return [...byId.values()].sort((a, b) => a.id - b.id);
}

/** The count last put on the header badge from here. */
let badge: number | null = null;

/**
 * The header badge, kept in step with what the server just counted - so it
 * and the window never disagree, and without asking the server again. Only
 * when the number changed: each update redraws the page's props.
 */
function syncBadge(unread: number, readKey?: string) {
    if (unread !== badge) {
        badge = unread;

        try {
            router.replaceProp('unreadMessages', unread);
        } catch {
            // No page to update (a test, a page without Inertia): the next poll will.
        }
    }

    // What was just read here is read in the list too.
    if (readKey && state.list.loaded) {
        set({ list: { ...state.list, items: state.list.items.map((item) => (item.key === readKey ? { ...item, unread: 0 } : item)) } });
    }
}

const failure = (error: unknown) =>
    error instanceof ChatError && error.status === 403
        ? t('Ovaj razgovor vam nije dostupan.')
        : error instanceof ChatError && error.message
          ? error.message
          : t('Veza sa serverom nije uspela. Proverite internet i pokušajte ponovo.');

/** Chat windows on the page now: a link can open a conversation in one only while there is one. */
let docks = 0;

export const chat = {
    get: () => state,

    /** The window is on this page; the returned function takes it off again. */
    attach(): () => void {
        docks++;

        return () => {
            docks--;
        };
    },

    /** Whether a conversation can open in a window here, rather than on its own page. */
    available: () => docks > 0,

    /** The window is this account's; anything left from another one in this tab goes. */
    claim(userId: number) {
        if (state.owner !== userId) {
            chat.reset();
            set({ owner: userId });
        }
    },

    subscribe(listener: () => void) {
        listeners.add(listener);

        return () => listeners.delete(listener);
    },

    /** The chat button: the window opens as it was left - on the list, or on the conversation. */
    open() {
        if (state.view === 'thread' && state.active) {
            set({ open: true });
        } else {
            chat.openList();
        }
    },

    openList() {
        set({ open: true, view: 'list' });
        void chat.loadList();
    },

    async loadList() {
        set({ list: { ...state.list, loading: true, error: null } });

        try {
            const { threads, unread } = await chatApi.conversations();

            set({ list: { items: threads, loading: false, error: null, loaded: true } });
            syncBadge(unread);
        } catch (error) {
            set({ list: { ...state.list, loading: false, error: failure(error) } });
        }
    },

    /** Opens a conversation in the window - from the list, or from "Pošalji poruku" on a producer's page. */
    openThread(ref: ThreadRef) {
        set({ open: true, view: 'thread', active: ref });
    },

    /** "Back": from a conversation to the list of them. What was typed in it stays. */
    backToList() {
        set({ active: null });
        chat.openList();
    },

    /** The cross: the window folds into the chat button, as it is - nothing in it is lost. */
    close() {
        set({ open: false });
    },

    setDraft(key: string, text: string) {
        set({ drafts: { ...state.drafts, [key]: text } });
    },

    /**
     * Brings a thread up to date: everything at first, then only what came
     * after the last message held. `read` only while the thread is open in
     * view - the server counts the other side's messages as read then.
     */
    async refresh(ref: ThreadRef, { read }: { read: boolean }): Promise<boolean> {
        const key = threadKey(ref);
        const thread = state.threads[key] ?? emptyThread();
        const newest = thread.messages[thread.messages.length - 1]?.id;

        if (!thread.meta) {
            setThread(key, () => ({ loading: true, error: null }));
        }

        try {
            const answer = await chatApi.thread(ref.producerId, ref.buyerId, { after: thread.meta ? newest : undefined, read });
            const before = state.threads[key]?.messages.length ?? 0;

            setThread(key, (current) => ({
                meta: answer.thread,
                messages: merge(current.messages, answer.messages),
                // Only the first answer says what lies above it.
                hasOlder: current.meta ? current.hasOlder : answer.has_older,
                loading: false,
                error: null,
            }));
            syncBadge(answer.unread, read ? key : undefined);

            return (state.threads[key]?.messages.length ?? 0) > before;
        } catch (error) {
            setThread(key, () => ({ loading: false, error: failure(error) }));

            return false;
        }
    },

    async loadOlder(ref: ThreadRef) {
        const key = threadKey(ref);
        const thread = state.threads[key];

        if (!thread || thread.loadingOlder || !thread.hasOlder) {
            return;
        }

        setThread(key, () => ({ loadingOlder: true }));

        try {
            const answer = await chatApi.thread(ref.producerId, ref.buyerId, { before: thread.messages[0]?.id });

            setThread(key, (current) => ({ messages: merge(current.messages, answer.messages), hasOlder: answer.has_older, loadingOlder: false }));
        } catch (error) {
            setThread(key, () => ({ loadingOlder: false, error: failure(error) }));
        }
    },

    /**
     * Shown at once and confirmed by the server's copy. A failure keeps the
     * text in the thread, with the reason, to be sent again or dropped.
     */
    async send(ref: ThreadRef, text: string, retrying?: number) {
        const key = threadKey(ref);
        const pendingKey = retrying ?? Date.now();

        setThread(key, (thread) => ({
            pending: retrying
                ? thread.pending.map((item) => (item.key === retrying ? { ...item, failed: false, error: undefined } : item))
                : [...thread.pending, { key: pendingKey, body: text, created_at: new Date().toISOString(), failed: false }],
        }));

        try {
            const { message } = await chatApi.send(ref.producerId, ref.buyerId, text);

            setThread(key, (thread) => ({
                messages: merge(thread.messages, [message]),
                pending: thread.pending.filter((item) => item.key !== pendingKey),
            }));
        } catch (error) {
            setThread(key, (thread) => ({
                pending: thread.pending.map((item) => (item.key === pendingKey ? { ...item, failed: true, error: failure(error) } : item)),
            }));
        }
    },

    discard(ref: ThreadRef, pendingKey: number) {
        setThread(threadKey(ref), (thread) => ({ pending: thread.pending.filter((item) => item.key !== pendingKey) }));
    },

    /** For tests: a clean slate. */
    reset() {
        badge = null;
        state = {
            ...folded(),
            threads: {},
            list: { items: [], loading: false, error: null, loaded: false },
        };
        listeners.forEach((listener) => listener());
    },
};

export function useChat(): ChatState {
    return useSyncExternalStore(chat.subscribe, chat.get, chat.get);
}
