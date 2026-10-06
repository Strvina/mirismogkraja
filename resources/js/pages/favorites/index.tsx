import Head from '@/components/head';
import EmptyState from '@/components/marketplace/empty-state';
import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { formatPrice } from '@/lib/format';
import { t, tx } from '@/lib/i18n';
import { type BreadcrumbItem, type Producer, type Product } from '@/types';
import { Link } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: tx('Moji omiljeni'), href: '/omiljeni' }];

type SavedProducer = Pick<Producer, 'id' | 'name' | 'slug' | 'city'>;
type SavedProduct = Pick<Product, 'id' | 'name' | 'slug' | 'price' | 'unit'>;

export default function FavoritesIndex({ producers, products }: { producers: Paginated<SavedProducer>; products: Paginated<SavedProduct> }) {
    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Moji omiljeni')} />

            <h1 className="font-serif text-4xl sm:text-5xl">{t('Moji omiljeni')}</h1>

            {producers.total === 0 && products.total === 0 ? (
                <EmptyState
                    className="mt-8 max-w-2xl"
                    title={t('Još ništa niste sačuvali')}
                    actions={
                        <>
                            <Button asChild variant="outline">
                                <Link href={route('marketplace.producers.index')}>{t('Pogledaj proizvođače')}</Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link href={route('marketplace.products.index')}>{t('Pogledaj proizvode')}</Link>
                            </Button>
                        </>
                    }
                >
                    {t('Srce na kartici proizvođača ili proizvoda čuva ga ovde, da ga sledeći put ne tražite ponovo.')}
                </EmptyState>
            ) : (
                <div className="mt-8 flex flex-col gap-8">
                    <div>
                        <h2 className="font-serif text-2xl">{t('Omiljeni proizvođači')}</h2>
                        {producers.data.length === 0 ? (
                            <p className="text-muted-foreground mt-2 text-sm">{t('Nema omiljenih proizvođača.')}</p>
                        ) : (
                            <div className="mt-4 grid gap-4 md:grid-cols-3">
                                {producers.data.map((producer) => (
                                    <Link
                                        key={producer.id}
                                        href={route('marketplace.producers.show', producer.slug)}
                                        className="hover:bg-muted rounded-xl border p-4"
                                    >
                                        <p className="font-serif text-lg">{producer.name}</p>
                                        {producer.city && <p className="text-muted-foreground text-sm">{producer.city}</p>}
                                    </Link>
                                ))}
                            </div>
                        )}
                        <Pagination meta={producers} />
                    </div>

                    <div>
                        <h2 className="font-serif text-2xl">{t('Omiljeni proizvodi')}</h2>
                        {products.data.length === 0 ? (
                            <p className="text-muted-foreground mt-2 text-sm">{t('Nema omiljenih proizvoda.')}</p>
                        ) : (
                            <div className="mt-4 grid gap-4 md:grid-cols-3">
                                {products.data.map((product) => (
                                    <Link
                                        key={product.id}
                                        href={route('marketplace.products.show', product.slug)}
                                        className="hover:bg-muted rounded-xl border p-4"
                                    >
                                        <p className="font-medium">{product.name}</p>
                                        <p className="text-muted-foreground text-sm">
                                            {formatPrice(product.price)} / {product.unit}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        )}
                        <Pagination meta={products} />
                    </div>
                </div>
            )}
        </MarketplaceLayout>
    );
}
