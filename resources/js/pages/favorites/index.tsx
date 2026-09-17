import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Household, type Product } from '@/types';
import { Head, Link } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Moji omiljeni', href: '/omiljeni' }];

export default function FavoritesIndex({ households, products }: { households: Household[]; products: Product[] }) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Moji omiljeni" />

            <div className="flex flex-1 flex-col gap-8 p-4">
                <div>
                    <h1 className="font-serif text-xl font-semibold">Omiljeni proizvođači</h1>
                    {households.length === 0 ? (
                        <p className="text-muted-foreground mt-2 text-sm">Nema omiljenih proizvođača.</p>
                    ) : (
                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                            {households.map((household) => (
                                <Link
                                    key={household.id}
                                    href={route('marketplace.households.show', household.slug)}
                                    className="hover:bg-muted rounded-xl border p-4"
                                >
                                    <p className="font-serif text-lg">{household.name}</p>
                                    {household.city && <p className="text-muted-foreground text-sm">{household.city}</p>}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <h1 className="font-serif text-xl font-semibold">Omiljeni proizvodi</h1>
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
        </AppLayout>
    );
}
