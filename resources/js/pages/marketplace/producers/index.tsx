import ProducerCard, { type ProducerCardProducer } from '@/components/marketplace/producer-card';
import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { Head, router } from '@inertiajs/react';

export default function ProducersIndex({
    producers,
    cities,
    filters,
}: {
    producers: Paginated<ProducerCardProducer>;
    cities: string[];
    filters: { city: string | null };
}) {
    const filterByCity = (city: string) => {
        router.get('/proizvodjaci', city ? { city } : {}, { preserveState: true, preserveScroll: true });
    };

    return (
        <MarketplaceLayout>
            <Head title="Proizvođači | Vrelina juga" />

            <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                    <h1 className="font-serif text-4xl sm:text-5xl">Proizvođači</h1>
                    <p className="text-muted-foreground mt-3 max-w-lg leading-7">
                        Ljudi iza proizvoda — njihova mesta, priče i ocene kupaca.
                    </p>
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
