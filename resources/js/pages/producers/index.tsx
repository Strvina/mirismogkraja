import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { type BreadcrumbItem, type Producer } from '@/types';
import { Head, Link, router } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Moji proizvođači', href: '/moji-proizvodjaci' }];

const statusLabels: Record<Producer['status'], string> = {
    pending: 'Na čekanju odobrenja',
    active: 'Aktivno',
    blocked: 'Blokirano',
};

export default function ProducersIndex({ producers }: { producers: Producer[] }) {
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
