export interface Message {
    id: number;
    body: string;
    created_at: string;
    mine: boolean;
    sender: { id: number; name: string; avatar_path: string | null };
    // Set only on a message sent from a product page, so the reader can see
    // which listing the question was about.
    product: { id: number; name: string; slug: string; price: string; unit: string; image: string | null } | null;
}

/**
 * A message drawn before the server has confirmed it. While it is on its
 * way it is deliberately indistinguishable from a delivered one: a spinner
 * or a "sending" label would only draw attention to a wait the sender has
 * no reason to care about.
 *
 * A send that never arrives is the one thing they do need to know about, so
 * `failed` is the only state that shows. The text stays in the thread and
 * can be sent again, rather than being dropped back into the composer on
 * top of whatever has been typed since.
 */
export interface PendingMessage {
    key: number;
    body: string;
    created_at: string;
    failed: boolean;
}

export type ThreadSide = 'producer' | 'buyer';
