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
}: {
    products: ProductCardProduct[];
    categories: Category[];
    producers: { id: number; name: string }[];
    cities: string[];
    priceBounds: { min: number; max: number };
    filters: ProductFilterValues;
}) {
    const { auth } = usePage<SharedData>().props;

    const update = (patch: ProductFilterValues) => {
        router.get('/proizvodi', { ...filters, ...patch }, { preserveState: true, preserveScroll: true });
    };

    const reset = () => {
        router.get('/proizvodi', filters.sort ? { sort: filters.sort } : {}, { preserveScroll: true });
    };

    return (
        <MarketplaceLayout>
            <Head title="Proizvodi | Vrelina juga" />

            <h1 className="font-serif text-4xl sm:text-5xl">Proizvodi</h1>
            <p className="text-muted-foreground mt-3 max-w-lg leading-7">
                Domaći proizvodi, direktno od ljudi koji ih prave.
            </p>

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
                            {products.length === 1 ? '1 proizvod' : `${products.length} proizvoda`}
                        </p>

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

                    {products.length === 0 ? (
                        <p className="text-muted-foreground py-16 text-center text-sm">Nema proizvoda za odabrane filtere.</p>
                    ) : (
                        <div className="grid grid-cols-2 gap-5 xl:grid-cols-3">
                            {products.map((product) => (
                                <ProductCard key={product.id} product={product} canFavorite={Boolean(auth.user)} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </MarketplaceLayout>
    );
}
