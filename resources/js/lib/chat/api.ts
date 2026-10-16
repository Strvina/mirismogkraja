import { type Message, type ThreadSide } from '@/components/messages/types';

/** A conversation as the window's list shows it (App\Services\Messaging::summaries). */
export interface ChatThreadSummary {
    key: string;
    producer_id: number;
    buyer_id: number;
    as_producer: boolean;
    title: string;
    subtitle: string | null;
    avatar_path: string | null;
    href: string;
    last_message: string;
    last_mine: boolean;
    last_at: string;
    unread: number;
}

/** What the window needs to know about a thread besides its messages. */
export interface ChatThreadMeta {
    key: string;
    producer_id: number;
    buyer_id: number;
    title: string;
    avatar_path: string | null;
    /** The thread's own page. */
    href: string;
    closed: ThreadSide | null;
    blocked_by: ThreadSide | null;
    can_send: boolean;
}

export interface ChatThreadResponse {
    thread: ChatThreadMeta;
    messages: Message[];
    has_older: boolean;
    unread: number;
}

/** A request that did not go through: what to tell the person, and whether it was the server saying no. */
export class ChatError extends Error {
    constructor(
        message: string,
        readonly status: number,
    ) {
        super(message);
    }
}

/** The token Laravel leaves in a cookie for requests made outside Inertia. */
function xsrfToken(): string {
    const cookie = document.cookie.split('; ').find((part) => part.startsWith('XSRF-TOKEN='));

    return cookie ? decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)) : '';
}

/**
 * GETs already on their way, by address: asking for the same thing twice -
 * a poll and a re-open landing together - waits for the one request.
 */
const inFlight = new Map<string, Promise<unknown>>();

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
        ...init,
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(init.method && init.method !== 'GET' ? { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': xsrfToken() } : {}),
            ...init.headers,
        },
    });

    if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string; errors?: Record<string, string[]> } | null;
        // A validation message says what to do ("the producer is away"); anything else gets a plain one.
        const reason = body?.errors ? Object.values(body.errors)[0]?.[0] : undefined;

        throw new ChatError(reason ?? '', response.status);
    }

    return (await response.json()) as T;
}

function get<T>(url: string): Promise<T> {
    const running = inFlight.get(url);

    if (running) {
        return running as Promise<T>;
    }

    const started = request<T>(url).finally(() => inFlight.delete(url));

    inFlight.set(url, started);

    return started;
}

export const chatApi = {
    conversations: () => get<{ threads: ChatThreadSummary[]; unread: number }>(route('chat.conversations')),

    thread: (producerId: number, buyerId: number, options: { after?: number; before?: number; read?: boolean } = {}) =>
        get<ChatThreadResponse>(
            route('chat.thread', {
                producer: producerId,
                buyer: buyerId,
                after: options.after || undefined,
                before: options.before || undefined,
                read: options.read ? 1 : undefined,
            }),
        ),

    send: (producerId: number, buyerId: number, body: string) =>
        request<{ message: Message }>(route('chat.send', { producer: producerId, buyer: buyerId }), {
            method: 'POST',
            body: JSON.stringify({ body }),
        }),
};
