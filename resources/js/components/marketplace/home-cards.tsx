import { formatPrice } from '@/lib/format';
import { Link } from '@inertiajs/react';
import { ImageOff, MapPin, Star } from 'lucide-react';

export interface HomeProducer {
    id: number;
    name: string;
    slug: string;
    city: string | null;
    description: string | null;
    cover_image_path: string | null;
    logo_path: string | null;
    products_count: number;
    reviews_count: number;
    rating: number | null;
    tags: string[];
}

export interface HomeProduct {
    id: number;
    name: string;
    slug: string;
    price: string;
    unit: string;
    image: string | null;
    producer: { name: string; slug: string; city: string | null };
}

/**
 * The homepage's producer tile. Deliberately lighter than the catalog's
 * ProducerCard - inside a slider there's no room for quoted reviews - but it
 * carries the same facts: who, where, how much they offer and how they're
 * rated.
 */
export function HomeProducerCard({ producer }: { producer: HomeProducer }) {
    const href = route('marketplace.producers.show', producer.slug);

    return (
        <article className="group border-border/70 hover:border-border bg-background flex h-full flex-col overflow-hidden rounded-lg border transition-shadow duration-300 hover:shadow-lg">
            <Link href={href} className="bg-muted relative block aspect-[16/10] overflow-hidden">
                {producer.cover_image_path ? (
                    <img
                        src={`/storage/${producer.cover_image_path}`}
                        alt=""
                        loading="lazy"
                        className="image-warm size-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                ) : (
                    <span className="text-muted-foreground/40 grid size-full place-items-center">
                        <ImageOff className="size-7" />
                    </span>
                )}
            </Link>

            <div className="flex flex-1 flex-col p-5">
                <div className="-mt-11 mb-3 flex items-end justify-between gap-3">
                    <span className="ring-background rounded-full ring-4">
                        {producer.logo_path ? (
                            <img src={`/storage/${producer.logo_path}`} alt="" className="size-14 rounded-full object-cover" />
                        ) : (
                            <span className="bg-olive-soft text-olive grid size-14 place-items-center rounded-full font-serif text-xl">
                                {producer.name.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </span>

                    {producer.rating ? (
                        <span className="flex items-center gap-1 text-sm">
                            <Star className="fill-gold text-gold size-4" />
                            <span className="font-semibold">{producer.rating.toFixed(1)}</span>
                            <span className="text-muted-foreground text-xs">({producer.reviews_count})</span>
                        </span>
                    ) : (
                        <span className="text-muted-foreground text-xs">Još nema utisaka</span>
                    )}
                </div>

                <h3 className="font-serif text-2xl leading-tight">
                    <Link href={href}>{producer.name}</Link>
                </h3>

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

                {producer.description && <p className="text-muted-foreground mt-3 line-clamp-2 text-sm leading-6">{producer.description}</p>}

                {producer.tags.length > 0 && (
                    <div className="mt-auto flex flex-wrap gap-2 pt-4">
                        {producer.tags.map((tag) => (
                            <span
                                key={tag}
                                className="bg-olive-soft text-olive rounded-full px-3 py-1 text-[0.68rem] font-semibold tracking-[0.08em] uppercase"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </article>
    );
}

export function HomeProductCard({ product }: { product: HomeProduct }) {
    return (
        <Link
            href={route('marketplace.products.show', product.slug)}
            className="group border-border/70 hover:border-border bg-background flex h-full flex-col overflow-hidden rounded-lg border transition-shadow duration-300 hover:shadow-lg"
        >
            <div className="bg-muted aspect-square overflow-hidden">
                {product.image ? (
                    <img
                        src={`/storage/${product.image}`}
                        alt={product.name}
                        loading="lazy"
                        className="image-warm size-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                ) : (
                    <span className="text-muted-foreground/40 grid size-full place-items-center">
                        <ImageOff className="size-8" />
                    </span>
                )}
            </div>

            <div className="flex flex-1 flex-col p-4">
                {product.producer.city && (
                    <p className="text-primary text-[0.65rem] font-semibold tracking-[0.12em] uppercase">{product.producer.city}</p>
                )}
                <h3 className="mt-1 font-serif text-lg leading-snug">{product.name}</h3>
                <p className="text-muted-foreground mt-1 text-xs">{product.producer.name}</p>
                <p className="mt-auto pt-4 font-serif text-xl">
                    {formatPrice(product.price)}
                    <span className="text-muted-foreground ml-1 font-sans text-xs">/ {product.unit}</span>
                </p>
            </div>
        </Link>
    );
}
