import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { ask } from '@/lib/confirm';
import { t, tx } from '@/lib/i18n';
import { type BreadcrumbItem, type Producer, type Product } from '@/types';
import { Head, Link, router } from '@inertiajs/react';

const STATUS_LABELS: Record<Product['status'], string> = {
    draft: tx('Nacrt'),
    active: tx('Objavljeno'),
    archived: tx('Sklonjeno'),
    blocked: tx('Blokiran'),
};

export default function ProductsIndex({ producer, products }: { producer: Producer; products: Product[] }) {
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

                {products.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t('Nema još proizvoda.')}</p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {products.map((product) => (
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
            </div>
        </MarketplaceLayout>
    );
}
