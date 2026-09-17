import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Household, type User } from '@/types';
import { Head, router } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Domaćinstva', href: '/admin/domacinstva' },
];

const statusLabels: Record<Household['status'], string> = {
    pending: 'Na čekanju',
    active: 'Aktivno',
    blocked: 'Blokirano',
};

type HouseholdWithOwner = Household & { user: User };

export default function AdminHouseholdsIndex({ households }: { households: HouseholdWithOwner[] }) {
    const setStatus = (household: Household, status: Household['status']) => {
        router.patch(route('admin.households.status', household.id), { status }, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Domaćinstva" />

            <div className="flex flex-1 flex-col gap-4 p-4">
                <h1 className="font-serif text-xl font-semibold">Domaćinstva</h1>

                <div className="space-y-2">
                    {households.map((household) => (
                        <div key={household.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                            <div>
                                <p className="font-medium">{household.name}</p>
                                <p className="text-muted-foreground text-xs">
                                    {household.user.name} · {statusLabels[household.status]}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {household.status === 'pending' && (
                                    <Button size="sm" onClick={() => setStatus(household, 'active')}>
                                        Odobri
                                    </Button>
                                )}
                                {household.status !== 'blocked' ? (
                                    <Button variant="destructive" size="sm" onClick={() => setStatus(household, 'blocked')}>
                                        Blokiraj
                                    </Button>
                                ) : (
                                    <Button variant="outline" size="sm" onClick={() => setStatus(household, 'active')}>
                                        Odblokiraj
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
