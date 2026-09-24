import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import ProducerCard, { type ProducerCardProducer } from '@/components/marketplace/producer-card';
import SearchForm from '@/components/marketplace/search-form';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { Head, router } from '@inertiajs/react';

export default function ProducersIndex({
    producers,
    cities,
    filters,
}: {
    producers: Paginated<ProducerCardProducer>;
    cities: string[];
    filters: { q: string | null; city: string | null };
}) {
    const filterByCity = (city: string) => {
        // The search term survives a change of city, and vice versa.
        router.get('/proizvodjaci', { q: filters.q ?? undefined, city: city || undefined }, { preserveState: true, preserveScroll: true });
    };

    return (
        <MarketplaceLayout>
            <Head title="Proizvođači | Vrelina juga" />

            <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                    <h1 className="font-serif text-4xl sm:text-5xl">Proizvođači</h1>
                    <p className="text-muted-foreground mt-3 max-w-lg leading-7">
                        {filters.q ? (
                            <>
                                Rezultati za <span className="text-foreground font-medium">„{filters.q}”</span> — {producers.total}{' '}
                                {producers.total === 1 ? 'proizvođač' : 'proizvođača'}.
                            </>
                        ) : (
                            'Ljudi iza proizvoda — njihova mesta, priče i ocene kupaca.'
                        )}
                    </p>

                    <SearchForm
                        target="/proizvodjaci"
                        value={filters.q}
                        placeholder="Pretražite proizvođače..."
                        keep={{ city: filters.city ?? undefined }}
                        className="mt-6 max-w-md"
                    />
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
                <p className="text-muted-foreground py-16 text-center text-sm">
                    {filters.q ? `Ništa nije pronađeno za „${filters.q}”.` : 'Nema proizvođača za prikaz.'}
                </p>
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
