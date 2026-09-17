import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Household } from '@/types';
import { Head } from '@inertiajs/react';
import HouseholdForm from './household-form';

export default function HouseholdsEdit({ household }: { household: Household }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Moja domaćinstva', href: '/moja-domacinstva' },
        { title: household.name, href: `/moja-domacinstva/${household.id}/izmena` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Izmena — ${household.name}`} />

            <div className="flex flex-1 flex-col gap-4 p-4">
                <h1 className="font-serif text-xl font-semibold">Izmena domaćinstva</h1>
                <HouseholdForm household={household} action={route('households.update', household.id)} method="put" submitLabel="Sačuvaj izmene" />
            </div>
        </AppLayout>
    );
}
