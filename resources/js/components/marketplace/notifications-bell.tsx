import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatRelativeTime } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Link, router, usePage, usePoll } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import { useState } from 'react';

/** How often the bell re-checks. Same cadence as the message badge. */
const POLL_MS = 20_000;

/**
 * The bell and its dropdown.
 *
 * Only the unread count travels with every page; the notifications
 * themselves are an optional prop, fetched in one small partial reload when
 * the bell is opened. A list that nobody looks at should not be built on
 * every request of every page.
 *
 * It is fetched again on a later opening only if the unread count has moved
 * since - otherwise a notification that arrived meanwhile would raise the
 * badge but be missing from the list.
 */
export default function NotificationsBell({ className = '' }: { className?: string }) {
    const { unreadNotifications, recentNotifications } = usePage<SharedData>().props;
    // The unread count the list was last fetched at; null until first opened.
    const [loadedAt, setLoadedAt] = useState<number | null>(null);

    usePoll(POLL_MS, { only: ['unreadNotifications'] });

    const load = (open: boolean) => {
        if (!open || loadedAt === unreadNotifications) {
            return;
        }

        setLoadedAt(unreadNotifications);
        router.reload({ only: ['recentNotifications'] });
    };

    return (
        <DropdownMenu onOpenChange={load}>
            <DropdownMenuTrigger
                aria-label={unreadNotifications > 0 ? t('Obaveštenja (:count nepročitanih)', { count: unreadNotifications }) : t('Obaveštenja')}
                className={cn('relative transition-opacity hover:opacity-70', className)}
            >
                <Bell className="size-5" />
                {unreadNotifications > 0 && (
                    <span
                        aria-hidden
                        className="bg-primary text-primary-foreground absolute -top-1.5 -right-2 grid min-w-4.5 place-items-center rounded-full px-1 text-[0.6rem] font-semibold tabular-nums"
                    >
                        {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </span>
                )}
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" sideOffset={10} className="w-80 p-1.5">
                {recentNotifications === undefined ? (
                    <p className="text-muted-foreground px-2 py-6 text-center text-sm">{t('Učitavanje…')}</p>
                ) : recentNotifications.length === 0 ? (
                    <p className="text-muted-foreground px-2 py-6 text-center text-sm">{t('Nemate obaveštenja.')}</p>
                ) : (
                    recentNotifications.map((notification) => (
                        <DropdownMenuItem key={notification.id} asChild>
                            <Link
                                href={route('notifications.open', notification.id)}
                                className={cn('cursor-pointer flex-col items-start gap-0.5 py-2.5', !notification.read && 'bg-olive-soft/50')}
                            >
                                <span className="flex w-full items-start gap-2">
                                    {!notification.read && <span className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" aria-hidden />}
                                    <span className="text-sm font-medium">{notification.title}</span>
                                </span>
                                {notification.body && <span className="text-muted-foreground line-clamp-2 text-xs">{notification.body}</span>}
                                <span className="text-muted-foreground/80 text-[0.65rem]">{formatRelativeTime(notification.created_at)}</span>
                            </Link>
                        </DropdownMenuItem>
                    ))
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                    <Link href={route('notifications.index')} className="cursor-pointer justify-center py-2 text-sm">
                        {t('Sva obaveštenja')}
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
