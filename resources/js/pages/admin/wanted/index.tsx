import Head from '@/components/head';
import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import { Button } from '@/components/ui/button';
import AdminLayout from '@/layouts/admin-layout';
import { ask } from '@/lib/confirm';
import { formatRelativeTime } from '@/lib/format';
import { t, tx } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Link, router } from '@inertiajs/react';
import { EyeOff, RotateCcw } from 'lucide-react';

type Status = 'open' | 'closed' | 'blocked';

interface AdminWantedAd {
    id: number;
    title: string;
    body: string;
    quantity: string | null;
    city: string | null;
    status: Status;
    created_at: string;
    expires_at: string;
    responses_count: number;
    category: string | null;
    author: string | null;
}

const TABS: { status: Status | null; label: string }[] = [
    { status: null, label: tx('Sve') },
    { status: 'open', label: tx('Otvoreni') },
    { status: 'blocked', label: tx('Sklonjeni') },
    { status: 'closed', label: tx('Zatvoreni') },
];

const STATUS_LABELS: Record<Status, string> = {
    open: tx('Otvoren'),
    closed: tx('Zatvoren'),
    blocked: tx('Sklonjen'),
};

/**
 * "Tražim" ads go up without waiting; this is where they are read
 * afterwards. A blocked ad stays with its author, but only an admin puts
 * it back.
 */
export default function AdminWantedIndex({
    ads,
    filters,
    counts,
}: {
    ads: Paginated<AdminWantedAd>;
    filters: { status: Status | null };
    counts: Partial<Record<Status, number>>;
}) {
    const setStatus = (ad: AdminWantedAd, status: Status) => router.patch(route('admin.wanted.status', ad.id), { status }, { preserveScroll: true });

    const destroy = async (ad: AdminWantedAd) => {
        if (
            await ask({
                title: t('Trajno obrisati „:name”?', { name: ad.title }),
                description: t('Ova radnja se ne može poništiti.'),
                tone: 'danger',
            })
        ) {
            router.delete(route('admin.wanted.destroy', ad.id), { preserveScroll: true });
        }
    };

    return (
        <AdminLayout title={t('Oglasi „Tražim”')}>
            <Head title={t('Oglasi „Tražim”')} />

            <div className="border-border/70 flex flex-wrap gap-1 border-b pb-3">
                {TABS.map((tab) => (
                    <Link
                        key={tab.label}
                        href={route('admin.wanted.index', tab.status ? { status: tab.status } : {})}
                        preserveScroll
                        className={cn(
                            'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            filters.status === tab.status ? 'bg-olive-soft text-olive' : 'text-muted-foreground hover:bg-muted',
                        )}
                    >
                        {t(tab.label)}
                        {tab.status && counts[tab.status] ? <span className="ml-1.5 text-xs opacity-70">{counts[tab.status]}</span> : null}
                    </Link>
                ))}
            </div>

            {ads.data.length === 0 ? (
                <p className="text-muted-foreground mt-6 text-sm">{t('Ovde još nema ničega.')}</p>
            ) : (
                <div className="mt-6 space-y-3">
                    {ads.data.map((ad) => (
                        <div key={ad.id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl border p-4">
                            <div className="min-w-0 flex-1 text-sm">
                                <p className="font-medium break-words">
                                    <a href={route('wanted.show', ad.id)} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                                        {ad.title}
                                    </a>
                                </p>
                                <p className="text-muted-foreground mt-1 text-xs">
                                    {[ad.author ?? '—', ad.category && t(ad.category), ad.quantity, ad.city].filter(Boolean).join(' · ')} ·{' '}
                                    {formatRelativeTime(ad.created_at)} · {t('Odgovora: :count', { count: ad.responses_count })} ·{' '}
                                    <span className={ad.status === 'blocked' ? 'text-destructive font-medium' : undefined}>
                                        {t(STATUS_LABELS[ad.status])}
                                    </span>
                                </p>
                                <p className="text-muted-foreground mt-2 break-words whitespace-pre-line">{ad.body}</p>
                            </div>

                            <div className="flex shrink-0 flex-wrap gap-2">
                                {ad.status === 'open' && (
                                    <Button variant="outline" size="sm" onClick={() => setStatus(ad, 'blocked')}>
                                        <EyeOff className="size-4" />
                                        {t('Skloni')}
                                    </Button>
                                )}
                                {ad.status === 'blocked' && (
                                    <Button variant="outline" size="sm" onClick={() => setStatus(ad, 'open')}>
                                        <RotateCcw className="size-4" />
                                        {t('Vrati')}
                                    </Button>
                                )}
                                <Button variant="destructive" size="sm" onClick={() => destroy(ad)}>
                                    {t('Obriši')}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Pagination meta={ads} />
        </AdminLayout>
    );
}
