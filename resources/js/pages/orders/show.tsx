import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/format';
import { INQUIRY_STATUS_CLASSES, INQUIRY_STATUS_LABELS, NEXT_INQUIRY_STATUSES } from '@/lib/inquiry';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { type BreadcrumbItem, type Order } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Info, Printer } from 'lucide-react';

export default function OrderShow({ order, canUpdateStatus }: { order: Order; canUpdateStatus: boolean }) {
    const breadcrumbs: BreadcrumbItem[] = [{ title: `Upit #${order.id}`, href: `/porudzbine/${order.id}` }];

    const setStatus = (status: Order['status']) => {
        router.patch(route('orders.status', order.id), { status }, { preserveScroll: true });
    };

    const nextStatuses = NEXT_INQUIRY_STATUSES[order.status] ?? [];

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={`Potvrda upita #${order.id}`} />

            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="font-serif text-4xl sm:text-5xl">Potvrda upita #{order.id}</h1>
                    <p className="text-muted-foreground mt-3 text-sm">
                        Podsetnik za dogovor između kupca i proizvođača — nije fiskalni račun.
                    </p>
                </div>

                <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer className="size-4" />
                    Odštampaj
                </Button>
            </div>

            <div className="mt-8 max-w-2xl">
                <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${INQUIRY_STATUS_CLASSES[order.status]}`}>
                        {INQUIRY_STATUS_LABELS[order.status]}
                    </span>
                    <span className="text-muted-foreground text-sm">{order.shipping_address}</span>
                </div>

                {canUpdateStatus && nextStatuses.length > 0 && (
                    <div className="mt-6">
                        <p className="text-muted-foreground text-xs">Status prijavljujete vi, za svoju evidenciju:</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {nextStatuses.map((status) => (
                                <Button key={status} variant="outline" size="sm" onClick={() => setStatus(status)}>
                                    Označi kao „{INQUIRY_STATUS_LABELS[status]}"
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                {order.note && (
                    <div className="border-border/70 mt-6 rounded-lg border p-4">
                        <p className="text-muted-foreground text-xs">Napomena kupca</p>
                        <p className="mt-1 text-sm whitespace-pre-line">{order.note}</p>
                    </div>
                )}

                <div className="border-border/70 mt-8 rounded-lg border">
                    <div className="divide-border/70 divide-y">
                        {order.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4 text-sm">
                                <div>
                                    <p className="font-medium">{item.product_name}</p>
                                    <p className="text-muted-foreground text-xs">
                                        {formatPrice(item.unit_price)} × {item.quantity}
                                    </p>
                                </div>
                                <span className="font-serif text-lg">{formatPrice(item.subtotal)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="border-border/70 flex items-baseline justify-between border-t px-5 py-4">
                        <span className="text-muted-foreground text-sm">Ukupno po cenovniku proizvođača</span>
                        <span className="font-serif text-2xl">{formatPrice(order.total_price)}</span>
                    </div>
                </div>

                <p className="text-muted-foreground mt-4 flex gap-2 text-xs leading-5">
                    <Info className="mt-0.5 size-3.5 shrink-0" />
                    Platforma ne procesuira plaćanje i ne organizuje dostavu — to se dogovara direktno sa proizvođačem.
                </p>
            </div>
        </MarketplaceLayout>
    );
}
