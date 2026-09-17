import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Admin', href: '/admin' }];

type Stats = {
    users: number;
    households: number;
    products: number;
    orders: number;
    revenue: number;
};

export default function AdminDashboard({ stats }: { stats: Stats }) {
    const tiles: { label: string; value: string }[] = [
        { label: 'Korisnici', value: String(stats.users) },
        { label: 'Domaćinstva', value: String(stats.households) },
        { label: 'Proizvodi', value: String(stats.products) },
        { label: 'Porudžbine', value: String(stats.orders) },
        { label: 'Prihod (potvrđene porudžbine)', value: `${stats.revenue.toFixed(2)} RSD` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin" />
            <div className="flex flex-1 flex-col gap-4 p-4">
                <h1 className="text-xl font-semibold">Admin panel</h1>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {tiles.map((tile) => (
                        <div key={tile.label} className="rounded-xl border p-4">
                            <p className="text-sm text-muted-foreground">{tile.label}</p>
                            <p className="mt-1 text-2xl font-semibold">{tile.value}</p>
                        </div>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
