import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Producer } from '@/types';
import { Head } from '@inertiajs/react';
import ProducerForm from './producer-form';

export default function ProducersEdit({ producer }: { producer: Producer }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Moji proizvođači', href: '/moji-proizvodjaci' },
        { title: producer.name, href: `/moji-proizvodjaci/${producer.id}/izmena` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Izmena — ${producer.name}`} />

            <div className="flex flex-1 flex-col gap-4 p-4">
                <h1 className="font-serif text-xl font-semibold">Izmena proizvođača</h1>
                <ProducerForm producer={producer} action={route('producers.update', producer.id)} method="put" submitLabel="Sačuvaj izmene" />
            </div>
        </AppLayout>
    );
}
