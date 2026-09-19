import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type Product } from '@/types';
import { Link, router } from '@inertiajs/react';
import { Heart, ImageOff } from 'lucide-react';

export interface ProductCardProduct extends Product {
    producer?: { id: number; name: string; city: string | null };
    is_favorited?: boolean;
}

/**
 * The product tile used across the catalog (task 11): image with a hover
 * zoom, a favourite toggle pinned in the corner, and the price set in the
 * landing page's type scale.
 */
export default function ProductCard({ product, canFavorite }: { product: ProductCardProduct; canFavorite: boolean }) {
    const image = product.images?.[0];
    const outOfStock = product.stock_quantity === 0;

    const toggleFavorite = (event: React.MouseEvent) => {
        event.preventDefault();
        router.post(
            route('favorites.toggle'),
            { favoritable_type: 'product', favoritable_id: product.id },
            { preserveScroll: true, preserveState: true },
        );
    };

    return (
        <Link
            href={route('marketplace.products.show', product.slug)}
            className="group border-border/70 hover:border-border flex flex-col overflow-hidden rounded-lg border bg-background transition-shadow duration-300 hover:shadow-lg"
        >
            <div className="bg-muted relative aspect-square overflow-hidden">
                {image ? (
                    <img
                        src={`/storage/${image.path}`}
                        alt={product.name}
                        loading="lazy"
                        className="image-warm size-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                ) : (
                    <div className="text-muted-foreground/40 grid size-full place-items-center">
                        <ImageOff className="size-8" />
                    </div>
                )}

                {canFavorite && (
                    <button
                        type="button"
                        onClick={toggleFavorite}
                        aria-label={product.is_favorited ? 'Ukloni iz omiljenih' : 'Dodaj u omiljene'}
                        aria-pressed={product.is_favorited}
                        className="bg-background/85 hover:bg-background absolute top-3 right-3 grid size-9 place-items-center rounded-full shadow-sm backdrop-blur transition-colors"
                    >
                        <Heart className={cn('size-4', product.is_favorited ? 'fill-primary text-primary' : 'text-foreground/70')} />
                    </button>
                )}

                {outOfStock && (
                    <span className="bg-charcoal/85 absolute bottom-3 left-3 rounded-full px-3 py-1 text-[0.65rem] font-semibold tracking-[0.08em] text-primary-foreground uppercase">
                        Nema na stanju
                    </span>
                )}
            </div>

            <div className="flex flex-1 flex-col p-4">
                {product.producer?.city && (
                    <p className="text-primary text-[0.65rem] font-semibold tracking-[0.12em] uppercase">{product.producer.city}</p>
                )}

                <h3 className="mt-1 font-serif text-lg leading-snug">{product.name}</h3>

                {product.producer && <p className="text-muted-foreground mt-1 text-xs">{product.producer.name}</p>}

                <p className="mt-auto pt-4 font-serif text-xl">
                    {formatPrice(product.price)}
                    <span className="text-muted-foreground ml-1 text-xs font-sans">/ {product.unit}</span>
                </p>
            </div>
        </Link>
    );
}
