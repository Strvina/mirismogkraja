import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Admin', href: '/admin' }];

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
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin" />
            <div className="flex flex-1 flex-col gap-4 p-4">
                <h1 className="font-serif text-xl font-semibold">Admin panel</h1>
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
        </AppLayout>
    );
}
