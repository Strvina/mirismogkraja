import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import ProductCard, { type ProductCardProduct } from '@/components/marketplace/product-card';
import ProductFilters, { type ProductFilterValues } from '@/components/marketplace/product-filters';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { type Category, type SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';

const selectClasses =
    'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 rounded-md border px-3 text-sm shadow-xs transition focus-visible:ring-[3px] focus-visible:outline-none';

export default function ProductsIndex({
    products,
    categories,
    producers,
    cities,
    priceBounds,
    filters,
    perPage,
    perPageOptions,
}: {
    products: Paginated<ProductCardProduct>;
    categories: Category[];
    producers: { id: number; name: string }[];
    cities: string[];
    priceBounds: { min: number; max: number };
    filters: ProductFilterValues;
    perPage: number;
    perPageOptions: number[];
}) {
    const { auth } = usePage<SharedData>().props;

    const update = (patch: ProductFilterValues & { per_page?: number }) => {
        // Any filter change resets to page 1; staying on page 7 of a narrower
        // result set would just show an empty grid.
        router.get('/proizvodi', { ...filters, per_page: perPage, ...patch, page: undefined }, { preserveState: true, preserveScroll: true });
    };

    const reset = () => {
        router.get('/proizvodi', filters.sort ? { sort: filters.sort } : {}, { preserveScroll: true });
    };

    return (
        <MarketplaceLayout>
            <Head title="Proizvodi | Vrelina juga" />

            <h1 className="font-serif text-4xl sm:text-5xl">Proizvodi</h1>
            <p className="text-muted-foreground mt-3 max-w-lg leading-7">Domaći proizvodi, direktno od ljudi koji ih prave.</p>

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
                            {products.total === 0 ? 'Nema proizvoda' : `Prikazano ${products.from}–${products.to} od ${products.total}`}
                        </p>

                        <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Po strani:</span>
                                <select className={selectClasses} value={perPage} onChange={(e) => update({ per_page: Number(e.target.value) })}>
                                    {perPageOptions.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Sortiraj:</span>
                                <select
                                    className={selectClasses}
                                    value={filters.sort ?? ''}
                                    onChange={(e) => update({ sort: e.target.value || undefined })}
                                >
                                    <option value="">Najnovije</option>
                                    <option value="price_asc">Cena: niža prvo</option>
                                    <option value="price_desc">Cena: viša prvo</option>
                                </select>
                            </label>
                        </div>
                    </div>

                    {products.data.length === 0 ? (
                        <p className="text-muted-foreground py-16 text-center text-sm">Nema proizvoda za odabrane filtere.</p>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-5 xl:grid-cols-3">
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
