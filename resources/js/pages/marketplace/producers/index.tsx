import FeaturedSection from '@/components/marketplace/featured-section';
import { type MapPoint, PointsMap } from '@/components/marketplace/map';
import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import ProducerCard, { type ProducerCardProducer } from '@/components/marketplace/producer-card';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
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
            <Head title={t('Proizvođači | Vrelina juga')} />

            <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                    <h1 className="font-serif text-4xl sm:text-5xl">{t('Proizvođači')}</h1>
                    <p className="text-muted-foreground mt-3 max-w-lg leading-7">{t('Ljudi iza proizvoda — njihova mesta, priče i ocene kupaca.')}</p>
                </div>

                {cities.length > 0 && (
                    <select
                        aria-label={t('Filtriraj po mestu')}
                        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 rounded-md border px-3 text-sm shadow-xs transition focus-visible:ring-[3px] focus-visible:outline-none"
                        value={filters.city ?? ''}
                        onChange={(e) => filterByCity(e.target.value)}
                    >
                        <option value="">{t('Cela Srbija')}</option>
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
                    {showMap ? t('Sakrij mapu') : t('Prikaži mapu')}
                </Button>
                {showMap &&
                    (mapPoints === undefined ? (
                        <p className="text-muted-foreground mt-3 text-sm">{t('Učitavam mapu…')}</p>
                    ) : mapPoints.length === 0 ? (
                        <p className="text-muted-foreground mt-3 text-sm">
                            Još nijedan proizvođač{filters.city ? ` iz ${filters.city}` : ''} nije označio lokaciju.
                        </p>
                    ) : (
                        <PointsMap points={mapPoints} className="mt-3 h-96" />
                    ))}
            </div>

            {featured.length > 0 && (
                <FeaturedSection
                    title={filters.city ? `${t('Istaknuti proizvođači')} — ${filters.city}` : t('Istaknuti proizvođači')}
                    listLabel={filters.city ? `${t('Svi proizvođači')} — ${filters.city}` : t('Svi proizvođači')}
                    explanation={
                        <>
                            <p>{t('Ovi proizvođači su platili isticanje ili imaju Premium ili Pro članstvo.')}</p>
                            <p>{t('Mesta se nasumično smenjuju pri svakoj poseti, pa niko ne drži vrh stalno.')}</p>
                            <p>{t('Lista ispod je ista za sve i nije uređena po tome ko plaća.')}</p>
                        </>
                    }
                >
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {featured.map((producer) => (
                            <ProducerCard key={producer.id} producer={producer} featured />
                        ))}
                    </div>
                </FeaturedSection>
            )}

            {producers.data.length === 0 ? (
                <p className="text-muted-foreground py-16 text-center text-sm">{t('Nema proizvođača za prikaz.')}</p>
            ) : (
                <>
                    <div className={cn('grid gap-6 md:grid-cols-2 xl:grid-cols-3', featured.length === 0 && 'mt-10')}>
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
