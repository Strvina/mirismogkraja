import MarketplaceLayout from '@/layouts/marketplace-layout';
import { type Producer } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { MapPin } from 'lucide-react';

export default function ProducersIndex({
    producers,
    cities,
    filters,
}: {
    producers: Producer[];
    cities: string[];
    filters: { city: string | null };
}) {
    const filterByCity = (city: string) => {
        router.get('/proizvodjaci', city ? { city } : {}, { preserveState: true });
    };

    return (
        <MarketplaceLayout>
            <Head title="Proizvođači | Vrelina juga" />

            <div className="flex items-end justify-between gap-6">
                <h1 className="font-serif text-4xl sm:text-5xl">Proizvođači</h1>

                {cities.length > 0 && (
                    <select
                        className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                        value={filters.city ?? ''}
                        onChange={(e) => filterByCity(e.target.value)}
                    >
                        <option value="">Svi gradovi</option>
                        {cities.map((city) => (
                            <option key={city} value={city}>
                                {city}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {producers.length === 0 ? (
                <p className="text-muted-foreground mt-10 text-sm">Nema domaćinstava za prikaz.</p>
            ) : (
                <div className="mt-10 grid gap-8 md:grid-cols-3">
                    {producers.map((producer) => (
                        <Link key={producer.id} href={route('marketplace.producers.show', producer.slug)} className="group">
                            <div className="bg-muted aspect-[4/3] overflow-hidden rounded-md">
                                {producer.cover_image_path && (
                                    <img
                                        src={`/storage/${producer.cover_image_path}`}
                                        alt={producer.name}
                                        className="image-warm size-full object-cover transition duration-700 group-hover:scale-[1.025]"
                                    />
                                )}
                            </div>
                            <h2 className="mt-4 font-serif text-2xl">{producer.name}</h2>
                            {producer.city && (
                                <p className="text-primary mt-1 flex items-center gap-1.5 text-xs font-semibold tracking-[0.08em] uppercase">
                                    <MapPin className="size-3.5" />
                                    {producer.city}
                                </p>
                            )}
                        </Link>
                    ))}
                </div>
            )}
        </MarketplaceLayout>
    );
}
