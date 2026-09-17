import FavoriteButton from '@/components/favorite-button';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { type Household, type Product, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { MapPin } from 'lucide-react';
import { useState } from 'react';

type FullProduct = Product & { household: Household };

export default function ProductShow({ product, similar, isFavorited }: { product: FullProduct; similar: Product[]; isFavorited: boolean }) {
    const { auth } = usePage<SharedData>().props;
    const [quantity, setQuantity] = useState(1);
    const images = [...(product.images ?? [])].sort((a, b) => a.order - b.order);
    const mainImage = images[0];

    const addToCart = () => {
        if (!auth.user) {
            router.visit(route('login'));
            return;
        }

        router.post(route('cart.store'), { product_id: product.id, quantity });
    };

    return (
        <MarketplaceLayout>
            <Head title={product.name} />

            <div className="grid gap-10 lg:grid-cols-2">
                <div className="bg-muted aspect-square overflow-hidden rounded-md">
                    {mainImage && <img src={`/storage/${mainImage.path}`} alt={product.name} className="image-warm size-full object-cover" />}
                </div>

                <div>
                    <p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">{product.category?.name}</p>
                    <h1 className="mt-2 font-serif text-4xl">{product.name}</h1>
                    <p className="mt-3 text-2xl font-semibold">
                        {product.price} RSD <span className="text-muted-foreground text-sm">/ {product.unit}</span>
                    </p>

                    {product.description && <p className="text-muted-foreground mt-6 leading-7">{product.description}</p>}

                    <div className="mt-6 flex items-center gap-3">
                        <input
                            type="number"
                            min={1}
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                            className="border-input bg-background w-20 rounded-md border px-3 py-2 text-sm"
                        />
                        <Button onClick={addToCart}>Dodaj u korpu</Button>
                        {auth.user && <FavoriteButton type="product" id={product.id} isFavorited={isFavorited} />}
                    </div>

                    <Link
                        href={route('marketplace.households.show', product.household.slug)}
                        className="hover:bg-muted mt-8 flex items-center gap-3 rounded-md border p-4"
                    >
                        {product.household.logo_path && (
                            <img src={`/storage/${product.household.logo_path}`} alt="" className="size-10 rounded-full object-cover" />
                        )}
                        <div>
                            <p className="font-serif">{product.household.name}</p>
                            {product.household.city && (
                                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                                    <MapPin className="size-3" />
                                    {product.household.city}
                                </p>
                            )}
                        </div>
                    </Link>
                </div>
            </div>

            {similar.length > 0 && (
                <section className="mt-16">
                    <h2 className="font-serif text-2xl">Slični proizvodi</h2>
                    <div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-4">
                        {similar.map((p) => (
                            <Link key={p.id} href={route('marketplace.products.show', p.slug)} className="group">
                                <div className="bg-muted aspect-square overflow-hidden rounded-md">
                                    {p.images?.[0] && (
                                        <img
                                            src={`/storage/${p.images[0].path}`}
                                            alt={p.name}
                                            className="image-warm size-full object-cover transition group-hover:scale-105"
                                        />
                                    )}
                                </div>
                                <p className="mt-2 text-sm font-medium">{p.name}</p>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </MarketplaceLayout>
    );
}
