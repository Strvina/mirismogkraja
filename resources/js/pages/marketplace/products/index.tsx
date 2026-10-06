import Head from '@/components/head';
import CardGrid from '@/components/marketplace/card-grid';
import CompactSelect from '@/components/marketplace/compact-select';
import EmptyState from '@/components/marketplace/empty-state';
import FeaturedSection from '@/components/marketplace/featured-section';
import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import ProductCard, { type ProductCardProduct } from '@/components/marketplace/product-card';
import ProductFilters, { type ProductFilterValues } from '@/components/marketplace/product-filters';
import SearchBox from '@/components/marketplace/search-box';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { formatPrice } from '@/lib/format';
import { t, tx } from '@/lib/i18n';
import { thumbUrl } from '@/lib/media';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type Category, type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';

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
    browse,
    subcategories,
    prices,
    places,
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
    category: {
        id: number;
        name: string;
        slug: string;
        /** The category as people search for it ("Domaći ajvar"). */
        search_name: string | null;
        /** The owner's own paragraph for the top of the page. */
        intro: string | null;
        parent: { id: number; name: string; slug: string } | null;
    } | null;
    /** The general categories with something in them, for the catalogue's own page. */
    browse: { id: number; name: string; slug: string }[];
    /** On a category's page: the narrower pages of its family, each with something in it. */
    subcategories: { id: number; name: string; slug: string }[];
    /** On a category's page: what it costs, per unit, from the listings themselves. */
    prices: { unit: string; from: number; to: number; products: number }[];
    /** On a category's page: the towns it is sold from. */
    places: { slug: string; name: string }[];
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

    // Titled as people search for it, where the category says how.
    const heading = category ? t(category.search_name ?? category.name) : t('Proizvodi');
    // The family's general category: this one, or the one above it.
    const general = category ? (category.parent ?? category) : null;

    const chip = (active: boolean) =>
        cn(
            'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
            active ? 'border-primary bg-olive-soft text-olive' : 'border-border/70 hover:border-primary/40 hover:bg-muted/40',
        );

    const breadcrumbs: BreadcrumbItem[] = category
        ? [
              { title: tx('Proizvodi'), href: route('marketplace.products.index') },
              ...(category.parent ? [{ title: category.parent.name, href: route('marketplace.categories.show', category.parent.slug) }] : []),
              { title: category.name, href: route('marketplace.categories.show', category.slug) },
          ]
        : [];

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head />

            <h1 className="font-serif text-4xl sm:text-5xl">{heading}</h1>
            <p className="text-muted-foreground mt-3 max-w-lg leading-7">
                {category
                    ? category.intro ||
                      t('Domaći proizvodi iz kategorije „:category”, direktno od proizvođača sa juga Srbije.', { category: t(category.name) })
                    : t('Domaći proizvodi, direktno od ljudi koji ih prave.')}
            </p>

            {category && general && subcategories.length > 0 && (
                <nav aria-label={t('Potkategorije')} className="mt-6 flex flex-wrap gap-2">
                    <Link href={route('marketplace.categories.show', general.slug)} className={chip(category.id === general.id)}>
                        {t(general.name)}
                    </Link>
                    {subcategories.map((item) => (
                        <Link key={item.id} href={route('marketplace.categories.show', item.slug)} className={chip(category.id === item.id)}>
                            {t(item.name)}
                        </Link>
                    ))}
                </nav>
            )}

            {/* The catalogue's own page: the general categories, each a page of its own. */}
            {!category && browse.length > 0 && (
                <nav aria-label={t('Kategorije')} className="mt-6 flex flex-wrap gap-2">
                    {browse.map((item) => (
                        <Link key={item.id} href={route('marketplace.categories.show', item.slug)} className={chip(false)}>
                            {t(item.name)}
                        </Link>
                    ))}
                </nav>
            )}

            {category && places.length > 0 && (
                <nav aria-label={t('Po mestima')} className="mt-6 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{t('Po mestima:')}</span>
                    {places.map((place) => (
                        <Link
                            key={place.slug}
                            href={route('marketplace.places.category', [place.slug, category.slug])}
                            className="border-border/70 hover:border-primary/40 hover:bg-muted/40 rounded-full border px-3 py-1 transition-colors"
                        >
                            {place.name}
                        </Link>
                    ))}
                </nav>
            )}

            <SearchBox value={filters.q ?? ''} onSearch={(q) => update({ q: q || undefined })} className="mt-6 max-w-xl" />

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

            <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:gap-10">
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
                            {/* On a phone the count and the order share one line; the page size is a desktop nicety. */}
                            <span className="hidden items-center gap-2 text-sm sm:flex">
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
                                <label htmlFor="sort" className="text-muted-foreground sr-only sm:not-sr-only">
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
                            itemClassName="w-[72vw] sm:w-[260px] lg:w-[280px]"
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
                            {featured.map((product) => (
                                <ProductCard key={product.id} product={product} canFavorite={Boolean(auth.user)} featured />
                            ))}
                        </FeaturedSection>
                    )}

                    {products.data.length === 0 ? (
                        <EmptyState
                            title={filters.q ? t('Nema proizvoda za „:query”', { query: filters.q }) : t('Nema proizvoda za odabrane filtere.')}
                            actions={
                                <>
                                    <Button type="button" variant="outline" onClick={reset}>
                                        {t('Poništi filtere')}
                                    </Button>
                                    {/* Nothing here answers the search: let the
                                        buyer say what they want and have
                                        producers come to them. */}
                                    {filters.q && (
                                        <Link
                                            href={auth.user ? route('wanted.create', { q: filters.q }) : route('wanted.index')}
                                            className="text-primary text-sm font-medium underline-offset-4 hover:underline"
                                        >
                                            {t('Napišite šta tražite, pa neka se proizvođači jave vama')}
                                        </Link>
                                    )}
                                </>
                            }
                        >
                            {t('Probajte sa manje filtera ili drugom rečju.')}
                        </EmptyState>
                    ) : (
                        <>
                            <CardGrid className="grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                                {products.data.map((product) => (
                                    <ProductCard key={product.id} product={product} canFavorite={Boolean(auth.user)} />
                                ))}
                            </CardGrid>

                            <Pagination meta={products} />
                        </>
                    )}
                </div>
            </div>

            {category && prices.length > 0 && (
                <section className="border-border/70 mt-16 max-w-2xl border-t pt-10">
                    <h2 className="font-serif text-2xl">{t(':category — cena', { category: heading })}</h2>
                    <p className="text-muted-foreground mt-3 leading-7">
                        {t('Cene kod proizvođača na Vrelini juga, prema proizvodima koji su sada u ponudi.')}
                    </p>
                    <ul className="mt-4 space-y-2">
                        {prices.map((range) => (
                            <li key={range.unit} className="flex flex-wrap items-baseline gap-x-3">
                                <span className="font-serif text-xl">
                                    {range.from === range.to ? formatPrice(range.from) : `${formatPrice(range.from)} – ${formatPrice(range.to)}`}
                                    <span className="text-muted-foreground ml-1 font-sans text-sm">/ {range.unit}</span>
                                </span>
                                <span className="text-muted-foreground text-sm">{t('Proizvoda: :count', { count: range.products })}</span>
                            </li>
                        ))}
                    </ul>
                    <p className="text-muted-foreground mt-4 text-sm leading-6">
                        {t('Cenu određuje svaki proizvođač. Količinu, preuzimanje i dostavu dogovarate direktno sa njim.')}
                    </p>
                </section>
            )}
        </MarketplaceLayout>
    );
}
