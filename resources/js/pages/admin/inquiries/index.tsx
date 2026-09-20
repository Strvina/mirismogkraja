import { formatPrice } from '@/lib/format';
import { INQUIRY_STATUS_LABELS } from '@/lib/inquiry';
import AdminLayout from '@/layouts/admin-layout';
import { type Order } from '@/types';
import { Head } from '@inertiajs/react';
import { Info } from 'lucide-react';

type StatusRow = { count: number; value: number };

export default function AdminInquiriesIndex({
    byStatus,
    topProductsThisMonth,
    topProducers,
}: {
    byStatus: Partial<Record<Order['status'], StatusRow>>;
    topProductsThisMonth: { product_name: string; quantity: number; value: number }[];
    topProducers: { producer: string; inquiries: number; value: number }[];
}) {
    const statuses = Object.keys(INQUIRY_STATUS_LABELS) as Order['status'][];

    return (
        <AdminLayout title="Upiti i prodaja">
            <Head title="Upiti i prodaja — Admin" />

            <div className="bg-gold/15 flex gap-3 rounded-lg p-4 text-sm leading-6">
                <Info className="mt-0.5 size-4 shrink-0" />
                <p>
                    Svi brojevi su <strong>samoprijavljeni od strane proizvođača</strong>. Platforma ne procesuira plaćanje ni dostavu i ne
                    može ih proveriti — koristite ih orijentaciono, ne za obračun.
                </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {statuses.map((status) => (
                    <div key={status} className="border-border/70 rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">{INQUIRY_STATUS_LABELS[status]}</p>
                        <p className="mt-1 font-serif text-3xl">{byStatus[status]?.count ?? 0}</p>
                        <p className="text-muted-foreground mt-1 text-xs">{formatPrice(byStatus[status]?.value ?? 0)}</p>
                    </div>
                ))}
            </div>

            <section className="mt-12">
                <h2 className="font-serif text-2xl">Najtraženije ovog meseca</h2>
                <p className="text-muted-foreground mt-1 text-sm">Po upitima koje su proizvođači označili kao realizovane.</p>

                {topProductsThisMonth.length === 0 ? (
                    <p className="text-muted-foreground mt-4 text-sm">Nema realizovanih upita ovog meseca.</p>
                ) : (
                    <div className="border-border/70 divide-border/70 mt-4 divide-y rounded-lg border">
                        {topProductsThisMonth.map((row) => (
                            <div key={row.product_name} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                                <span className="break-words">{row.product_name}</span>
                                <span className="text-muted-foreground whitespace-nowrap">
                                    {row.quantity} kom · {formatPrice(row.value)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="mt-12">
                <h2 className="font-serif text-2xl">Proizvođači po prijavljenoj vrednosti</h2>

                {topProducers.length === 0 ? (
                    <p className="text-muted-foreground mt-4 text-sm">Još nema realizovanih upita.</p>
                ) : (
                    <div className="border-border/70 divide-border/70 mt-4 divide-y rounded-lg border">
                        {topProducers.map((row) => (
                            <div key={row.producer} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                                <span className="break-words">{row.producer}</span>
                                <span className="text-muted-foreground whitespace-nowrap">
                                    {row.inquiries} upita · {formatPrice(row.value)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </AdminLayout>
    );
}
