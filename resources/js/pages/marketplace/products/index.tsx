import CardSlider from '@/components/marketplace/card-slider';
import CompactSelect from '@/components/marketplace/compact-select';
import FeaturedSection from '@/components/marketplace/featured-section';
import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import ProductCard, { type ProductCardProduct } from '@/components/marketplace/product-card';
import ProductFilters, { type ProductFilterValues } from '@/components/marketplace/product-filters';
import SearchBox from '@/components/marketplace/search-box';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { t } from '@/lib/i18n';
import { thumbUrl } from '@/lib/media';
import { type Category, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';

export default function ProductsIndex({
    products,
    featured,
    categories,
    producers,
    cities,
    priceBounds,
    filters,
    perPage,
    perPageOptions,
    category,
    matchingProducers,
}: {
    products: Paginated<ProductCardProduct>;
    featured: ProductCardProduct[];
    categories: Category[];
    producers: { id: number; name: string }[];
    cities: string[];
    priceBounds: { min: number; max: number };
    filters: ProductFilterValues;
    perPage: number;
    perPageOptions: number[];
    /** Set on a category's own page (/kategorija/...). */
    category: { id: number; name: string; slug: string } | null;
    /** On the first page of a search: the producers it matches. */
    matchingProducers: { id: number; name: string; slug: string; city: string | null; logo_path: string | null }[];
}) {
    const { auth } = usePage<SharedData>().props;

    const update = (patch: ProductFilterValues & { per_page?: number }) => {
        // Any filter change resets to page 1; staying on page 7 of a narrower
        // result set would just show an empty grid.
        router.get('/proizvodi', { ...filters, per_page: perPage, ...patch, page: undefined }, { preserveState: true, preserveScroll: true });
    };

    const reset = () => {
        router.get('/proizvodi', { sort: filters.sort, q: filters.q }, { preserveScroll: true });
    };

    return (
        <MarketplaceLayout>
            <Head title={category ? t(':category | Vrelina juga', { category: t(category.name) }) : t('Proizvodi | Vrelina juga')} />

            <h1 className="font-serif text-4xl sm:text-5xl">{category ? t(category.name) : t('Proizvodi')}</h1>
            <p className="text-muted-foreground mt-3 max-w-lg leading-7">
                {category
                    ? t('Domaći proizvodi iz kategorije „:category”, direktno od proizvođača sa juga Srbije.', { category: t(category.name) })
                    : t('Domaći proizvodi, direktno od ljudi koji ih prave.')}
            </p>

            <SearchBox value={filters.q ?? ''} onSearch={(q) => update({ q: q || undefined })} className="mt-8 max-w-xl" />

            {filters.q && (
                <p className="text-muted-foreground mt-3 text-sm">
                    {t('Rezultati za „:query”', { query: filters.q })} ·{' '}
                    <button type="button" className="hover:text-foreground underline underline-offset-4" onClick={() => update({ q: undefined })}>
                        {t('Poništi pretragu')}
                    </button>
                </p>
            )}

            {matchingProducers.length > 0 && (
                <div className="mt-6">
                    <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.18em] uppercase">{t('Proizvođači')}</p>
                    <div className="flex flex-wrap gap-2">
                        {matchingProducers.map((producer) => (
                            <Link
                                key={producer.id}
                                href={route('marketplace.producers.show', producer.slug)}
                                className="border-border/70 hover:border-primary/40 hover:bg-muted/40 flex items-center gap-2 rounded-full border py-1 pr-4 pl-1 text-sm transition-colors"
                            >
                                {producer.logo_path ? (
                                    <img src={thumbUrl(producer.logo_path)} alt="" loading="lazy" className="size-7 rounded-full object-cover" />
                                ) : (
                                    <span className="bg-muted text-muted-foreground flex size-7 items-center justify-center rounded-full text-xs font-semibold">
                                        {producer.name.charAt(0).toUpperCase()}
                                    </span>
                                )}
                                <span className="font-medium">{producer.name}</span>
                                {producer.city && <span className="text-muted-foreground">· {producer.city}</span>}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:gap-12">
                <ProductFilters
                    filters={filters}
                    categories={categories}
                    producers={producers}
                    cities={cities}
                    priceBounds={priceBounds}
                    onChange={update}
                    onReset={reset}
                />

                <div className="flex-1">
                    <div className="border-border/70 mb-6 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                        <p className="text-muted-foreground text-sm">
                            {products.total === 0
                                ? t('Nema proizvoda')
                                : t('Prikazano :from–:to od :total', { from: products.from, to: products.to, total: products.total })}
                        </p>

                        <div className="flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-2 text-sm">
                                <label htmlFor="per-page" className="text-muted-foreground">
                                    {t('Po strani:')}
                                </label>
                                <CompactSelect
                                    id="per-page"
                                    className="w-20"
                                    value={String(perPage)}
                                    onChange={(value) => update({ per_page: Number(value) })}
                                    options={perPageOptions.map((option) => ({ value: String(option), label: String(option) }))}
                                />
                            </span>

                            <span className="flex items-center gap-2 text-sm">
                                <label htmlFor="sort" className="text-muted-foreground">
                                    {t('Sortiraj:')}
                                </label>
                                <CompactSelect
                                    id="sort"
                                    className="w-44"
                                    value={filters.sort ?? ''}
                                    onChange={(value) => update({ sort: value || undefined })}
                                    options={[
                                        { value: '', label: t('Najnovije') },
                                        { value: 'price_asc', label: t('Cena: niža prvo') },
                                        { value: 'price_desc', label: t('Cena: viša prvo') },
                                    ]}
                                />
                            </span>
                        </div>
                    </div>

                    {featured.length > 0 && (
                        <FeaturedSection
                            className=""
                            title={t('Istaknuti proizvodi')}
                            listLabel={t('Svi proizvodi')}
                            explanation={
                                <>
                                    <p>{t('Proizvođači su platili da ovi proizvodi budu istaknuti nekoliko dana.')}</p>
                                    <p>{t('Prikazuju se samo oni koji odgovaraju vašim filterima, a mesta se smenjuju pri svakoj poseti.')}</p>
                                    <p>{t('Rezultati ispod su isti za sve i nisu uređeni po tome ko plaća.')}</p>
                                </>
                            }
                        >
                            <CardSlider label={t('Istaknuti proizvodi')} itemClassName="w-[72vw] sm:w-[260px] lg:w-[280px]">
                                {featured.map((product) => (
                                    <ProductCard key={product.id} product={product} canFavorite={Boolean(auth.user)} featured />
                                ))}
                            </CardSlider>
                        </FeaturedSection>
                    )}

                    {products.data.length === 0 ? (
                        <p className="text-muted-foreground py-16 text-center text-sm">{t('Nema proizvoda za odabrane filtere.')}</p>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                                {products.data.map((product) => (
                                    <ProductCard key={product.id} product={product} canFavorite={Boolean(auth.user)} />
                                ))}
                            </div>

                            <Pagination meta={products} />
                        </>
                    )}
                </div>
            </div>
        </MarketplaceLayout>
    );
}
