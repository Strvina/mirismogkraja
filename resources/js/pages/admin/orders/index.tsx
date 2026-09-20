import { INQUIRY_STATUS_LABELS } from '@/lib/inquiry';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Order, type User } from '@/types';
import { Head, Link } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Upiti', href: '/admin/porudzbine' },
];

type OrderWithBuyer = Order & { user: User };

export default function AdminOrdersIndex({ orders }: { orders: OrderWithBuyer[] }) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Upiti" />

            <div className="flex flex-1 flex-col gap-4 p-4">
                <h1 className="font-serif text-xl font-semibold">Sve porudžbine</h1>

                <div className="space-y-2">
                    {orders.map((order) => (
                        <Link
                            key={order.id}
                            href={route('orders.show', order.id)}
                            className="hover:bg-muted flex flex-wrap items-center justify-between gap-2 rounded-xl border p-4"
                        >
                            <span>Upit #{order.id}</span>
                            <span className="text-muted-foreground text-sm">{order.user.name}</span>
                            <span className="text-muted-foreground text-sm">{INQUIRY_STATUS_LABELS[order.status]}</span>
                            <span className="font-semibold">{order.total_price} RSD</span>
                        </Link>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
