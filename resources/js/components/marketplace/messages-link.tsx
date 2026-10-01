import { t } from '@/lib/i18n';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { MessageCircle } from 'lucide-react';

/**
 * Messages icon with an unread badge. The count is a shared prop, so it
 * refreshes on every navigation, and the navbar's one badge poll keeps it
 * current in between (see Navbar).
 */
export default function MessagesLink({ className = '' }: { className?: string }) {
    const { unreadMessages } = usePage<SharedData>().props;

    return (
        <Link
            href={route('messages.index')}
            aria-label={unreadMessages > 0 ? t('Poruke (:count nepročitanih)', { count: unreadMessages }) : t('Poruke')}
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
