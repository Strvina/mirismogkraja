import PaidItemActions, { CancelRequestedBadge } from '@/components/admin/paid-item-actions';
import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import AdminLayout from '@/layouts/admin-layout';
import { formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Head, Link, router } from '@inertiajs/react';

type Status = 'pending_payment' | 'active' | 'expired' | 'cancelled';

interface BoostRow {
    id: number;
    kind: 'profile' | 'product';
    name: string;
    producer: { id: number; name: string; slug: string } | null;
    status: Status;
    reference: string;
    amount_rsd: number;
    days: number;
    ends_at: string | null;
    created_at: string;
    cancel_requested_at: string | null;
}

const TABS: { status: Status; label: string }[] = [
    { status: 'pending_payment', label: 'Čekaju uplatu' },
    { status: 'active', label: 'Aktivna' },
    { status: 'expired', label: 'Istekla' },
    { status: 'cancelled', label: 'Otkazana' },
];

const dinars = new Intl.NumberFormat('sr-RS');

export default function AdminBoosts({
    boosts,
    filters,
    counts,
}: {
    boosts: Paginated<BoostRow>;
    filters: { status: Status };
    counts: Record<Status, number>;
}) {
    const confirm = (boost: BoostRow) => router.patch(route('admin.boosts.confirm', boost.id), {}, { preserveScroll: true });
    const cancel = (boost: BoostRow) => router.patch(route('admin.boosts.cancel', boost.id), {}, { preserveScroll: true });

    return (
        <AdminLayout title="Isticanja">
            <Head title="Isticanja" />

            <p className="text-muted-foreground -mt-4 mb-6 text-sm">
                Cene i trajanje isticanja su na stranici{' '}
                <Link href={route('admin.billing.index')} className="underline">
                    Naplata
                </Link>
                .
            </p>

            <div className="border-border/70 flex flex-wrap gap-1 border-b pb-3">
                {TABS.map((tab) => (
                    <Link
                        key={tab.status}
                        href={route('admin.boosts.index', { status: tab.status })}
                        preserveScroll
                        className={cn(
                            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            filters.status === tab.status ? 'bg-olive-soft text-olive' : 'text-muted-foreground hover:bg-muted',
                        )}
                    >
                        {tab.label}
                        <span
                            className={cn(
                                'rounded-full px-1.5 py-0.5 text-[0.65rem] tabular-nums',
                                tab.status === 'pending_payment' && counts.pending_payment > 0
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground',
                            )}
                        >
                            {counts[tab.status]}
                        </span>
                    </Link>
                ))}
            </div>

            {boosts.data.length === 0 ? (
                <p className="text-muted-foreground mt-6 text-sm">Ovde nema ničega.</p>
            ) : (
                <div className="mt-6 space-y-3">
                    {boosts.data.map((boost) => (
                        <div key={boost.id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl border p-4">
                            <div className="min-w-0 flex-1">
                                <p className="flex flex-wrap items-center gap-2 font-medium break-words">
                                    {boost.name}
                                    <span className="text-muted-foreground font-normal">· {boost.kind === 'product' ? 'proizvod' : 'profil'}</span>
                                    {boost.status === 'active' && <CancelRequestedBadge at={boost.cancel_requested_at} />}
                                </p>
                                <p className="text-muted-foreground mt-1 text-sm">
                                    {boost.producer?.name ?? 'Obrisan proizvođač'} · poziv na broj{' '}
                                    <span className="text-foreground font-medium">{boost.reference}</span> · {dinars.format(boost.amount_rsd)} RSD ·{' '}
                                    {boost.days} dana · zatraženo {formatRelativeTime(boost.created_at)}
                                    {boost.ends_at && ` · do ${new Date(boost.ends_at).toLocaleDateString('sr-RS')}`}
                                </p>
                            </div>

                            <PaidItemActions
                                status={boost.status}
                                what={`isticanje „${boost.name}”`}
                                onConfirm={() => confirm(boost)}
                                onCancel={() => cancel(boost)}
                            />
                        </div>
                    ))}
                </div>
            )}

            <Pagination meta={boosts} />
        </AdminLayout>
    );
}
