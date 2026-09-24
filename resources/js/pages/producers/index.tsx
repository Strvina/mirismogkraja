import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { type BreadcrumbItem, type Producer } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Clock } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Moji proizvođači', href: '/moji-proizvodjaci' }];

const statusLabels: Record<Producer['status'], string> = {
    pending: 'Na čekanju odobrenja',
    active: 'Aktivno',
    blocked: 'Blokirano',
};

interface PendingChange {
    id: number;
    household_id: number;
    field: string;
    requested_value: string;
}

export default function ProducersIndex({ producers, pendingChanges }: { producers: Producer[]; pendingChanges: PendingChange[] }) {
    const destroy = (producer: Producer) => {
        if (confirm(`Obrisati proizvođača "${producer.name}"?`)) {
            router.delete(route('producers.destroy', producer.id));
        }
    };

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title="Moji proizvođači" />

            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h1 className="font-serif text-4xl sm:text-5xl">Moji proizvođači</h1>
                    <Button asChild>
                        <Link href={route('producers.create')}>Novi proizvođač</Link>
                    </Button>
                </div>

                {producers.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Još uvek nemaš registrovanog proizvođača.</p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {producers.map((producer) => (
                            <div key={producer.id} className="rounded-xl border p-4">
                                {producer.cover_image_path && (
                                    <img src={`/storage/${producer.cover_image_path}`} alt="" className="mb-3 h-32 w-full rounded-md object-cover" />
                                )}
                                <div className="flex items-start justify-between">
                                    <h2 className="font-serif text-lg">{producer.name}</h2>
                                    <span className="bg-muted rounded-full px-2 py-1 text-xs">{statusLabels[producer.status]}</span>
                                </div>
                                {producer.city && <p className="text-muted-foreground mt-1 text-sm">{producer.city}</p>}

                                {/* A rename of a published producer waits for
                                    an admin, so say so rather than letting the
                                    unchanged name look like a failed save. */}
                                {pendingChanges
                                    .filter((change) => change.household_id === producer.id)
                                    .map((change) => (
                                        <p key={change.id} className="text-muted-foreground mt-3 flex items-start gap-1.5 text-xs">
                                            <Clock className="mt-0.5 size-3.5 shrink-0" />
                                            Novi naziv „{change.requested_value}” čeka odobrenje. Do tada ostaje dosadašnji.
                                        </p>
                                    ))}
                                <div className="mt-4 flex gap-2">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={route('producers.edit', producer.id)}>Izmeni</Link>
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => destroy(producer)}>
                                        Obriši
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </MarketplaceLayout>
    );
}
