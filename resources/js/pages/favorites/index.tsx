import MarketplaceLayout from '@/layouts/marketplace-layout';
import { type BreadcrumbItem, type Producer, type Product } from '@/types';
import { Head, Link } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Moji omiljeni', href: '/omiljeni' }];

export default function FavoritesIndex({ producers, products }: { producers: Producer[]; products: Product[] }) {
    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title="Moji omiljeni" />

            <h1 className="font-serif text-4xl sm:text-5xl">Moji omiljeni</h1>

            <div className="mt-8 flex flex-col gap-8">
                <div>
                    <h2 className="font-serif text-2xl">Omiljeni proizvođači</h2>
                    {producers.length === 0 ? (
                        <p className="text-muted-foreground mt-2 text-sm">Nema omiljenih proizvođača.</p>
                    ) : (
                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                            {producers.map((producer) => (
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
                </div>

                <div>
                    <h2 className="font-serif text-2xl">Omiljeni proizvodi</h2>
                    {products.length === 0 ? (
                        <p className="text-muted-foreground mt-2 text-sm">Nema omiljenih proizvoda.</p>
                    ) : (
                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                            {products.map((product) => (
                                <Link
                                    key={product.id}
                                    href={route('marketplace.products.show', product.slug)}
                                    className="hover:bg-muted rounded-xl border p-4"
                                >
                                    <p className="font-medium">{product.name}</p>
                                    <p className="text-muted-foreground text-sm">{product.price} RSD</p>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </MarketplaceLayout>
    );
}
