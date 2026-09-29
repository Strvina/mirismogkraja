import { FeaturedLabel, PremiumBadge } from '@/components/marketplace/plan-badges';
import { deliveryMethodLabel } from '@/lib/delivery';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { type Producer } from '@/types';
import { Link } from '@inertiajs/react';
import { BadgeCheck, MapPin, Star, Truck } from 'lucide-react';

export interface ProducerCardProducer extends Producer {
    reviews_avg_rating: number | null;
    reviews_count: number;
    products_count: number;
    is_premium?: boolean;
    reviews: {
        id: number;
        rating: number;
        comment: string | null;
        image_path: string | null;
        user: { id: number; name: string; avatar_path: string | null };
    }[];
}

function Avatar({ name, path, className = 'size-8' }: { name: string; path: string | null; className?: string }) {
    if (path) {
        return <img loading="lazy" src={`/storage/${path}`} alt="" className={`${className} shrink-0 rounded-full object-cover`} />;
    }

    return (
        <span className={`${className} bg-olive-soft text-olive grid shrink-0 place-items-center rounded-full text-xs font-semibold`}>
            {name.charAt(0).toUpperCase()}
        </span>
    );
}

function Rating({ value, count }: { value: number | null; count: number }) {
    if (!value) {
        return <span className="text-muted-foreground text-xs">{t('Još nema utisaka')}</span>;
    }

    return (
        <span className="flex items-center gap-1 text-sm">
            <Star className="fill-gold text-gold size-4" />
            <span className="font-semibold">{value.toFixed(1)}</span>
            <span className="text-muted-foreground text-xs">({count})</span>
        </span>
    );
}

/**
 * Producer tile for the catalog grid (task 13): cover image with the
 * producer's avatar overlapping it, their tagline, rating and location, and
 * a couple of recent reviews so the card carries some social proof.
 */
export default function ProducerCard({ producer, featured = false }: { producer: ProducerCardProducer; featured?: boolean }) {
    const href = route('marketplace.producers.show', producer.slug);

    return (
        <article
            className={cn(
                'group bg-background flex flex-col overflow-hidden rounded-lg border transition-shadow duration-300 hover:shadow-lg',
                featured ? 'border-gold/60 ring-gold/25 ring-1' : 'border-border/70 hover:border-border',
            )}
        >
            <Link href={href} className="bg-muted relative block aspect-[16/9] overflow-hidden">
                {producer.cover_image_path && (
                    <img
                        src={`/storage/${producer.cover_image_path}`}
                        alt=""
                        loading="lazy"
                        className="image-warm size-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                )}
                {featured && <FeaturedLabel className="absolute top-3 left-3" />}
            </Link>

            <div className={cn('flex flex-1 flex-col', featured ? 'p-5' : 'p-4')}>
                <div className={cn('mb-3 flex items-end justify-between gap-3', featured ? '-mt-11' : '-mt-9')}>
                    <span className="ring-background relative z-10 rounded-full ring-4">
                        <Avatar name={producer.name} path={producer.logo_path} className={featured ? 'size-14' : 'size-11'} />
                    </span>
                    <Rating value={producer.reviews_avg_rating} count={producer.reviews_count} />
                </div>

                <h2 className={cn('flex flex-wrap items-center gap-1.5 font-serif leading-tight', featured ? 'text-2xl' : 'text-xl')}>
                    <Link href={href}>{producer.name}</Link>
                    {producer.verified_at && <BadgeCheck className="text-olive size-4 shrink-0" aria-label={t('Provereni proizvođač')} />}
                    {producer.is_premium && <PremiumBadge />}
                </h2>

                <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    {producer.city && (
                        <span className="text-primary flex items-center gap-1 font-semibold tracking-[0.08em] uppercase">
                            <MapPin className="size-3.5" />
                            {producer.city}
                        </span>
                    )}
                    <span>{producer.products_count === 1 ? t('1 proizvod') : t(':count proizvoda', { count: producer.products_count })}</span>
                </div>

                {producer.description && <p className="text-muted-foreground mt-3 line-clamp-2 text-sm leading-6">{producer.description}</p>}

                {producer.delivery_methods && producer.delivery_methods.length > 0 && (
                    <p className="text-muted-foreground mt-3 flex items-start gap-1.5 text-xs">
                        <Truck className="mt-0.5 size-3.5 shrink-0" />
                        <span>{producer.delivery_methods.map(deliveryMethodLabel).join(' · ')}</span>
                    </p>
                )}

                {producer.reviews.length > 0 && (
                    <div className="border-border/70 mt-4 space-y-3 border-t pt-4">
                        {/* One review on a regular card keeps the grid tight. */}
                        {producer.reviews.slice(0, featured ? 2 : 1).map((review) => (
                            <div key={review.id} className="flex gap-2.5">
                                <Avatar name={review.user.name} path={review.user.avatar_path} />
                                <div className="min-w-0">
                                    <p className="flex items-center gap-2 text-xs font-medium">
                                        {review.user.name}
                                        <span className="text-gold" aria-label={t('Ocena :rating od 5', { rating: review.rating })}>
                                            {'★'.repeat(review.rating)}
                                        </span>
                                    </p>
                                    {review.comment && <p className="text-muted-foreground line-clamp-2 text-xs leading-5">{review.comment}</p>}
                                    {review.image_path && (
                                        <img
                                            src={`/storage/${review.image_path}`}
                                            alt=""
                                            loading="lazy"
                                            className="mt-1.5 size-12 rounded object-cover"
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </article>
    );
}
