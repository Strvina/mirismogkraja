import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Order, type User } from '@/types';
import { Head, Link } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Porudžbine mog domaćinstva', href: '/porudzbine-mog-domacinstva' }];

const statusLabels: Record<Order['status'], string> = {
    pending: 'Na čekanju',
    confirmed: 'Potvrđena',
    shipped: 'Poslata',
    delivered: 'Isporučena',
    cancelled: 'Otkazana',
};

type OrderWithBuyer = Order & { user: User };

export default function HouseholdOrders({ orders }: { orders: OrderWithBuyer[] }) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Porudžbine mog domaćinstva" />

            <div className="flex flex-1 flex-col gap-4 p-4">
                <h1 className="text-xl font-semibold">Porudžbine mog domaćinstva</h1>

                {orders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nema porudžbina za tvoja domaćinstva.</p>
                ) : (
                    <div className="space-y-3">
                        {orders.map((order) => (
                            <Link
                                key={order.id}
                                href={route('orders.show', order.id)}
                                className="flex items-center justify-between rounded-xl border p-4 hover:bg-muted"
                            >
                                <div>
                                    <p>Porudžbina #{order.id}</p>
                                    <p className="text-xs text-muted-foreground">Kupac: {order.user.name}</p>
                                </div>
                                <span className="text-sm text-muted-foreground">{statusLabels[order.status]}</span>
                                <span className="font-semibold">
                                    {order.items.reduce((sum, item) => sum + Number(item.subtotal), 0).toFixed(2)} RSD
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
