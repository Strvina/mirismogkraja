import MarketplaceLayout from '@/layouts/marketplace-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Poruke proizvođača', href: '/poruke-proizvodjaca' }];

interface Thread {
    producer: { id: number; name: string; slug: string };
    buyer: { id: number; name: string; avatar_path: string | null };
    last_message: string;
    last_at: string;
    unread: number;
}

export default function ProducerInbox({ threads }: { threads: Thread[] }) {
    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title="Poruke proizvođača" />

            <h1 className="font-serif text-4xl sm:text-5xl">Poruke kupaca</h1>

            {threads.length === 0 ? (
                <p className="text-muted-foreground mt-6 text-sm">Još nema poruka od kupaca.</p>
            ) : (
                <div className="border-border/70 mt-8 max-w-2xl divide-y rounded-lg border">
                    {threads.map((thread) => (
                        <Link
                            key={`${thread.producer.id}-${thread.buyer.id}`}
                            href={route('messages.thread', [thread.producer.id, thread.buyer.id])}
                            className="hover:bg-muted/60 flex items-center gap-4 p-4 transition-colors"
                        >
                            {thread.buyer.avatar_path ? (
                                <img src={`/storage/${thread.buyer.avatar_path}`} alt="" className="size-10 rounded-full object-cover" />
                            ) : (
                                <span className="bg-olive-soft text-olive grid size-10 place-items-center rounded-full text-sm font-semibold">
                                    {thread.buyer.name.charAt(0)}
                                </span>
                            )}

                            <div className="min-w-0 flex-1">
                                <p className="font-medium">{thread.buyer.name}</p>
                                <p className="text-muted-foreground text-xs">{thread.producer.name}</p>
                                <p className="text-muted-foreground truncate text-sm">{thread.last_message}</p>
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
