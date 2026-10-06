import Head from '@/components/head';
import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { ask } from '@/lib/confirm';
import { waitingBuyers } from '@/lib/format';
import { t, tx } from '@/lib/i18n';
import { type BreadcrumbItem, type Producer, type Product } from '@/types';
import { Link, router } from '@inertiajs/react';
import { BellRing } from 'lucide-react';

const STATUS_LABELS: Record<Product['status'], string> = {
    draft: tx('Nacrt'),
    active: tx('Objavljeno'),
    archived: tx('Sklonjeno'),
    blocked: tx('Blokiran'),
};

export default function ProductsIndex({
    producer,
    products,
    waitingTotal,
    onlyWanted,
}: {
    producer: Producer;
    /** waiting_count: buyers who asked to hear when the product is back. */
    products: Paginated<Product & { waiting_count: number }>;
    /** The same, across all of the producer's products. */
    waitingTotal: number;
    onlyWanted: boolean;
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Moji proizvođači'), href: '/moji-proizvodjaci' },
        { title: producer.name, href: `/moji-proizvodjaci/${producer.id}/izmena` },
        { title: t('Proizvodi'), href: `/moji-proizvodjaci/${producer.id}/proizvodi` },
    ];

    const destroy = async (product: Product) => {
        if (
            await ask({
                title: t('Obrisati proizvod „:name”?', { name: product.name }),
                description: t('Ova radnja se ne može poništiti.'),
                tone: 'danger',
            })
        ) {
            router.delete(route('producers.products.destroy', [producer.id, product.id]));
        }
    };

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Proizvodi')} — ${producer.name}`} />

            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h1 className="font-serif text-4xl sm:text-5xl">
                        {t('Proizvodi')} — {producer.name}
                    </h1>
                    <Button asChild>
                        <Link href={route('producers.products.create', producer.id)}>{t('Novi proizvod')}</Link>
                    </Button>
                </div>

                {/* Demand a producer would otherwise never see: nobody writes
                    about what is marked as gone. */}
                {waitingTotal > 0 && (
                    <div className="border-primary/30 bg-primary/5 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm">
                        <p className="flex items-start gap-2">
                            <BellRing className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
                            <span>
                                <strong>{waitingBuyers(waitingTotal)}</strong>{' '}
                                {t('da im javimo kad proizvod ponovo stigne. Čim dopunite zalihe ili počne sezona, obavestićemo ih umesto vas.')}
                            </span>
                        </p>
                        <Link
                            href={
                                onlyWanted
                                    ? route('producers.products.index', producer.id)
                                    : route('producers.products.index', { producer: producer.id, cekaju: 1 })
                            }
                            className="text-primary font-medium underline underline-offset-4"
                        >
                            {onlyWanted ? t('Prikaži sve proizvode') : t('Prikaži samo te proizvode')}
                        </Link>
                    </div>
                )}

                {products.data.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        {onlyWanted ? t('Trenutno niko ne čeka nijedan proizvod.') : t('Nema još proizvoda.')}
                    </p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {products.data.map((product) => (
                            <div key={product.id} className="rounded-xl border p-4">
                                <div className="flex items-start justify-between">
                                    <h2 className="font-serif text-lg">{product.name}</h2>
                                    <span
                                        className={
                                            product.status === 'blocked'
                                                ? 'bg-destructive/10 text-destructive rounded-full px-2 py-1 text-xs'
                                                : 'bg-muted rounded-full px-2 py-1 text-xs'
                                        }
                                    >
                                        {t(STATUS_LABELS[product.status])}
                                    </span>
                                </div>
                                <p className="text-muted-foreground mt-1 text-sm">
                                    {product.price} RSD / {product.unit} · {product.category && t(product.category.name)}
                                </p>
                                {product.waiting_count > 0 && (
                                    <p className="text-primary mt-2 flex items-center gap-1.5 text-sm font-medium">
                                        <BellRing className="size-4 shrink-0" aria-hidden />
                                        {waitingBuyers(product.waiting_count)}
                                    </p>
                                )}
                                <div className="mt-4 flex gap-2">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={route('producers.products.edit', [producer.id, product.id])}>{t('Izmeni')}</Link>
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => destroy(product)}>
                                        {t('Obriši')}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <Pagination meta={products} />
            </div>
        </MarketplaceLayout>
    );
}
