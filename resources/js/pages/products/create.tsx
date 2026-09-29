import MarketplaceLayout from '@/layouts/marketplace-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem, type Category, type Producer } from '@/types';
import { Head } from '@inertiajs/react';
import ProductForm from './product-form';

export default function ProductsCreate({ producer, categories }: { producer: Producer; categories: Category[] }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Moji proizvođači'), href: '/moji-proizvodjaci' },
        { title: producer.name, href: `/moji-proizvodjaci/${producer.id}/izmena` },
        { title: t('Proizvodi'), href: route('producers.products.index', producer.id) },
        { title: t('Novi proizvod'), href: route('producers.products.create', producer.id) },
    ];

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Novi proizvod')} />
            <div className="flex flex-col gap-4">
                <h1 className="font-serif text-4xl sm:text-5xl">{t('Novi proizvod')}</h1>
                <ProductForm
                    categories={categories}
                    action={route('producers.products.store', producer.id)}
                    method="post"
                    submitLabel={t('Kreiraj')}
                />
            </div>
        </MarketplaceLayout>
    );
}
