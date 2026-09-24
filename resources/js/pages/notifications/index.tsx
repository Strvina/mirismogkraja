import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Obaveštenja', href: '/obavestenja' }];

interface Notification {
    id: string;
    title: string;
    body: string | null;
    url: string | null;
    read: boolean;
    created_at: string;
}

export default function NotificationsIndex({ notifications }: { notifications: Paginated<Notification> }) {
    const unread = notifications.data.filter((notification) => !notification.read).length;

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title="Obaveštenja" />

            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="font-serif text-4xl sm:text-5xl">Obaveštenja</h1>

                {unread > 0 && (
                    <Button variant="outline" size="sm" onClick={() => router.post(route('notifications.read-all'), {}, { preserveScroll: true })}>
                        Označi sve kao pročitano
                    </Button>
                )}
            </div>

            {notifications.total === 0 ? (
                <p className="text-muted-foreground mt-8 text-sm">
                    Ovde ćemo vas obavestiti o novim porukama, utiscima i odlukama o vašem proizvođaču.
                </p>
            ) : (
                <div className="border-border/70 mt-8 max-w-2xl divide-y rounded-lg border">
                    {notifications.data.map((notification) => (
                        <Link
                            key={notification.id}
                            href={route('notifications.open', notification.id)}
                            className={cn('hover:bg-muted/60 block p-4 transition-colors', !notification.read && 'bg-olive-soft/40')}
                        >
                            <p className="flex items-center gap-2 font-medium">
                                {!notification.read && <span className="bg-primary size-1.5 shrink-0 rounded-full" aria-hidden />}
                                {notification.title}
                            </p>
                            {notification.body && <p className="text-muted-foreground mt-1 text-sm">{notification.body}</p>}
                            <p className="text-muted-foreground/80 mt-1 text-xs">{formatRelativeTime(notification.created_at)}</p>
                        </Link>
                    ))}
                </div>
            )}

            <div className="max-w-2xl">
                <Pagination meta={notifications} />
            </div>
        </MarketplaceLayout>
    );
}
