import { formatPrice } from '@/lib/format';
import { INQUIRY_STATUS_CLASSES, INQUIRY_STATUS_LABELS } from '@/lib/inquiry';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { type BreadcrumbItem, type Order } from '@/types';
import { Head, Link } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Moji upiti', href: '/moje-porudzbine' }];

export default function MyOrders({ orders }: { orders: Order[] }) {
    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title="Moji upiti" />

            <div className="flex flex-col gap-4">
                <h1 className="font-serif text-4xl sm:text-5xl">Moji upiti</h1>

                {orders.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Još uvek nemate poslatih upita.</p>
                ) : (
                    <div className="space-y-3">
                        {orders.map((order) => (
                            <Link
                                key={order.id}
                                href={route('orders.show', order.id)}
                                className="hover:bg-muted flex flex-wrap items-center justify-between gap-2 rounded-xl border p-4"
                            >
                                <span>Upit #{order.id}</span>
                                <span className={`rounded-full px-3 py-1 text-xs font-medium ${INQUIRY_STATUS_CLASSES[order.status]}`}>
                                    {INQUIRY_STATUS_LABELS[order.status]}
                                </span>
                                <span className="font-serif text-lg">{formatPrice(order.total_price)}</span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </MarketplaceLayout>
    );
}
