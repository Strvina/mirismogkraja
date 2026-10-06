import Head from '@/components/head';
import EmptyState from '@/components/marketplace/empty-state';
import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { formatRelativeTime } from '@/lib/format';
import { t, tx } from '@/lib/i18n';
import { thumbUrl } from '@/lib/media';
import { type BreadcrumbItem } from '@/types';
import { Link, usePoll } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: tx('Poruke'), href: '/poruke' }];

interface Thread {
    key: string;
    as_producer: boolean;
    title: string;
    subtitle: string | null;
    /** The producer's own note on how the inquiry ended. */
    outcome: string | null;
    avatar_path: string | null;
    href: string;
    last_message: string;
    last_at: string;
    unread: number;
}

export default function MessagesIndex({ threads }: { threads: Paginated<Thread> }) {
    // Slower than an open conversation: here it's enough that a new message
    // shows up on its own within a few seconds.
    usePoll(10000, { only: ['threads', 'unreadMessages'] });

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Poruke')} />

            <h1 className="font-serif text-4xl sm:text-5xl">{t('Poruke')}</h1>

            {threads.data.length === 0 ? (
                <EmptyState
                    className="mt-8 max-w-2xl"
                    title={t('Još nema poruka')}
                    actions={
                        <Button asChild variant="outline">
                            <Link href={route('marketplace.products.index')}>{t('Pogledaj proizvode')}</Link>
                        </Button>
                    }
                >
                    {t('Razgovor počinje upitom sa stranice proizvoda ili proizvođača. Sve što dogovorite sa proizvođačem ostaje ovde.')}
                </EmptyState>
            ) : (
                <div className="border-border/70 mt-8 max-w-2xl divide-y rounded-lg border">
                    {threads.data.map((thread) => (
                        <Link key={thread.key} href={thread.href} className="hover:bg-muted/60 flex items-center gap-4 p-4 transition-colors">
                            {thread.avatar_path ? (
                                <img
                                    loading="lazy"
                                    src={thumbUrl(thread.avatar_path)}
                                    alt=""
                                    className="size-10 shrink-0 rounded-full object-cover"
                                />
                            ) : (
                                <span className="bg-olive-soft text-olive grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold">
                                    {thread.title.charAt(0)}
                                </span>
                            )}

                            <div className="min-w-0 flex-1">
                                <p className="flex flex-wrap items-center gap-2 font-medium">
                                    {thread.title}
                                    {thread.as_producer && (
                                        <span className="bg-olive-soft text-olive rounded-full px-2 py-0.5 text-[0.65rem] font-semibold">
                                            {t('kupac')} · {thread.subtitle}
                                        </span>
                                    )}
                                    {thread.outcome && (
                                        <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[0.65rem] font-semibold">
                                            {thread.outcome}
                                        </span>
                                    )}
                                </p>
                                <p className="text-muted-foreground truncate text-sm">{thread.last_message}</p>
                                <p className="text-muted-foreground/80 mt-0.5 text-xs">{formatRelativeTime(thread.last_at)}</p>
                            </div>

                            {thread.unread > 0 && (
                                <span className="bg-primary text-primary-foreground grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold">
                                    {thread.unread}
                                </span>
                            )}
                        </Link>
                    ))}
                </div>
            )}

            <Pagination meta={threads} />
        </MarketplaceLayout>
    );
}
