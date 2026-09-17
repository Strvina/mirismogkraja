import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Order } from '@/types';
import { Head, router } from '@inertiajs/react';

const statusLabels: Record<Order['status'], string> = {
    pending: 'Na čekanju',
    confirmed: 'Potvrđena',
    shipped: 'Poslata',
    delivered: 'Isporučena',
    cancelled: 'Otkazana',
};

const NEXT_STATUS: Partial<Record<Order['status'], Order['status'][]>> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['shipped', 'cancelled'],
    shipped: ['delivered'],
};

export default function OrderShow({ order, canUpdateStatus }: { order: Order; canUpdateStatus: boolean }) {
    const breadcrumbs: BreadcrumbItem[] = [{ title: `Porudžbina #${order.id}`, href: `/porudzbine/${order.id}` }];

    const setStatus = (status: Order['status']) => {
        router.patch(route('orders.status', order.id), { status }, { preserveScroll: true });
    };

    const nextStatuses = NEXT_STATUS[order.status] ?? [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Porudžbina #${order.id}`} />

            <div className="flex flex-1 flex-col gap-6 p-4">
                <h1 className="text-xl font-semibold">Porudžbina #{order.id}</h1>
                <p className="text-sm text-muted-foreground">
                    Status: {statusLabels[order.status]} · Adresa: {order.shipping_address}
                </p>

                {canUpdateStatus && nextStatuses.length > 0 && (
                    <div className="flex gap-2">
                        {nextStatuses.map((status) => (
                            <Button key={status} variant="outline" size="sm" onClick={() => setStatus(status)}>
                                Označi kao „{statusLabels[status]}"
                            </Button>
                        ))}
                    </div>
                )}

                <div className="max-w-xl space-y-2">
                    {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                            <span>
                                {item.product_name} × {item.quantity}
                            </span>
                            <span>{item.subtotal} RSD</span>
                        </div>
                    ))}
                    <div className="flex justify-between border-t pt-2 font-semibold">
                        <span>Ukupno</span>
                        <span>{order.total_price} RSD</span>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
