import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Category, type Household } from '@/types';
import { Head } from '@inertiajs/react';
import ProductForm from './product-form';

export default function ProductsCreate({ household, categories }: { household: Household; categories: Category[] }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Moja domaćinstva', href: '/moja-domacinstva' },
        { title: household.name, href: `/moja-domacinstva/${household.id}/izmena` },
        { title: 'Proizvodi', href: route('households.products.index', household.id) },
        { title: 'Novi proizvod', href: route('households.products.create', household.id) },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Novi proizvod" />
            <div className="flex flex-1 flex-col gap-4 p-4">
                <h1 className="font-serif text-xl font-semibold">Novi proizvod</h1>
                <ProductForm categories={categories} action={route('households.products.store', household.id)} method="post" submitLabel="Kreiraj" />
            </div>
        </AppLayout>
    );
}
