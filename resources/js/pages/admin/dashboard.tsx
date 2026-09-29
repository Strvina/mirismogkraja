import AdminLayout from '@/layouts/admin-layout';
import { Head, Link } from '@inertiajs/react';

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

const dinars = new Intl.NumberFormat('sr-RS');

export default function AdminDashboard({ stats, todo, revenue, outcomes }: { stats: Stats; todo: Todo[]; revenue: Revenue[]; outcomes: Outcomes }) {
    const tiles: { label: string; value: string }[] = [
        { label: 'Korisnici', value: String(stats.users) },
        { label: 'Proizvođači', value: String(stats.producers) },
        { label: 'Proizvodi', value: String(stats.products) },
        { label: 'Razgovori', value: String(stats.conversations) },
        { label: 'Poruke', value: String(stats.messages) },
    ];
    const waiting = todo.filter((item) => item.count > 0);
    const earned = revenue.reduce((sum, row) => sum + row.total, 0);

    return (
        <AdminLayout title="Evidencija">
            <Head title="Admin" />
            <div className="flex flex-col gap-8">
                {/* What needs someone to act comes first; the totals are
                    only there to be looked at. */}
                <section>
                    <h2 className="font-serif text-2xl">Čeka odluku</h2>
                    {waiting.length === 0 ? (
                        <p className="text-muted-foreground mt-2 text-sm">Sve je rešeno.</p>
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
                                        <span className="underline underline-offset-4">Pregledaj</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section>
                    <h2 className="font-serif text-2xl">Prihod</h2>
                    <p className="text-muted-foreground mt-1 text-sm">Samo potvrđene uplate; besplatna godina osnivača se ne računa.</p>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border p-4">
                            <p className="text-muted-foreground text-sm">Ukupno</p>
                            <p className="mt-1 font-serif text-2xl">{dinars.format(earned)} RSD</p>
                        </div>
                        {revenue.map((row) => (
                            <div key={row.label} className="rounded-xl border p-4">
                                <p className="text-muted-foreground text-sm">{row.label}</p>
                                <p className="mt-1 font-serif text-2xl">{dinars.format(row.total)} RSD</p>
                                <p className="text-muted-foreground text-xs">ovog meseca {dinars.format(row.month)} RSD</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <h2 className="font-serif text-2xl">Ishodi upita ovog meseca</h2>
                    {/* The platform never sees a sale, so this is only what
                        producers chose to report - said plainly. */}
                    <p className="text-muted-foreground mt-1 text-sm">Samoprijavljeno od strane proizvođača — neprovereno i samo orijentaciono.</p>
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
                    <h2 className="font-serif text-2xl">Sajt</h2>
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
