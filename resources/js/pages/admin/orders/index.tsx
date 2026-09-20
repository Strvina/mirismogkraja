import { INQUIRY_STATUS_LABELS } from '@/lib/inquiry';
import AdminLayout from '@/layouts/admin-layout';
import { type Order, type User } from '@/types';
import { Head, Link } from '@inertiajs/react';

type OrderWithBuyer = Order & { user: User };

export default function AdminOrdersIndex({ orders }: { orders: OrderWithBuyer[] }) {
    return (
        <AdminLayout title="Upiti">
            <Head title="Upiti" />

            <div className="flex flex-col gap-4">

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
        </AdminLayout>
    );
}
