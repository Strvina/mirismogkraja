import FavoriteButton from '@/components/favorite-button';
import { Button } from '@/components/ui/button';
import { deliveryMethodLabel } from '@/lib/delivery';
import { formatPrice } from '@/lib/format';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { type Producer, type Product, type Review, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { MapPin, MessageCircle, Star, Truck } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

export default function ProducerShow({
    producer,
    gallery,
    products,
    reviews,
    averageRating,
    canReview,
    canMessage,
    isFavorited,
}: {
    producer: Producer;
    gallery: { id: number; path: string; caption: string | null }[];
    products: Product[];
    reviews: (Review & { user: { name: string; avatar_path: string | null } })[];
    averageRating: number;
    canReview: boolean;
    canMessage: boolean;
    isFavorited: boolean;
}) {
    const { auth } = usePage<SharedData>().props;
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [phoneShown, setPhoneShown] = useState(false);

    const submitReview: FormEventHandler = (e) => {
        e.preventDefault();
        router.post(
            route('reviews.store', producer.id),
            { rating, comment, image },
            {
                forceFormData: true,
                onSuccess: () => {
                    setComment('');
                    setImage(null);
                },
            },
        );
    };

    return (
        <MarketplaceLayout>
            <Head title={producer.name} />

            {producer.cover_image_path && (
                <img
                    src={`/storage/${producer.cover_image_path}`}
                    alt={producer.name}
                    className="image-warm mt-6 aspect-[16/9] w-full rounded-md object-cover sm:aspect-[16/6]"
                />
            )}

            <div className="mt-6 flex flex-wrap items-start gap-4">
                {producer.logo_path && (
                    <img
                        src={`/storage/${producer.logo_path}`}
                        alt=""
                        className="size-14 shrink-0 rounded-full border object-cover sm:size-16"
                    />
                )}

                <div className="min-w-0 flex-1">
                    <h1 className="font-serif text-3xl break-words sm:text-4xl">{producer.name}</h1>
                    <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        {producer.city && (
                            <span className="flex items-center gap-1.5">
                                <MapPin className="size-4 shrink-0" />
                                {producer.city}
                            </span>
                        )}
                        {reviews.length > 0 && (
                            <span className="flex items-center gap-1">
                                <Star className="fill-gold text-gold size-4 shrink-0" />
                                {averageRating} ({reviews.length})
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    {canMessage && (
                        <Button asChild variant="outline" size="sm">
                            <Link href={route('messages.show', producer.slug)}>
                                <MessageCircle className="size-4" />
                                Pošalji poruku
                            </Link>
                        </Button>
                    )}
                    {auth.user && <FavoriteButton type="household" id={producer.id} isFavorited={isFavorited} />}
                </div>
            </div>

            {(producer.phone || producer.contact_email || producer.address) && (
                <div className="border-border/70 mt-6 grid gap-4 rounded-lg border p-5 text-sm sm:grid-cols-3">
                    {producer.phone && (
                        <div className="min-w-0">
                            <p className="text-muted-foreground text-xs">Telefon</p>
                            {phoneShown ? (
                                <a href={`tel:${producer.phone}`} className="font-medium break-words">
                                    {producer.phone}
                                </a>
                            ) : (
                                <button type="button" onClick={() => setPhoneShown(true)} className="text-primary font-medium underline">
                                    Prikaži broj
                                </button>
                            )}
                        </div>
                    )}
                    {producer.contact_email && (
                        <div className="min-w-0">
                            <p className="text-muted-foreground text-xs">Email</p>
                            <a href={`mailto:${producer.contact_email}`} className="font-medium break-all">
                                {producer.contact_email}
                            </a>
                        </div>
                    )}
                    {producer.address && (
                        <div className="min-w-0">
                            <p className="text-muted-foreground text-xs">Adresa</p>
                            <p className="font-medium break-words">{producer.address}</p>
                        </div>
                    )}
                </div>
            )}

            {producer.description && <p className="text-muted-foreground mt-6 max-w-2xl leading-7">{producer.description}</p>}

            {producer.delivery_methods && producer.delivery_methods.length > 0 && (
                <div className="mt-6 flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                        <Truck className="size-4" />
                        Način dostave:
                    </span>
                    {producer.delivery_methods.map((method) => (
                        <span key={method} className="bg-olive-soft text-olive rounded-full px-3 py-1 text-xs font-medium">
                            {deliveryMethodLabel(method)}
                        </span>
                    ))}
                </div>
            )}

            {producer.story && (
                <section className="mt-12 max-w-2xl">
                    <h2 className="font-serif text-2xl">Kako nastaje</h2>
                    <p className="text-muted-foreground mt-3 leading-7 break-words whitespace-pre-line">{producer.story}</p>
                </section>
            )}

            {gallery.length > 0 && (
                <section className="mt-12">
                    <h2 className="font-serif text-2xl">Galerija</h2>
                    <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                        {gallery.map((image) => (
                            <figure key={image.id} className="group">
                                <div className="bg-muted aspect-[4/3] overflow-hidden rounded-md">
                                    <img
                                        src={`/storage/${image.path}`}
                                        alt={image.caption ?? ''}
                                        loading="lazy"
                                        className="image-warm size-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                </div>
                                {image.caption && (
                                    <figcaption className="text-muted-foreground mt-2 text-xs leading-5">{image.caption}</figcaption>
                                )}
                            </figure>
                        ))}
                    </div>
                </section>
            )}

            <section className="mt-12">
                <h2 className="font-serif text-2xl">Proizvodi</h2>
                {products.length === 0 ? (
                    <p className="text-muted-foreground mt-2 text-sm">Ovaj proizvođač još nema objavljene proizvode.</p>
                ) : (
                    <div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-4">
                        {products.map((product) => (
                            <Link key={product.id} href={route('marketplace.products.show', product.slug)} className="group">
                                <div className="bg-muted aspect-square overflow-hidden rounded-md">
                                    {product.images?.[0] && (
                                        <img
                                            src={`/storage/${product.images[0].path}`}
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
            </section>

            <section className="mt-12 max-w-2xl">
                <h2 className="font-serif text-2xl">Ocene</h2>

                {reviews.length === 0 ? (
                    <p className="text-muted-foreground mt-2 text-sm">Ovaj proizvođač još nema ocena.</p>
                ) : (
                    <div className="mt-4 space-y-4">
                        {reviews.map((review) => (
                            <div key={review.id} className="border-border border-b pb-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-medium break-words">{review.user.name}</span>
                                    <span className="text-gold flex items-center gap-0.5">
                                        {Array.from({ length: review.rating }).map((_, i) => (
                                            <Star key={i} className="fill-gold size-3.5" />
                                        ))}
                                    </span>
                                </div>
                                {review.comment && <p className="text-muted-foreground mt-1 text-sm break-words">{review.comment}</p>}
                                {review.image_path && (
                                    <img
                                        src={`/storage/${review.image_path}`}
                                        alt="Slika uz utisak kupca"
                                        loading="lazy"
                                        className="mt-3 max-h-48 w-full max-w-xs rounded-md object-cover"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {canReview && (
                    <form onSubmit={submitReview} className="mt-6 space-y-3">
                        <select
                            value={rating}
                            onChange={(e) => setRating(Number(e.target.value))}
                            className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                        >
                            {[5, 4, 3, 2, 1].map((n) => (
                                <option key={n} value={n}>
                                    {n} zvezdica
                                </option>
                            ))}
                        </select>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Podeli svoj utisak..."
                            className="border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm"
                        />
                        <div className="grid gap-1.5">
                            <label htmlFor="review-image" className="text-muted-foreground text-xs">
                                Slika proizvoda koji si dobio/la (opciono)
                            </label>
                            <input
                                id="review-image"
                                type="file"
                                accept="image/*"
                                onChange={(e) => setImage(e.target.files?.[0] ?? null)}
                                className="border-input bg-background w-full max-w-xs rounded-md border px-3 py-2 text-sm"
                            />
                        </div>
                        <Button>Ostavi ocenu</Button>
                    </form>
                )}

                {!canReview && auth.user && (
                    <p className="text-muted-foreground mt-4 text-xs">
                        Ocenu možeš ostaviti nakon što ti porudžbina od ovog proizvođača bude isporučena.
                    </p>
                )}
            </section>
        </MarketplaceLayout>
    );
}
