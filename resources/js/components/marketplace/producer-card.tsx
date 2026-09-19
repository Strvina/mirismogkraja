import { type Producer } from '@/types';
import { Link } from '@inertiajs/react';
import { MapPin, Star } from 'lucide-react';

export interface ProducerCardProducer extends Producer {
    reviews_avg_rating: number | null;
    reviews_count: number;
    products_count: number;
    reviews: {
        id: number;
        rating: number;
        comment: string | null;
        user: { id: number; name: string; avatar_path: string | null };
    }[];
}

function Avatar({ name, path, className = 'size-8' }: { name: string; path: string | null; className?: string }) {
    if (path) {
        return <img src={`/storage/${path}`} alt="" className={`${className} shrink-0 rounded-full object-cover`} />;
    }

    return (
        <span className={`${className} bg-olive-soft text-olive grid shrink-0 place-items-center rounded-full text-xs font-semibold`}>
            {name.charAt(0).toUpperCase()}
        </span>
    );
}

function Rating({ value, count }: { value: number | null; count: number }) {
    if (!value) {
        return <span className="text-muted-foreground text-xs">Još nema ocena</span>;
    }

    return (
        <span className="flex items-center gap-1 text-sm">
            <Star className="size-4 fill-gold text-gold" />
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
export default function ProducerCard({ producer }: { producer: ProducerCardProducer }) {
    const href = route('marketplace.producers.show', producer.slug);

    return (
        <article className="group border-border/70 hover:border-border flex flex-col overflow-hidden rounded-lg border transition-shadow duration-300 hover:shadow-lg">
            <Link href={href} className="bg-muted relative block aspect-[16/9] overflow-hidden">
                {producer.cover_image_path && (
                    <img
                        src={`/storage/${producer.cover_image_path}`}
                        alt=""
                        loading="lazy"
                        className="image-warm size-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                )}
            </Link>

            <div className="flex flex-1 flex-col p-5">
                <div className="-mt-11 mb-3 flex items-end justify-between gap-3">
                    <span className="ring-background rounded-full ring-4">
                        <Avatar name={producer.name} path={producer.logo_path} className="size-14" />
                    </span>
                    <Rating value={producer.reviews_avg_rating} count={producer.reviews_count} />
                </div>

                <h2 className="font-serif text-2xl leading-tight">
                    <Link href={href}>{producer.name}</Link>
                </h2>

                <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    {producer.city && (
                        <span className="text-primary flex items-center gap-1 font-semibold tracking-[0.08em] uppercase">
                            <MapPin className="size-3.5" />
                            {producer.city}
                        </span>
                    )}
                    <span>
                        {producer.products_count} {producer.products_count === 1 ? 'proizvod' : 'proizvoda'}
                    </span>
                </div>

                {producer.description && (
                    <p className="text-muted-foreground mt-3 line-clamp-2 text-sm leading-6">{producer.description}</p>
                )}

                {producer.reviews.length > 0 && (
                    <div className="border-border/70 mt-4 space-y-3 border-t pt-4">
                        {producer.reviews.map((review) => (
                            <div key={review.id} className="flex gap-2.5">
                                <Avatar name={review.user.name} path={review.user.avatar_path} />
                                <div className="min-w-0">
                                    <p className="flex items-center gap-2 text-xs font-medium">
                                        {review.user.name}
                                        <span className="text-gold" aria-label={`Ocena ${review.rating} od 5`}>
                                            {'★'.repeat(review.rating)}
                                        </span>
                                    </p>
                                    {review.comment && (
                                        <p className="text-muted-foreground line-clamp-2 text-xs leading-5">{review.comment}</p>
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
