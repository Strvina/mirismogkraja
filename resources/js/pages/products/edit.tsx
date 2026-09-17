import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Category, type Household, type Product } from '@/types';
import { Head } from '@inertiajs/react';
import ProductForm from './product-form';

export default function ProductsEdit({
    household,
    product,
    categories,
}: {
    household: Household;
    product: Product;
    categories: Category[];
}) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Moja domaćinstva', href: '/moja-domacinstva' },
        { title: household.name, href: `/moja-domacinstva/${household.id}/izmena` },
        { title: 'Proizvodi', href: route('households.products.index', household.id) },
        { title: product.name, href: route('households.products.edit', [household.id, product.id]) },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Izmena — ${product.name}`} />
            <div className="flex flex-1 flex-col gap-4 p-4">
                <h1 className="text-xl font-semibold">Izmena proizvoda</h1>
                <ProductForm
                    product={product}
                    categories={categories}
                    action={route('households.products.update', [household.id, product.id])}
                    method="put"
                    submitLabel="Sačuvaj izmene"
                />
            </div>
        </AppLayout>
    );
}
