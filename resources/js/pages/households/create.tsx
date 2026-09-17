import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import HouseholdForm from './household-form';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Moja domaćinstva', href: '/moja-domacinstva' },
    { title: 'Novo domaćinstvo', href: '/moja-domacinstva/novo' },
];

export default function HouseholdsCreate() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Novo domaćinstvo" />

            <div className="flex flex-1 flex-col gap-4 p-4">
                <h1 className="text-xl font-semibold">Novo domaćinstvo</h1>
                <HouseholdForm action={route('households.store')} method="post" submitLabel="Kreiraj" />
            </div>
        </AppLayout>
    );
}
