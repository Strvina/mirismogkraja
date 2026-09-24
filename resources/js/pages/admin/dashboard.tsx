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

export default function AdminDashboard({ stats }: { stats: Stats }) {
    const tiles: { label: string; value: string; note?: string }[] = [
        { label: 'Korisnici', value: String(stats.users) },
        { label: 'Proizvođači', value: String(stats.producers) },
        { label: 'Proizvodi', value: String(stats.products) },
        { label: 'Razgovori', value: String(stats.conversations) },
        { label: 'Poruke', value: String(stats.messages) },
    ];

    return (
        <AdminLayout title="Evidencija">
            <Head title="Admin" />
            <div className="flex flex-col gap-4">
                {/* The only entry here that needs someone to act, so it sits
                    above the totals instead of being one tile among them. */}
                {stats.pending_reviews > 0 && (
                    <Link
                        href={route('admin.reviews.index', { status: 'pending' })}
                        className="bg-olive-soft text-olive hover:bg-olive-soft/80 flex items-center justify-between gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-colors"
                    >
                        <span>
                            {stats.pending_reviews} {stats.pending_reviews === 1 ? 'utisak čeka' : 'utisaka čeka'} odobrenje
                        </span>
                        <span className="underline underline-offset-4">Pregledaj</span>
                    </Link>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {tiles.map((tile) => (
                        <div key={tile.label} className="rounded-xl border p-4">
                            <p className="text-muted-foreground text-sm">{tile.label}</p>
                            <p className="mt-1 text-2xl font-semibold">{tile.value}</p>
                            {tile.note && <p className="text-muted-foreground mt-1 text-xs">{tile.note}</p>}
                        </div>
                    ))}
                </div>
            </div>
        </AdminLayout>
    );
}
