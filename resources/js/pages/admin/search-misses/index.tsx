import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Head, Link } from '@inertiajs/react';

interface Term {
    term: string;
    total: number;
    /** The last day someone searched for it. */
    last_on: string;
}

/**
 * What people searched the catalogue for and did not find. Read it before
 * deciding whom to invite: a term near the top is a producer the site is
 * missing.
 */
export default function AdminSearchMisses({ terms, days, periods, keepDays }: { terms: Term[]; days: number; periods: number[]; keepDays: number }) {
    return (
        <AdminLayout title={t('Šta kupci traže')}>
            <Head title={t('Šta kupci traže')} />

            <p className="text-muted-foreground max-w-2xl text-sm leading-6">
                {t(
                    'Pretrage kataloga koje nisu našle ni proizvod ni proizvođača. Brojimo ljude, ne klikove: isti posetilac se za isti pojam računa jednom dnevno, roboti se ne računaju, a o tome ko je tražio ne čuvamo ništa. Brojači se čuvaju :days dana.',
                    {
                        days: keepDays,
                    },
                )}
            </p>

            <div className="border-border/70 mt-6 flex flex-wrap gap-1 border-b pb-3">
                {periods.map((period) => (
                    <Link
                        key={period}
                        href={route('admin.search-misses.index', { dana: period })}
                        preserveScroll
                        className={cn(
                            'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            days === period ? 'bg-olive-soft text-olive' : 'text-muted-foreground hover:bg-muted',
                        )}
                    >
                        {t('Poslednjih :days dana', { days: period })}
                    </Link>
                ))}
            </div>

            {terms.length === 0 ? (
                <p className="text-muted-foreground mt-6 text-sm">{t('U ovom periodu svaka pretraga je nešto našla.')}</p>
            ) : (
                <ol className="mt-6 max-w-2xl space-y-2">
                    {terms.map((item, index) => (
                        <li key={item.term} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                            <span className="min-w-0 break-words">
                                <span className="text-muted-foreground mr-2 tabular-nums">{index + 1}.</span>
                                <a
                                    href={route('marketplace.products.index', { q: item.term })}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-medium underline-offset-2 hover:underline"
                                >
                                    {item.term}
                                </a>
                            </span>
                            <span className="text-muted-foreground shrink-0 text-right text-xs">
                                <span className="text-foreground text-sm font-semibold tabular-nums">{item.total}×</span>
                                <br />
                                {t('poslednji put :date', { date: formatDate(item.last_on, { day: 'numeric', month: 'long' }) })}
                            </span>
                        </li>
                    ))}
                </ol>
            )}
        </AdminLayout>
    );
}
