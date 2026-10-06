import Head from '@/components/head';
import CompactSelect from '@/components/marketplace/compact-select';
import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import WantedAdCard, { type WantedAdState, type WantedAdSummary } from '@/components/marketplace/wanted-ad-card';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { categoryOptions } from '@/lib/categories';
import { t } from '@/lib/i18n';
import { type Category, type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { Plus } from 'lucide-react';

interface Filters {
    kategorija: number | null;
    mesto: string | null;
}

/**
 * "Tražim": the reverse of the catalogue. Buyers write what they are looking
 * for, and producers who have it answer.
 */
export default function WantedIndex({
    ads,
    mine,
    categories,
    cities,
    filters,
}: {
    ads: Paginated<WantedAdSummary>;
    /** The reader's own ads, in whatever state. */
    mine: (WantedAdSummary & { state: WantedAdState })[];
    categories: Category[];
    cities: string[];
    filters: Filters;
}) {
    const { auth } = usePage<SharedData>().props;

    const update = (patch: Partial<Filters>) =>
        router.get(route('wanted.index'), { ...filters, ...patch }, { preserveState: true, preserveScroll: true });

    return (
        <MarketplaceLayout>
            <Head title={t('Tražim | Vrelina juga')} />

            <div className="flex flex-wrap items-end justify-between gap-6">
                <div className="max-w-xl">
                    <p className="text-primary mb-3 text-xs font-semibold tracking-[0.16em] uppercase">{t('Kupci traže')}</p>
                    <h1 className="font-serif text-4xl sm:text-5xl">{t('Tražim')}</h1>
                    <p className="text-muted-foreground mt-3 leading-7">
                        {t('Ne nalazite ono što vam treba? Napišite šta tražite, a proizvođači koji to imaju javiće vam se u porukama.')}
                    </p>
                </div>
                <Button asChild>
                    <Link href={auth.user ? route('wanted.create') : route('login')}>
                        <Plus />
                        {t('Napiši šta tražiš')}
                    </Link>
                </Button>
            </div>

            {mine.length > 0 && (
                <section className="mt-10">
                    <h2 className="font-serif text-2xl">{t('Moji oglasi')}</h2>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {mine.map((ad) => (
                            <WantedAdCard key={ad.id} ad={ad} state={ad.state} />
                        ))}
                    </div>
                </section>
            )}

            <section className="mt-10">
                <div className="border-border/70 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                    <h2 className="font-serif text-2xl">{t('Šta kupci traže')}</h2>
                    <div className="flex flex-wrap items-center gap-3">
                        <CompactSelect
                            id="wanted-category"
                            className="w-48"
                            value={filters.kategorija ? String(filters.kategorija) : ''}
                            onChange={(value) => update({ kategorija: value ? Number(value) : null })}
                            options={[{ value: '', label: t('Sve kategorije') }, ...categoryOptions(categories)]}
                        />
                        {cities.length > 0 && (
                            <CompactSelect
                                id="wanted-city"
                                className="w-44"
                                value={filters.mesto ?? ''}
                                onChange={(value) => update({ mesto: value || null })}
                                options={[{ value: '', label: t('Cela Srbija') }, ...cities.map((city) => ({ value: city, label: city }))]}
                            />
                        )}
                    </div>
                </div>

                {ads.data.length === 0 ? (
                    <p className="text-muted-foreground py-16 text-center text-sm">
                        {filters.kategorija || filters.mesto
                            ? t('Nema oglasa za odabrane filtere.')
                            : t('Još nema oglasa. Napišite prvi — proizvođači čitaju ovu stranu.')}
                    </p>
                ) : (
                    <>
                        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {ads.data.map((ad) => (
                                <WantedAdCard key={ad.id} ad={ad} />
                            ))}
                        </div>
                        <Pagination meta={ads} />
                    </>
                )}
            </section>
        </MarketplaceLayout>
    );
}
