import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import { Button } from '@/components/ui/button';
import AdminLayout from '@/layouts/admin-layout';
import { formatRelativeTime } from '@/lib/format';
import { t, tx } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Head, Link, router } from '@inertiajs/react';
import { Check, X } from 'lucide-react';

type Status = 'open' | 'reviewed' | 'dismissed';

interface Report {
    id: number;
    reason: string;
    message: string | null;
    status: Status;
    created_at: string;
    reporter: { id: number; name: string } | null;
    subject: { label: string; name: string; url: string | null };
}

const TABS: { status: Status; label: string }[] = [
    { status: 'open', label: tx('Nove prijave') },
    { status: 'reviewed', label: tx('Rešene') },
    { status: 'dismissed', label: tx('Odbačene') },
];

/**
 * The complaints queue. Because the platform never sees the deal
 * itself, this is the only place fraud or silence gets reported before it
 * turns into a public review.
 */
export default function AdminReports({
    reports,
    filters,
    counts,
}: {
    reports: Paginated<Report>;
    filters: { status: Status };
    counts: Record<Status, number>;
}) {
    const decide = (report: Report, status: Exclude<Status, 'open'>) =>
        router.patch(route('admin.reports.update', report.id), { status }, { preserveScroll: true });

    return (
        <AdminLayout title={t('Prijave')}>
            <Head title={t('Prijave')} />

            <div className="border-border/70 flex flex-wrap gap-1 border-b pb-3">
                {TABS.map((tab) => (
                    <Link
                        key={tab.status}
                        href={route('admin.reports.index', { status: tab.status })}
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
                                tab.status === 'open' && counts.open > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                            )}
                        >
                            {counts[tab.status]}
                        </span>
                    </Link>
                ))}
            </div>

            {reports.data.length === 0 ? (
                <p className="text-muted-foreground mt-6 text-sm">
                    {filters.status === 'open' ? t('Nema novih prijava.') : t('Ovde još nema ničega.')}
                </p>
            ) : (
                <div className="mt-6 space-y-3">
                    {reports.data.map((report) => (
                        <div key={report.id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl border p-4">
                            <div className="min-w-0 flex-1">
                                <p className="text-muted-foreground text-xs">
                                    {report.subject.label} ·{' '}
                                    {report.subject.url ? (
                                        <a href={report.subject.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                                            {report.subject.name}
                                        </a>
                                    ) : (
                                        report.subject.name
                                    )}{' '}
                                    · {t('prijavio :name', { name: report.reporter?.name ?? t('obrisan nalog') })} ·{' '}
                                    {formatRelativeTime(report.created_at)}
                                </p>

                                <p className="mt-1.5 text-sm font-medium">{report.reason}</p>
                                {report.message && <p className="text-muted-foreground mt-1 text-sm break-words">{report.message}</p>}
                            </div>

                            {report.status === 'open' && (
                                <div className="flex shrink-0 flex-wrap gap-2">
                                    <Button size="sm" onClick={() => decide(report, 'reviewed')}>
                                        <Check className="size-4" />
                                        {t('Rešeno')}
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => decide(report, 'dismissed')}>
                                        <X className="size-4" />
                                        {t('Odbaci')}
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <Pagination meta={reports} />
        </AdminLayout>
    );
}
