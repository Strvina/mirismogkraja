import MarketplaceLayout from '@/layouts/marketplace-layout';
import { formatRelativeTime } from '@/lib/format';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Poruke', href: '/poruke' }];

interface Thread {
    key: string;
    as_producer: boolean;
    title: string;
    subtitle: string | null;
    avatar_path: string | null;
    href: string;
    last_message: string;
    last_at: string;
    unread: number;
}

export default function MessagesIndex({ threads }: { threads: Thread[] }) {
    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title="Poruke" />

            <h1 className="font-serif text-4xl sm:text-5xl">Poruke</h1>

            {threads.length === 0 ? (
                <p className="text-muted-foreground mt-6 text-sm">Još nema poruka. Poruku proizvođaču možete poslati sa njegovog profila.</p>
            ) : (
                <div className="border-border/70 mt-8 max-w-2xl divide-y rounded-lg border">
                    {threads.map((thread) => (
                        <Link key={thread.key} href={thread.href} className="hover:bg-muted/60 flex items-center gap-4 p-4 transition-colors">
                            {thread.avatar_path ? (
                                <img src={`/storage/${thread.avatar_path}`} alt="" className="size-10 shrink-0 rounded-full object-cover" />
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
                                            kupac · {thread.subtitle}
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
        </MarketplaceLayout>
    );
}
