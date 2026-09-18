import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Producer, type User } from '@/types';
import { Head, router } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Proizvođači', href: '/admin/proizvodjaci' },
];

const statusLabels: Record<Producer['status'], string> = {
    pending: 'Na čekanju',
    active: 'Aktivno',
    blocked: 'Blokirano',
};

type ProducerWithOwner = Producer & { user: User };

export default function AdminProducersIndex({ producers }: { producers: ProducerWithOwner[] }) {
    const setStatus = (producer: Producer, status: Producer['status']) => {
        router.patch(route('admin.producers.status', producer.id), { status }, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Proizvođači" />

            <div className="flex flex-1 flex-col gap-4 p-4">
                <h1 className="font-serif text-xl font-semibold">Proizvođači</h1>

                <div className="space-y-2">
                    {producers.map((producer) => (
                        <div key={producer.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                            <div>
                                <p className="font-medium">{producer.name}</p>
                                <p className="text-muted-foreground text-xs">
                                    {producer.user.name} · {statusLabels[producer.status]}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {producer.status === 'pending' && (
                                    <Button size="sm" onClick={() => setStatus(producer, 'active')}>
                                        Odobri
                                    </Button>
                                )}
                                {producer.status !== 'blocked' ? (
                                    <Button variant="destructive" size="sm" onClick={() => setStatus(producer, 'blocked')}>
                                        Blokiraj
                                    </Button>
                                ) : (
                                    <Button variant="outline" size="sm" onClick={() => setStatus(producer, 'active')}>
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
