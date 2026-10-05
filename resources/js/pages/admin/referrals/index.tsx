import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import AdminLayout from '@/layouts/admin-layout';
import { formatRelativeTime } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Head, Link } from '@inertiajs/react';

interface Referral {
    id: number;
    status: string;
    status_label: string;
    created_at: string;
    rewarded_at: string | null;
    referrer: { id: number; name: string; slug: string } | null;
    user: { id: number; name: string; email: string } | null;
    producer: { id: number; name: string; slug: string; status: string } | null;
}

/**
 * Who referred whom. Nothing is decided here - a referral is settled when
 * the referred producer is approved - but a producer whose "new" producers
 * all look alike shows up in this list first.
 */
export default function AdminReferralsIndex({
    referrals,
    statuses,
    filters,
    rules,
}: {
    referrals: Paginated<Referral>;
    statuses: Record<string, string>;
    filters: { status: string | null };
    rules: { rewardDays: number; maxPerYear: number };
}) {
    const tabs: { status: string | null; label: string }[] = [
        { status: null, label: t('Sve') },
        ...Object.entries(statuses).map(([status, label]) => ({ status, label })),
    ];

    return (
        <AdminLayout title={t('Preporuke')}>
            <Head title={t('Preporuke')} />

            <p className="text-muted-foreground max-w-2xl text-sm leading-6">
                {t(
                    'Kada odobrite proizvođača koji je došao preko nečijeg linka, oboje dobijaju :days dana Premium članstva — najviše :max puta godišnje po preporučiocu.',
                    {
                        days: rules.rewardDays,
                        max: rules.maxPerYear,
                    },
                )}
            </p>

            <div className="border-border/70 mt-6 flex flex-wrap gap-1 border-b pb-3">
                {tabs.map((tab) => (
                    <Link
                        key={tab.status ?? 'all'}
                        href={route('admin.referrals.index', tab.status ? { status: tab.status } : {})}
                        preserveScroll
                        className={cn(
                            'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            filters.status === tab.status ? 'bg-olive-soft text-olive' : 'text-muted-foreground hover:bg-muted',
                        )}
                    >
                        {tab.label}
                    </Link>
                ))}
            </div>

            {referrals.data.length === 0 ? (
                <p className="text-muted-foreground mt-6 text-sm">{t('Ovde još nema ničega.')}</p>
            ) : (
                <div className="mt-6 space-y-3">
                    {referrals.data.map((referral) => (
                        <div key={referral.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4 text-sm">
                            <div className="min-w-0">
                                <p className="break-words">
                                    <span className="text-muted-foreground">{t('Preporučio:')}</span>{' '}
                                    {referral.referrer ? (
                                        <a
                                            href={route('marketplace.producers.show', referral.referrer.slug)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="font-medium underline underline-offset-2"
                                        >
                                            {referral.referrer.name}
                                        </a>
                                    ) : (
                                        '—'
                                    )}
                                </p>
                                <p className="mt-1 break-words">
                                    <span className="text-muted-foreground">{t('Novi nalog:')}</span> {referral.user?.name ?? '—'}
                                    {referral.user && <span className="text-muted-foreground"> · {referral.user.email}</span>}
                                </p>
                                <p className="mt-1 break-words">
                                    <span className="text-muted-foreground">{t('Njegov proizvođač:')}</span>{' '}
                                    {referral.producer?.name ?? t('još ga nema')}
                                </p>
                                <p className="text-muted-foreground mt-1 text-xs">{formatRelativeTime(referral.created_at)}</p>
                            </div>
                            <span
                                className={cn(
                                    'rounded-full px-2.5 py-1 text-xs',
                                    referral.status === 'rewarded'
                                        ? 'bg-olive-soft text-olive'
                                        : referral.status === 'pending'
                                          ? 'bg-muted text-muted-foreground'
                                          : 'bg-destructive/10 text-destructive',
                                )}
                            >
                                {referral.status_label}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            <Pagination meta={referrals} />
        </AdminLayout>
    );
}
