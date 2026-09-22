import { type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { MessageCircle } from 'lucide-react';
import { useEffect } from 'react';

/** How often the header re-checks for new messages. */
const POLL_MS = 20_000;

/**
 * Messages icon with an unread badge. The count is a shared prop, so it
 * refreshes on every navigation; the poll is what makes a message that
 * arrives while the recipient sits on one page show up without them
 * reloading it.
 */
export default function MessagesLink({ className = '' }: { className?: string }) {
    const { unreadMessages } = usePage<SharedData>().props;

    useEffect(() => {
        const poll = setInterval(() => {
            if (document.visibilityState === 'visible') {
                router.reload({ only: ['unreadMessages'] });
            }
        }, POLL_MS);

        return () => clearInterval(poll);
    }, []);

    return (
        <Link
            href={route('messages.index')}
            aria-label={unreadMessages > 0 ? `Poruke (${unreadMessages} nepročitanih)` : 'Poruke'}
            className={`relative transition-opacity hover:opacity-70 ${className}`}
        >
            <MessageCircle className="size-5" />

            {unreadMessages > 0 && (
                <span
                    aria-hidden
                    className="bg-primary text-primary-foreground absolute -top-1.5 -right-2 grid min-w-4.5 place-items-center rounded-full px-1 text-[0.6rem] font-semibold tabular-nums"
                >
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                </span>
            )}
        </Link>
    );
}
