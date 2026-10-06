import Head from '@/components/head';
import AdminLayout from '@/layouts/admin-layout';
import { formatNumber } from '@/lib/format';
import { t } from '@/lib/i18n';
import { Link } from '@inertiajs/react';
import { ShieldAlert } from 'lucide-react';

type Stats = {
    users: number;
    producers: number;
    products: number;
    conversations: number;
    messages: number;
    pending_reviews: number;
};

type Todo = { label: string; count: number; href: string };
type Revenue = { label: string; total: number; month: number };
type Outcomes = {
    counts: Record<string, number>;
    labels: Record<string, string>;
    topProducts: { name: string; slug: string; count: number }[];
};

export default function AdminDashboard({
    stats,
    todo,
    revenue,
    outcomes,
    twoFactorEnabled,
}: {
    stats: Stats;
    todo: Todo[];
    revenue: Revenue[];
    outcomes: Outcomes;
    /** Whether the admin looking at this has two-step sign-in on. */
    twoFactorEnabled: boolean;
}) {
    const tiles: { label: string; value: string }[] = [
        { label: t('Korisnici'), value: String(stats.users) },
        { label: t('Proizvođači'), value: String(stats.producers) },
        { label: t('Proizvodi'), value: String(stats.products) },
        { label: t('Razgovori'), value: String(stats.conversations) },
        { label: t('Poruke'), value: String(stats.messages) },
    ];
    const waiting = todo.filter((item) => item.count > 0);
    const earned = revenue.reduce((sum, row) => sum + row.total, 0);

    return (
        <AdminLayout title={t('Evidencija')}>
            <Head title={t('Admin')} />
            <div className="flex flex-col gap-8">
                {/* This account confirms payments and blocks people: a
                    password alone should not be all that guards it. */}
                {!twoFactorEnabled && (
                    <Link
                        href={route('two-factor.edit')}
                        className="border-gold/50 bg-cream-deep flex items-start gap-3 rounded-lg border p-4 text-sm leading-6"
                    >
                        <ShieldAlert className="text-gold mt-0.5 size-5 shrink-0" aria-hidden />
                        <span>
                            <strong>{t('Admin nalog štiti samo lozinka.')}</strong> {t('Uključite dvostruku potvrdu prijave — traje dva minuta.')}
                        </span>
                    </Link>
                )}

                {/* What needs someone to act comes first; the totals are
                    only there to be looked at. */}
                <section>
                    <h2 className="font-serif text-2xl">{t('Čeka odluku')}</h2>
                    {waiting.length === 0 ? (
                        <p className="text-muted-foreground mt-2 text-sm">{t('Sve je rešeno.')}</p>
                    ) : (
                        <ul className="mt-3 space-y-2">
                            {waiting.map((item) => (
                                <li key={item.label}>
                                    <Link
                                        href={item.href}
                                        className="bg-olive-soft text-olive hover:bg-olive-soft/80 flex items-center justify-between gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-colors"
                                    >
                                        <span>
                                            {item.count} {item.label}
                                        </span>
                                        <span className="underline underline-offset-4">{t('Pregledaj')}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section>
                    <h2 className="font-serif text-2xl">{t('Prihod')}</h2>
                    <p className="text-muted-foreground mt-1 text-sm">{t('Samo potvrđene uplate; besplatna godina osnivača se ne računa.')}</p>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border p-4">
                            <p className="text-muted-foreground text-sm">{t('Ukupno')}</p>
                            <p className="mt-1 font-serif text-2xl">{formatNumber(earned)} RSD</p>
                        </div>
                        {revenue.map((row) => (
                            <div key={row.label} className="rounded-xl border p-4">
                                <p className="text-muted-foreground text-sm">{row.label}</p>
                                <p className="mt-1 font-serif text-2xl">{formatNumber(row.total)} RSD</p>
                                <p className="text-muted-foreground text-xs">{t('ovog meseca :amount RSD', { amount: formatNumber(row.month) })}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <h2 className="font-serif text-2xl">{t('Ishodi upita ovog meseca')}</h2>
                    {/* The platform never sees a sale, so this is only what
                        producers chose to report - said plainly. */}
                    <p className="text-muted-foreground mt-1 text-sm">
                        {t('Samoprijavljeno od strane proizvođača — neprovereno i samo orijentaciono.')}
                    </p>
                    <div className="mt-3 grid gap-4 sm:grid-cols-3">
                        {Object.entries(outcomes.labels).map(([status, label]) => (
                            <div key={status} className="rounded-xl border p-4">
                                <p className="text-muted-foreground text-sm">{label}</p>
                                <p className="mt-1 text-2xl font-semibold">{outcomes.counts[status] ?? 0}</p>
                            </div>
                        ))}
                    </div>
                    {outcomes.topProducts.length > 0 && (
                        <ol className="mt-4 space-y-1 text-sm">
                            {outcomes.topProducts.map((product, index) => (
                                <li key={product.slug}>
                                    <span className="text-muted-foreground mr-2">{index + 1}.</span>
                                    <Link href={route('marketplace.products.show', product.slug)} className="hover:underline">
                                        {product.name}
                                    </Link>
                                    <span className="text-muted-foreground"> · realizovano {product.count}×</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>

                <section>
                    <h2 className="font-serif text-2xl">{t('Sajt')}</h2>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        {tiles.map((tile) => (
                            <div key={tile.label} className="rounded-xl border p-4">
                                <p className="text-muted-foreground text-sm">{tile.label}</p>
                                <p className="mt-1 text-2xl font-semibold">{tile.value}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </AdminLayout>
    );
}
