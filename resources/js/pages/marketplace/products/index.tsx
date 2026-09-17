import MarketplaceLayout from '@/layouts/marketplace-layout';
import { type Category, type Product } from '@/types';
import { Head, Link, router } from '@inertiajs/react';

type Filters = {
    category_id?: string;
    city?: string;
    min_price?: string;
    max_price?: string;
    sort?: string;
};

export default function ProductsIndex({
    products,
    categories,
    cities,
    filters,
}: {
    products: Product[];
    categories: Category[];
    cities: string[];
    filters: Filters;
}) {
    const update = (patch: Partial<Filters>) => {
        router.get('/proizvodi', { ...filters, ...patch }, { preserveState: true });
    };

    return (
        <MarketplaceLayout>
            <Head title="Proizvodi | Vrelina juga" />

            <h1 className="font-serif text-4xl sm:text-5xl">Proizvodi</h1>

            <div className="mt-6 flex flex-wrap gap-3">
                <select
                    className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                    value={filters.category_id ?? ''}
                    onChange={(e) => update({ category_id: e.target.value || undefined })}
                >
                    <option value="">Sve kategorije</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>

                {cities.length > 0 && (
                    <select
                        className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                        value={filters.city ?? ''}
                        onChange={(e) => update({ city: e.target.value || undefined })}
                    >
                        <option value="">Svi gradovi</option>
                        {cities.map((city) => (
                            <option key={city} value={city}>
                                {city}
                            </option>
                        ))}
                    </select>
                )}

                <input
                    type="number"
                    placeholder="Min cena"
                    className="border-input bg-background w-28 rounded-md border px-3 py-2 text-sm"
                    defaultValue={filters.min_price ?? ''}
                    onBlur={(e) => update({ min_price: e.target.value || undefined })}
                />
                <input
                    type="number"
                    placeholder="Max cena"
                    className="border-input bg-background w-28 rounded-md border px-3 py-2 text-sm"
                    defaultValue={filters.max_price ?? ''}
                    onBlur={(e) => update({ max_price: e.target.value || undefined })}
                />

                <select
                    className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                    value={filters.sort ?? ''}
                    onChange={(e) => update({ sort: e.target.value || undefined })}
                >
                    <option value="">Najnovije</option>
                    <option value="price_asc">Cena rastuće</option>
                    <option value="price_desc">Cena opadajuće</option>
                </select>
            </div>

            {products.length === 0 ? (
                <p className="text-muted-foreground mt-10 text-sm">Nema proizvoda za odabrane filtere.</p>
            ) : (
                <div className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-4">
                    {products.map((product) => (
                        <Link key={product.id} href={route('marketplace.products.show', product.slug)} className="group">
                            <div className="bg-muted aspect-square overflow-hidden rounded-md">
                                {product.images?.[0] && (
                                    <img
                                        src={`/storage/${product.images[0].path}`}
                                        alt={product.name}
                                        className="image-warm size-full object-cover transition duration-700 group-hover:scale-105"
                                    />
                                )}
                            </div>
                            <p className="mt-2 text-sm font-medium">{product.name}</p>
                            <p className="text-muted-foreground text-sm">{product.price} RSD</p>
                        </Link>
                    ))}
                </div>
            )}
        </MarketplaceLayout>
    );
}
