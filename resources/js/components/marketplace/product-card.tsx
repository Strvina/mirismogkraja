import { FeaturedLabel } from '@/components/marketplace/plan-badges';
import { formatPrice } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { type Product } from '@/types';
import { Link, router } from '@inertiajs/react';
import { Heart, ImageOff } from 'lucide-react';

/** What the catalog sends per card - not the whole product row. */
export type ProductCardProduct = Pick<Product, 'id' | 'name' | 'slug' | 'price' | 'unit' | 'stock_quantity' | 'images'> & {
    producer?: { id: number; name: string; city: string | null };
    is_favorited?: boolean;
};

/**
 * The product tile used across the catalog (task 11): image with a hover
 * zoom, a favourite toggle pinned in the corner, and the price set in the
 * landing page's type scale.
 */
export default function ProductCard({
    product,
    canFavorite,
    featured = false,
}: {
    product: ProductCardProduct;
    canFavorite: boolean;
    featured?: boolean;
}) {
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
            className={cn(
                'group bg-background flex flex-col overflow-hidden rounded-lg border transition-shadow duration-300 hover:shadow-lg',
                featured ? 'border-gold/60 ring-gold/25 ring-1' : 'border-border/70 hover:border-border',
            )}
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
                        aria-label={product.is_favorited ? t('Ukloni iz omiljenih') : t('Dodaj u omiljene')}
                        aria-pressed={product.is_favorited}
                        className="bg-background/85 hover:bg-background absolute top-3 right-3 grid size-9 place-items-center rounded-full shadow-sm backdrop-blur transition-colors"
                    >
                        <Heart className={cn('size-4', product.is_favorited ? 'fill-primary text-primary' : 'text-foreground/70')} />
                    </button>
                )}

                {featured && <FeaturedLabel className="absolute top-3 left-3" />}

                {outOfStock && (
                    <span className="bg-charcoal/85 text-primary-foreground absolute bottom-3 left-3 rounded-full px-3 py-1 text-[0.65rem] font-semibold tracking-[0.08em] uppercase">
                        {t('Nema na stanju')}
                    </span>
                )}
            </div>

            <div className={cn('flex flex-1 flex-col', featured ? 'p-4' : 'p-3')}>
                {product.producer?.city && (
                    <p className="text-primary text-[0.65rem] font-semibold tracking-[0.12em] uppercase">{product.producer.city}</p>
                )}

                <h3 className={cn('mt-1 font-serif leading-snug', featured ? 'text-xl' : 'text-base')}>{product.name}</h3>

                {product.producer && <p className="text-muted-foreground mt-1 text-xs">{product.producer.name}</p>}

                <p className={cn('mt-auto font-serif', featured ? 'pt-4 text-xl' : 'pt-3 text-lg')}>
                    {formatPrice(product.price)}
                    <span className="text-muted-foreground ml-1 font-sans text-xs">/ {product.unit}</span>
                </p>
            </div>
        </Link>
    );
}
