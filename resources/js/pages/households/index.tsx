import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Household } from '@/types';
import { Head, Link, router } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Moja domaćinstva', href: '/moja-domacinstva' }];

const statusLabels: Record<Household['status'], string> = {
    pending: 'Na čekanju odobrenja',
    active: 'Aktivno',
    blocked: 'Blokirano',
};

export default function HouseholdsIndex({ households }: { households: Household[] }) {
    const destroy = (household: Household) => {
        if (confirm(`Obrisati domaćinstvo "${household.name}"?`)) {
            router.delete(route('households.destroy', household.id));
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Moja domaćinstva" />

            <div className="flex flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold">Moja domaćinstva</h1>
                    <Button asChild>
                        <Link href={route('households.create')}>Novo domaćinstvo</Link>
                    </Button>
                </div>

                {households.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Još uvek nemaš registrovano domaćinstvo.</p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {households.map((household) => (
                            <div key={household.id} className="rounded-xl border p-4">
                                {household.cover_image_path && (
                                    <img
                                        src={`/storage/${household.cover_image_path}`}
                                        alt=""
                                        className="mb-3 h-32 w-full rounded-md object-cover"
                                    />
                                )}
                                <div className="flex items-start justify-between">
                                    <h2 className="font-serif text-lg">{household.name}</h2>
                                    <span className="rounded-full bg-muted px-2 py-1 text-xs">{statusLabels[household.status]}</span>
                                </div>
                                {household.city && <p className="mt-1 text-sm text-muted-foreground">{household.city}</p>}
                                <div className="mt-4 flex gap-2">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={route('households.edit', household.id)}>Izmeni</Link>
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => destroy(household)}>
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
