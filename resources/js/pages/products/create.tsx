import Head from '@/components/head';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem, type Category, type Producer } from '@/types';
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
                <p className="text-muted-foreground max-w-3xl leading-7">
                    {t(
                        'Proizvod se čuva kao nacrt, koji vidite samo vi. Kada je spreman, u polju „Vidljivost” izaberite „Objavljeno” i kupci će ga videti i moći da vam pišu o njemu.',
                    )}{' '}
                    {producer.status !== 'active' &&
                        t('Vaša stranica još čeka odobrenje, pa će i objavljeni proizvodi biti vidljivi tek kad je odobrimo.')}
                </p>
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
