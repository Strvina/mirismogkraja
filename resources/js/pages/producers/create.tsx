import MarketplaceLayout from '@/layouts/marketplace-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import ProducerForm from './producer-form';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Moji proizvođači', href: '/moji-proizvodjaci' },
    { title: 'Novi proizvođač', href: '/moji-proizvodjaci/novo' },
];

export default function ProducersCreate() {
    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title="Novi proizvođač" />

            <div className="flex flex-col gap-4">
                <h1 className="font-serif text-4xl sm:text-5xl">Novi proizvođač</h1>
                <ProducerForm action={route('producers.store')} method="post" submitLabel="Kreiraj" />
            </div>
        </MarketplaceLayout>
    );
}
