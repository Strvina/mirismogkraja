import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Order } from '@/types';
import { Head, Link } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Moje porudžbine', href: '/moje-porudzbine' }];

const statusLabels: Record<Order['status'], string> = {
    pending: 'Na čekanju',
    confirmed: 'Potvrđena',
    shipped: 'Poslata',
    delivered: 'Isporučena',
    cancelled: 'Otkazana',
};

export default function MyOrders({ orders }: { orders: Order[] }) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Moje porudžbine" />

            <div className="flex flex-1 flex-col gap-4 p-4">
                <h1 className="font-serif text-xl font-semibold">Moje porudžbine</h1>

                {orders.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Još uvek nemaš porudžbina.</p>
                ) : (
                    <div className="space-y-3">
                        {orders.map((order) => (
                            <Link
                                key={order.id}
                                href={route('orders.show', order.id)}
                                className="hover:bg-muted flex flex-wrap items-center justify-between gap-2 rounded-xl border p-4"
                            >
                                <span>Porudžbina #{order.id}</span>
                                <span className="text-muted-foreground text-sm">{statusLabels[order.status]}</span>
                                <span className="font-semibold">{order.total_price} RSD</span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
