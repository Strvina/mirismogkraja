import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Household, type Product } from '@/types';
import { Head, router } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Proizvodi', href: '/admin/proizvodi' },
];

type ProductWithHousehold = Product & { household: Household };

export default function AdminProductsIndex({ products }: { products: ProductWithHousehold[] }) {
    const destroy = (product: Product) => {
        if (confirm(`Obrisati proizvod "${product.name}"?`)) {
            router.delete(route('admin.products.destroy', product.id), { preserveScroll: true });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Proizvodi" />

            <div className="flex flex-1 flex-col gap-4 p-4">
                <h1 className="font-serif text-xl font-semibold">Proizvodi</h1>

                <div className="space-y-2">
                    {products.map((product) => (
                        <div key={product.id} className="flex items-center justify-between gap-3 rounded-xl border p-4">
                            <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-muted-foreground text-xs">
                                    {product.household.name} · {product.price} RSD · {product.status}
                                </p>
                            </div>
                            <Button variant="destructive" size="sm" onClick={() => destroy(product)}>
                                Obriši
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
