import AdminLayout from '@/layouts/admin-layout';
import { Head } from '@inertiajs/react';

type Stats = {
    users: number;
    producers: number;
    products: number;
    orders: number;
    reportedValue: number;
};

export default function AdminDashboard({ stats }: { stats: Stats }) {
    const tiles: { label: string; value: string; note?: string }[] = [
        { label: 'Korisnici', value: String(stats.users) },
        { label: 'Proizvođači', value: String(stats.producers) },
        { label: 'Proizvodi', value: String(stats.products) },
        { label: 'Upiti', value: String(stats.orders) },
        { label: 'Prijavljena vrednost upita', value: `${stats.reportedValue.toFixed(2)} RSD`, note: 'Samoprijavljeno, neprovereno' },
    ];

    return (
        <AdminLayout title="Evidencija">
            <Head title="Admin" />
            <div className="flex flex-col gap-4">
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
