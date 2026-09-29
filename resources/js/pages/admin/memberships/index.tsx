import PaidItemActions, { CancelRequestedBadge } from '@/components/admin/paid-item-actions';
import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate, formatNumber, formatRelativeTime } from '@/lib/format';
import { t, tx } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Head, Link, router } from '@inertiajs/react';

type Status = 'pending_payment' | 'active' | 'expired' | 'cancelled';

interface Subscription {
    id: number;
    status: Status;
    reference: string;
    amount_rsd: number;
    ends_at: string | null;
    created_at: string;
    cancel_requested_at: string | null;
    producer: { id: number; name: string; slug: string } | null;
    plan: { id: number; name: string } | null;
}

const TABS: { status: Status; label: string }[] = [
    { status: 'pending_payment', label: tx('Čekaju uplatu') },
    { status: 'active', label: tx('Aktivne') },
    { status: 'expired', label: tx('Istekle') },
    { status: 'cancelled', label: tx('Otkazane') },
];

/**
 * The membership queue (task 20.9). Confirming a payment is a human step on
 * purpose: the money comes in on a bank slip, so someone has to see the
 * statement and say it arrived. Plans and prices live on the billing page.
 */
export default function AdminMemberships({
    subscriptions,
    filters,
    counts,
}: {
    subscriptions: Paginated<Subscription>;
    filters: { status: Status };
    counts: Record<Status, number>;
}) {
    const confirm = (subscription: Subscription) => router.patch(route('admin.memberships.confirm', subscription.id), {}, { preserveScroll: true });
    const cancel = (subscription: Subscription) => router.patch(route('admin.memberships.cancel', subscription.id), {}, { preserveScroll: true });

    return (
        <AdminLayout title={t('Članarine')}>
            <Head title={t('Članarine')} />

            <p className="text-muted-foreground -mt-4 mb-6 text-sm">
                Paketi, cene i podaci za uplatnicu su na stranici{' '}
                <Link href={route('admin.billing.index')} className="underline">
                    {t('Naplata')}
                </Link>
                .
            </p>

            <div className="border-border/70 flex flex-wrap gap-1 border-b pb-3">
                {TABS.map((tab) => (
                    <Link
                        key={tab.status}
                        href={route('admin.memberships.index', { status: tab.status })}
                        preserveScroll
                        className={cn(
                            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            filters.status === tab.status ? 'bg-olive-soft text-olive' : 'text-muted-foreground hover:bg-muted',
                        )}
                    >
                        {t(tab.label)}
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

            {subscriptions.data.length === 0 ? (
                <p className="text-muted-foreground mt-6 text-sm">{t('Ovde nema ničega.')}</p>
            ) : (
                <div className="mt-6 space-y-3">
                    {subscriptions.data.map((subscription) => (
                        <div key={subscription.id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl border p-4">
                            <div className="min-w-0 flex-1">
                                <p className="flex flex-wrap items-center gap-2 font-medium">
                                    {subscription.producer?.name ?? t('Obrisan proizvođač')} · {subscription.plan?.name}
                                    {subscription.status === 'active' && <CancelRequestedBadge at={subscription.cancel_requested_at} />}
                                </p>
                                <p className="text-muted-foreground mt-1 text-sm">
                                    {t('Poziv na broj')} <span className="text-foreground font-medium">{subscription.reference}</span> ·{' '}
                                    {formatNumber(subscription.amount_rsd)} RSD ·{' '}
                                    {t('zatraženo :when', { when: formatRelativeTime(subscription.created_at) })}
                                    {subscription.ends_at && ` · ${t('važi do :date', { date: formatDate(subscription.ends_at) })}`}
                                </p>
                            </div>

                            <PaidItemActions
                                status={subscription.status}
                                what={t('članarinu za :name', { name: subscription.producer?.name ?? '' })}
                                onConfirm={() => confirm(subscription)}
                                onCancel={() => cancel(subscription)}
                            />
                        </div>
                    ))}
                </div>
            )}

            <Pagination meta={subscriptions} />
        </AdminLayout>
    );
}
