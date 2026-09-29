import { type MapPoint, PointsMap } from '@/components/marketplace/map';
import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import ProducerCard, { type ProducerCardProducer } from '@/components/marketplace/producer-card';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { Head, router } from '@inertiajs/react';
import { Map as MapIcon } from 'lucide-react';
import { useState } from 'react';

export default function ProducersIndex({
    producers,
    featured,
    mapPoints,
    cities,
    filters,
}: {
    producers: Paginated<ProducerCardProducer>;
    featured: ProducerCardProducer[];
    /** Present once the visitor has opened the map. */
    mapPoints?: MapPoint[];
    cities: string[];
    filters: { city: string | null };
}) {
    const [showMap, setShowMap] = useState(false);

    const toggleMap = () => {
        // The points come as a partial reload the first time the map opens.
        if (!showMap && mapPoints === undefined) {
            router.reload({ only: ['mapPoints'] });
        }

        setShowMap(!showMap);
    };

    const filterByCity = (city: string) => {
        router.get('/proizvodjaci', city ? { city } : {}, { preserveState: true, preserveScroll: true });
    };

    return (
        <MarketplaceLayout>
            <Head title="Proizvođači | Vrelina juga" />

            <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                    <h1 className="font-serif text-4xl sm:text-5xl">Proizvođači</h1>
                    <p className="text-muted-foreground mt-3 max-w-lg leading-7">Ljudi iza proizvoda — njihova mesta, priče i ocene kupaca.</p>
                </div>

                {cities.length > 0 && (
                    <select
                        aria-label="Filtriraj po mestu"
                        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 rounded-md border px-3 text-sm shadow-xs transition focus-visible:ring-[3px] focus-visible:outline-none"
                        value={filters.city ?? ''}
                        onChange={(e) => filterByCity(e.target.value)}
                    >
                        <option value="">Cela Srbija</option>
                        {cities.map((city) => (
                            <option key={city} value={city}>
                                {city}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            <div className="mt-6">
                <Button type="button" variant="outline" size="sm" onClick={toggleMap} aria-expanded={showMap}>
                    <MapIcon className="size-4" />
                    {showMap ? 'Sakrij mapu' : 'Prikaži mapu'}
                </Button>
                {showMap &&
                    (mapPoints === undefined ? (
                        <p className="text-muted-foreground mt-3 text-sm">Učitavam mapu…</p>
                    ) : mapPoints.length === 0 ? (
                        <p className="text-muted-foreground mt-3 text-sm">
                            Još nijedan proizvođač{filters.city ? ` iz ${filters.city}` : ''} nije označio lokaciju.
                        </p>
                    ) : (
                        <PointsMap points={mapPoints} className="mt-3 h-96" />
                    ))}
            </div>

            {featured.length > 0 && (
                <section aria-labelledby="istaknuti" className="mt-10">
                    <h2 id="istaknuti" className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">
                        Istaknuti proizvođači{filters.city ? ` — ${filters.city}` : ''}
                    </h2>
                    <div className="mt-4 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {featured.map((producer) => (
                            <ProducerCard key={producer.id} producer={producer} featured />
                        ))}
                    </div>
                </section>
            )}

            {producers.data.length === 0 ? (
                <p className="text-muted-foreground py-16 text-center text-sm">Nema proizvođača za prikaz.</p>
            ) : (
                <>
                    <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {producers.data.map((producer) => (
                            <ProducerCard key={producer.id} producer={producer} />
                        ))}
                    </div>
                    <Pagination meta={producers} />
                </>
            )}
        </MarketplaceLayout>
    );
}
