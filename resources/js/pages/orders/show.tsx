import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Order } from '@/types';
import { Head } from '@inertiajs/react';

const statusLabels: Record<Order['status'], string> = {
    pending: 'Na čekanju',
    confirmed: 'Potvrđena',
    shipped: 'Poslata',
    delivered: 'Isporučena',
    cancelled: 'Otkazana',
};

export default function OrderShow({ order }: { order: Order }) {
    const breadcrumbs: BreadcrumbItem[] = [{ title: `Porudžbina #${order.id}`, href: `/porudzbine/${order.id}` }];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Porudžbina #${order.id}`} />

            <div className="flex flex-1 flex-col gap-6 p-4">
                <h1 className="text-xl font-semibold">Porudžbina #{order.id}</h1>
                <p className="text-sm text-muted-foreground">
                    Status: {statusLabels[order.status]} · Adresa: {order.shipping_address}
                </p>

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
