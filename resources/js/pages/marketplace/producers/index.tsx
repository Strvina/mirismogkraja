import Head from '@/components/head';
import CardGrid from '@/components/marketplace/card-grid';
import CompactSelect from '@/components/marketplace/compact-select';
import FeaturedSection from '@/components/marketplace/featured-section';
import { type MapPoint, PointsMap } from '@/components/marketplace/map';
import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import ProducerCard, { type ProducerCardProducer } from '@/components/marketplace/producer-card';
import SearchBox from '@/components/marketplace/search-box';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { LocateFixed, Map as MapIcon } from 'lucide-react';
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
    filters: { city: string | null; q: string | null; lat: number | null; lng: number | null };
}) {
    const [showMap, setShowMap] = useState(false);

    const toggleMap = () => {
        // The points come as a partial reload the first time the map opens.
        if (!showMap && mapPoints === undefined) {
            router.reload({ only: ['mapPoints'] });
        }

        setShowMap(!showMap);
    };

    const visit = (patch: Partial<typeof filters>) => {
        const next = { ...filters, ...patch };

        router.get(
            '/proizvodjaci',
            { city: next.city || undefined, q: next.q || undefined, lat: next.lat ?? undefined, lng: next.lng ?? undefined },
            { preserveState: true, preserveScroll: true },
        );
    };

    // "Near me": the browser asks for permission; only a position rounded
    // to about a kilometre leaves it.
    const [locating, setLocating] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);

    const nearMe = () => {
        setLocationError(null);

        if (!('geolocation' in navigator)) {
            setLocationError(t('Vaš pregledač ne može da odredi lokaciju.'));

            return;
        }

        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocating(false);
                visit({ lat: Number(position.coords.latitude.toFixed(2)), lng: Number(position.coords.longitude.toFixed(2)) });
            },
            () => {
                setLocating(false);
                setLocationError(t('Lokacija nije dostupna. Dozvolite sajtu pristup lokaciji u pregledaču i pokušajte ponovo.'));
            },
            { maximumAge: 10 * 60 * 1000, timeout: 10_000 },
        );
    };

    const sortedByDistance = filters.lat !== null && filters.lng !== null;

    const filterByCity = (city: string) => visit({ city });

    return (
        <MarketplaceLayout>
            <Head title={t('Proizvođači | Vrelina juga')} />

            <h1 className="font-serif text-4xl sm:text-5xl">{t('Proizvođači')}</h1>
            <p className="text-muted-foreground mt-3 max-w-lg leading-7">{t('Ljudi iza proizvoda — njihova mesta, priče i ocene kupaca.')}</p>

            {/* Everything that narrows or reorders the list, on one line:
                stacked, it pushed the producers themselves off the screen. */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
                <SearchBox
                    value={filters.q ?? ''}
                    onSearch={(q) => visit({ q })}
                    placeholder={t('Pretraži proizvođače…')}
                    className="w-full sm:w-auto sm:min-w-64 sm:flex-1 lg:max-w-md"
                />

                {cities.length > 0 && (
                    <CompactSelect
                        label={t('Filtriraj po mestu')}
                        className="h-10 w-full sm:w-48"
                        value={filters.city ?? ''}
                        onChange={filterByCity}
                        options={[{ value: '', label: t('Cela Srbija') }, ...cities.map((city) => ({ value: city, label: city }))]}
                    />
                )}

                {/* Pressed while the list is in order of distance; pressing it again puts the list back. */}
                <Button
                    type="button"
                    variant="outline"
                    className={cn('flex-1 sm:flex-none', sortedByDistance && 'border-primary bg-olive-soft text-olive hover:bg-olive-soft')}
                    onClick={sortedByDistance ? () => visit({ lat: null, lng: null }) : nearMe}
                    disabled={locating}
                    aria-pressed={sortedByDistance}
                >
                    <LocateFixed className="size-4" />
                    {locating ? t('Tražim lokaciju…') : t('Najbliži meni')}
                </Button>

                <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={toggleMap} aria-expanded={showMap}>
                    <MapIcon className="size-4" />
                    {showMap ? t('Sakrij mapu') : t('Prikaži mapu')}
                </Button>
            </div>

            {sortedByDistance && (
                <p className="text-muted-foreground mt-3 text-sm">
                    {t('Poređano po udaljenosti od vas')} ·{' '}
                    <button
                        type="button"
                        className="hover:text-foreground underline underline-offset-4"
                        onClick={() => visit({ lat: null, lng: null })}
                    >
                        {t('Poništi')}
                    </button>
                </p>
            )}
            {locationError && <p className="text-destructive mt-3 text-sm">{locationError}</p>}

            {showMap &&
                (mapPoints === undefined ? (
                    <p className="text-muted-foreground mt-4 text-sm">{t('Učitavam mapu…')}</p>
                ) : mapPoints.length === 0 ? (
                    <p className="text-muted-foreground mt-4 text-sm">
                        {filters.city
                            ? t('Još nijedan proizvođač iz mesta :city nije označio lokaciju.', { city: filters.city })
                            : t('Još nijedan proizvođač nije označio lokaciju.')}
                    </p>
                ) : (
                    <PointsMap points={mapPoints} className="animate-in fade-in mt-4 h-96 duration-300" />
                ))}

            {featured.length > 0 && (
                <FeaturedSection
                    itemClassName="w-[80vw] sm:w-[340px] lg:w-[360px]"
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
                    {featured.map((producer) => (
                        <ProducerCard key={producer.id} producer={producer} featured />
                    ))}
                </FeaturedSection>
            )}

            {producers.data.length === 0 ? (
                <p className="text-muted-foreground py-16 text-center text-sm">{t('Nema proizvođača za prikaz.')}</p>
            ) : (
                <>
                    <CardGrid className={cn('gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4', featured.length === 0 && 'mt-8')}>
                        {producers.data.map((producer) => (
                            <ProducerCard key={producer.id} producer={producer} />
                        ))}
                    </CardGrid>
                    <Pagination meta={producers} />
                </>
            )}
        </MarketplaceLayout>
    );
}
