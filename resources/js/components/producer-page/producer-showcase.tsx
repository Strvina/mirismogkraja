import { QuickViewLink } from '@/components/marketplace/quick-view-link';
import { formatPrice } from '@/lib/format';
import { t } from '@/lib/i18n';
import { thumbUrl } from '@/lib/media';
import { cn } from '@/lib/utils';
import { type Product } from '@/types';
import { Link } from '@inertiajs/react';

/**
 * The producer's photos of the place and the work. On a phone a row to
 * swipe through, each photo most of the screen wide with the next one
 * showing at the edge; from a tablet up a mosaic, the first photo large,
 * with the captions laid over the foot of each.
 */
export function ProducerGallery({ images, className }: { images: { id: number; path: string; caption: string | null }[]; className?: string }) {
    if (images.length === 0) {
        return null;
    }

    // A mosaic that closes without a hole, whatever the number of photos.
    const grid = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' }[images.length] ?? 'sm:grid-cols-4';

    return (
        <div
            role="region"
            aria-label={t('Galerija')}
            tabIndex={0}
            className={cn(
                '-mx-5 flex snap-x snap-mandatory scroll-px-5 [scrollbar-width:none] gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:scroll-px-0 sm:auto-rows-[9rem] sm:overflow-visible sm:px-0 sm:pb-0 lg:auto-rows-[11rem] [&::-webkit-scrollbar]:hidden',
                grid,
                className,
            )}
        >
            {images.map((image, index) => (
                <figure
                    key={image.id}
                    className={cn(
                        'group relative w-[80%] shrink-0 snap-start sm:w-auto',
                        index === 0 && images.length > 2 && 'sm:col-span-2 sm:row-span-2',
                        images.length <= 2 && 'sm:row-span-2',
                        index === 3 && images.length === 4 && 'sm:col-span-2',
                    )}
                >
                    <div className="bg-muted aspect-[4/3] overflow-hidden rounded-md sm:aspect-auto sm:h-full">
                        <img
                            src={thumbUrl(image.path)}
                            alt={image.caption ?? ''}
                            loading="lazy"
                            className="image-warm size-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    </div>
                    {image.caption && (
                        <figcaption className="text-muted-foreground sm:text-on-photo mt-2 text-xs leading-5 sm:absolute sm:inset-x-0 sm:bottom-0 sm:mt-0 sm:rounded-b-md sm:bg-[linear-gradient(0deg,color-mix(in_oklab,var(--charcoal)_80%,transparent),transparent)] sm:px-3 sm:pt-8 sm:pb-2">
                            {image.caption}
                        </figcaption>
                    )}
                </figure>
            ))}
        </div>
    );
}

/** The newest products, and a link to all of them in the catalogue when there are more. */
export function ProducerProducts({
    producerId,
    producerSlug,
    products,
    total,
}: {
    producerId: number;
    producerSlug: string;
    products: Pick<Product, 'id' | 'name' | 'slug' | 'price' | 'unit' | 'images'>[];
    total: number;
}) {
    return (
        <section id="proizvodi" className="mt-12 scroll-mt-28">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-serif text-2xl">{t('Proizvodi')}</h2>
                {products.length > 0 && (
                    <Link
                        href={route('marketplace.catalog', producerSlug)}
                        className="text-primary text-sm font-medium underline-offset-4 hover:underline"
                    >
                        {t('Ponuda i cene na jednom mestu')}
                    </Link>
                )}
            </div>
            {products.length === 0 ? (
                <p className="text-muted-foreground mt-2 text-sm">{t('Ovaj proizvođač još nema objavljene proizvode.')}</p>
            ) : (
                <div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-4">
                    {products.map((product) => (
                        <QuickViewLink key={product.id} href={route('marketplace.products.show', product.slug)} className="group">
                            <div className="bg-muted aspect-square overflow-hidden rounded-md">
                                {product.images?.[0] && (
                                    <img
                                        loading="lazy"
                                        src={thumbUrl(product.images[0].path)}
                                        alt={product.name}
                                        className="image-warm size-full object-cover transition group-hover:scale-105"
                                    />
                                )}
                            </div>
                            <p className="mt-2 text-sm font-medium break-words">{product.name}</p>
                            <p className="text-muted-foreground text-sm">{formatPrice(product.price)}</p>
                        </QuickViewLink>
                    ))}
                </div>
            )}
            {total > products.length && (
                <Link
                    href={route('marketplace.products.index', { producer_id: producerId })}
                    className="text-primary mt-6 inline-block text-sm font-medium underline-offset-4 hover:underline"
                >
                    {t('Svi proizvodi (:count)', { count: total })}
                </Link>
            )}
        </section>
    );
}
