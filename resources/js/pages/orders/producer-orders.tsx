import { formatPrice } from '@/lib/format';
import { INQUIRY_STATUS_CLASSES, INQUIRY_STATUS_LABELS } from '@/lib/inquiry';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { type BreadcrumbItem, type Order, type User } from '@/types';
import { Head, Link } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Upiti mog proizvođača', href: '/porudzbine-mog-proizvodjaca' }];

type OrderWithBuyer = Order & { user: User };

export default function ProducerOrders({ orders }: { orders: OrderWithBuyer[] }) {
    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title="Upiti mog proizvođača" />

            <div className="flex flex-col gap-4">
                <h1 className="font-serif text-4xl sm:text-5xl">Upiti mog proizvođača</h1>

                {orders.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Još nema upita za vaše proizvođače.</p>
                ) : (
                    <div className="space-y-3">
                        {orders.map((order) => (
                            <Link
                                key={order.id}
                                href={route('orders.show', order.id)}
                                className="hover:bg-muted flex flex-wrap items-center justify-between gap-2 rounded-xl border p-4"
                            >
                                <div>
                                    <p>Upit #{order.id}</p>
                                    <p className="text-muted-foreground text-xs">Kupac: {order.user.name}</p>
                                </div>
                                <span className={`rounded-full px-3 py-1 text-xs font-medium ${INQUIRY_STATUS_CLASSES[order.status]}`}>
                                    {INQUIRY_STATUS_LABELS[order.status]}
                                </span>
                                <span className="font-semibold">
                                    {order.items.reduce((sum, item) => sum + Number(item.subtotal), 0).toFixed(2)} RSD
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </MarketplaceLayout>
    );
}
