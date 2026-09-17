import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Household, type Product } from '@/types';
import { Head, Link, router } from '@inertiajs/react';

export default function ProductsIndex({ household, products }: { household: Household; products: Product[] }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Moja domaćinstva', href: '/moja-domacinstva' },
        { title: household.name, href: `/moja-domacinstva/${household.id}/izmena` },
        { title: 'Proizvodi', href: `/moja-domacinstva/${household.id}/proizvodi` },
    ];

    const destroy = (product: Product) => {
        if (confirm(`Obrisati proizvod "${product.name}"?`)) {
            router.delete(route('households.products.destroy', [household.id, product.id]));
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Proizvodi — ${household.name}`} />

            <div className="flex flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold">Proizvodi — {household.name}</h1>
                    <Button asChild>
                        <Link href={route('households.products.create', household.id)}>Novi proizvod</Link>
                    </Button>
                </div>

                {products.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nema još proizvoda.</p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {products.map((product) => (
                            <div key={product.id} className="rounded-xl border p-4">
                                <div className="flex items-start justify-between">
                                    <h2 className="font-serif text-lg">{product.name}</h2>
                                    <span className="rounded-full bg-muted px-2 py-1 text-xs">{product.status}</span>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {product.price} RSD / {product.unit} · {product.category?.name}
                                </p>
                                <div className="mt-4 flex gap-2">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={route('households.products.edit', [household.id, product.id])}>Izmeni</Link>
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => destroy(product)}>
                                        Obriši
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
