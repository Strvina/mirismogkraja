import Head from '@/components/head';
import CardGrid from '@/components/marketplace/card-grid';
import CompactSelect from '@/components/marketplace/compact-select';
import EmptyState from '@/components/marketplace/empty-state';
import FeaturedSection from '@/components/marketplace/featured-section';
import { type MapPoint, PointsMap } from '@/components/marketplace/map';
import { ChoiceList, FilterButton, type FilterPage, FilterPills, FilterSheet, SortMenu } from '@/components/marketplace/mobile-filters';
import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import ProducerCard, { type ProducerCardProducer } from '@/components/marketplace/producer-card';
import { type DistrictOption } from '@/components/marketplace/product-filters';
import SearchBox from '@/components/marketplace/search-box';
import { Button } from '@/components/ui/button';
import { usePendingCount } from '@/hooks/use-pending-count';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { LocateFixed, Map as MapIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ProducersIndex({
    producers,
    featured,
    mapPoints,
    districts,
    cities,
    filters,
    perPage,
    perPageOptions,
}: {
    producers: Paginated<ProducerCardProducer>;
    featured: ProducerCardProducer[];
    /** Present once the visitor has opened the map. */
    mapPoints?: MapPoint[];
    districts: DistrictOption[];
    cities: string[];
    filters: { district: string | null; city: string | null; q: string | null; lat: number | null; lng: number | null; sort: string | null };
    perPage: number;
    perPageOptions: number[];
}) {
    const [showMap, setShowMap] = useState(false);

    const toggleMap = () => {
        // The points come as a partial reload the first time the map opens.
        if (!showMap && mapPoints === undefined) {
            router.reload({ only: ['mapPoints'] });
        }

        setShowMap(!showMap);
    };

    const visit = (patch: Partial<typeof filters> & { per_page?: number }) => {
        const next = { ...filters, per_page: perPage, ...patch };

        router.get(
            '/proizvodjaci',
            {
                district: next.district || undefined,
                city: next.city || undefined,
                q: next.q || undefined,
                lat: next.lat ?? undefined,
                lng: next.lng ?? undefined,
                sort: next.sort || undefined,
                // The size asked for stays as the list is narrowed; the default needs no saying.
                per_page: next.per_page !== perPageOptions[0] ? next.per_page : undefined,
            },
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

    // On a phone the filters are chosen in a sheet first, and applied together.
    const applied = { district: filters.district ?? '', city: filters.city ?? '' };
    const [draft, setDraft] = useState(applied);
    const [sheet, setSheet] = useState<string | null>(null);
    const activeFilters = [filters.district, filters.city].filter(Boolean).length;
    const appliedKey = JSON.stringify(applied);
    useEffect(() => setDraft(JSON.parse(appliedKey) as typeof applied), [appliedKey]);
    const count = usePendingCount('marketplace.producers.count', draft, applied, { q: filters.q ?? '' }, producers.total);
    const draftDistrict = districts.find((option) => option.value === draft.district);
    const pages: FilterPage[] = [
        ...(districts.length > 0
            ? [
                  {
                      key: 'district',
                      label: t('Okrug'),
                      summary: draftDistrict?.label,
                      pill: true,
                      reset: () => setDraft({ district: '', city: '' }),
                      render: (done: () => void) => (
                          <ChoiceList
                              value={draft.district}
                              onChoose={(value) => {
                                  const next = districts.find((option) => option.value === value);
                                  setDraft({ district: value, city: next && draft.city && !next.cities.includes(draft.city) ? '' : draft.city });
                                  done();
                              }}
                              options={[{ value: '', label: t('Svi okruzi') }, ...districts]}
                          />
                      ),
                  },
              ]
            : []),
        {
            key: 'city',
            label: t('Mesto'),
            summary: draft.city || undefined,
            pill: true,
            reset: () => setDraft({ ...draft, city: '' }),
            render: (done) => (
                <ChoiceList
                    value={draft.city}
                    onChoose={(value) => {
                        setDraft({ ...draft, city: value });
                        done();
                    }}
                    options={[
                        { value: '', label: draftDistrict ? t('Sva mesta u okrugu') : t('Cela Srbija') },
                        ...(draftDistrict ? draftDistrict.cities : cities).map((city) => ({ value: city, label: city })),
                    ]}
                />
            ),
        },
    ];
    const sortOptions = [
        { value: '', label: filters.q ? t('Najbolje se poklapa') : t('Po imenu') },
        { value: 'rating', label: t('Najbolje ocenjeni') },
        { value: 'reviews', label: t('Najviše utisaka') },
        { value: 'newest', label: t('Najnoviji') },
    ];

    // Within a district, only its towns; a town from another district goes.
    const district = districts.find((option) => option.value === filters.district);
    const towns = district ? district.cities : cities;
    const filterByDistrict = (value: string) => {
        const chosen = districts.find((option) => option.value === value);

        visit({ district: value || null, ...(chosen && filters.city && !chosen.cities.includes(filters.city) ? { city: null } : {}) });
    };

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
                    trailing={activeFilters === 0 ? <FilterButton className="sm:hidden" onOpen={() => setSheet('index')} /> : undefined}
                />

                {/* On a phone, as KupujemProdajem has it: the pills, and one sheet behind them. */}
                <div className="w-full sm:hidden">
                    {/* Only once something is chosen; until then "Filteri" is inside the search field. */}
                    {activeFilters > 0 && <FilterPills pages={pages} activeCount={activeFilters} onOpen={setSheet} />}
                    <FilterSheet
                        page={sheet}
                        onPage={setSheet}
                        pages={pages}
                        count={count}
                        onApply={() => {
                            setSheet(null);
                            visit({ district: draft.district || null, city: draft.city || null });
                        }}
                        onResetAll={() => setDraft({ district: '', city: '' })}
                    />
                </div>

                {districts.length > 0 && (
                    <CompactSelect
                        label={t('Filtriraj po okrugu')}
                        className="hidden h-10 w-full sm:inline-flex sm:w-56"
                        value={filters.district ?? ''}
                        onChange={filterByDistrict}
                        options={[{ value: '', label: t('Svi okruzi') }, ...districts]}
                    />
                )}

                {towns.length > 0 && (
                    <CompactSelect
                        label={t('Filtriraj po mestu')}
                        className="hidden h-10 w-full sm:inline-flex sm:w-48"
                        value={filters.city ?? ''}
                        onChange={filterByCity}
                        options={[
                            { value: '', label: district ? t('Sva mesta u okrugu') : t('Cela Srbija') },
                            ...towns.map((city) => ({ value: city, label: city })),
                        ]}
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

            {/* Over the results, as in the catalogue: how many, the page size and the order. */}
            <div className="border-border/70 mt-8 mb-6 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                <p className="text-muted-foreground text-sm">
                    {producers.total === 0
                        ? t('Nema proizvođača')
                        : t('Prikazano :from–:to od :total', { from: producers.from ?? 0, to: producers.to ?? 0, total: producers.total })}
                </p>

                {/* On a phone: "Sortiraj" beside the count. */}
                <div className="sm:hidden">
                    <SortMenu
                        value={sortedByDistance ? '' : (filters.sort ?? '')}
                        options={sortOptions}
                        onChange={(sort) => visit({ sort, lat: null, lng: null })}
                    />
                </div>

                <div className="hidden flex-wrap items-center gap-3 sm:flex">
                    <span className="flex items-center gap-2 text-sm">
                        <label htmlFor="producers-per-page" className="text-muted-foreground">
                            {t('Po strani:')}
                        </label>
                        <CompactSelect
                            id="producers-per-page"
                            className="w-20"
                            value={String(perPage)}
                            onChange={(value) => visit({ per_page: Number(value) })}
                            options={perPageOptions.map((option) => ({ value: String(option), label: String(option) }))}
                        />
                    </span>
                    <span className="flex items-center gap-2 text-sm">
                        <label htmlFor="producers-sort" className="text-muted-foreground">
                            {t('Sortiraj:')}
                        </label>
                        <CompactSelect
                            id="producers-sort"
                            className="w-52"
                            // Choosing an order leaves "nearest to me".
                            value={sortedByDistance ? '' : (filters.sort ?? '')}
                            onChange={(sort) => visit({ sort, lat: null, lng: null })}
                            options={sortOptions}
                        />
                    </span>
                </div>
            </div>

            {featured.length > 0 && (
                <FeaturedSection
                    // Spaced by the results header above it, as in the catalogue.
                    className=""
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
                <EmptyState
                    title={filters.q ? t('Nema proizvođača za „:query”', { query: filters.q }) : t('Nema proizvođača za prikaz.')}
                    actions={
                        (filters.q || filters.city || filters.district) && (
                            <Button type="button" variant="outline" onClick={() => visit({ q: null, city: null, district: null })}>
                                {t('Prikaži sve proizvođače')}
                            </Button>
                        )
                    }
                >
                    {filters.q
                        ? t('Proverite kako je ime napisano, ili potražite proizvod umesto proizvođača.')
                        : filters.city && t('Iz ovog mesta još niko nije otvorio stranicu.')}
                </EmptyState>
            ) : (
                <>
                    <CardGrid className="gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 min-[112.5rem]:grid-cols-5">
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
