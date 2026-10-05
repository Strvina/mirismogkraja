import { formatPrice } from '@/lib/format';
import { t } from '@/lib/i18n';
import { thumbUrl } from '@/lib/media';
import { type Product } from '@/types';
import { Link } from '@inertiajs/react';

/** The producer's gallery: photos of the place and the work, with captions. */
export function ProducerGallery({ images }: { images: { id: number; path: string; caption: string | null }[] }) {
    if (images.length === 0) {
        return null;
    }

    return (
        <section className="mt-12">
            <h2 className="font-serif text-2xl">{t('Galerija')}</h2>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {images.map((image) => (
                    <figure key={image.id} className="group">
                        <div className="bg-muted aspect-[4/3] overflow-hidden rounded-md">
                            <img
                                src={thumbUrl(image.path)}
                                alt={image.caption ?? ''}
                                loading="lazy"
                                className="image-warm size-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                        </div>
                        {image.caption && <figcaption className="text-muted-foreground mt-2 text-xs leading-5">{image.caption}</figcaption>}
                    </figure>
                ))}
            </div>
        </section>
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
        <section className="mt-12">
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
                        <Link key={product.id} href={route('marketplace.products.show', product.slug)} className="group">
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
                        </Link>
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
