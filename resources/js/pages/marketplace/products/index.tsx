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
        <>
            <Head title="Proizvodi | Vrelina juga" />

            <main className="min-h-screen bg-background paper-grain">
                <div className="mx-auto max-w-[1380px] px-5 py-12 sm:px-8 lg:px-12">
                    <Link href="/" className="text-sm font-semibold text-primary">
                        ← Vrelina juga
                    </Link>

                    <h1 className="mt-6 font-serif text-4xl sm:text-5xl">Proizvodi</h1>

                    <div className="mt-6 flex flex-wrap gap-3">
                        <select
                            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                            className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            defaultValue={filters.min_price ?? ''}
                            onBlur={(e) => update({ min_price: e.target.value || undefined })}
                        />
                        <input
                            type="number"
                            placeholder="Max cena"
                            className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            defaultValue={filters.max_price ?? ''}
                            onBlur={(e) => update({ max_price: e.target.value || undefined })}
                        />

                        <select
                            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={filters.sort ?? ''}
                            onChange={(e) => update({ sort: e.target.value || undefined })}
                        >
                            <option value="">Najnovije</option>
                            <option value="price_asc">Cena rastuće</option>
                            <option value="price_desc">Cena opadajuće</option>
                        </select>
                    </div>

                    {products.length === 0 ? (
                        <p className="mt-10 text-sm text-muted-foreground">Nema proizvoda za odabrane filtere.</p>
                    ) : (
                        <div className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-4">
                            {products.map((product) => (
                                <Link key={product.id} href={route('marketplace.products.show', product.slug)} className="group">
                                    <div className="aspect-square overflow-hidden rounded-md bg-muted">
                                        {product.images?.[0] && (
                                            <img
                                                src={`/storage/${product.images[0].path}`}
                                                alt={product.name}
                                                className="image-warm size-full object-cover transition duration-700 group-hover:scale-105"
                                            />
                                        )}
                                    </div>
                                    <p className="mt-2 text-sm font-medium">{product.name}</p>
                                    <p className="text-sm text-muted-foreground">{product.price} RSD</p>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
