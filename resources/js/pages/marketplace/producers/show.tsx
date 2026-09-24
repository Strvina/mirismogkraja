import FavoriteButton from '@/components/favorite-button';
import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { deliveryMethodLabel } from '@/lib/delivery';
import { formatPrice, formatRelativeTime } from '@/lib/format';
import { type Producer, type Product, type Review, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { BadgeCheck, Clock, MapPin, MessageCircle, Star, Truck } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

export default function ProducerShow({
    producer,
    gallery,
    products,
    reviews,
    averageRating,
    canReview,
    myPendingReview,
    canMessage,
    isFavorited,
}: {
    producer: Producer;
    gallery: { id: number; path: string; caption: string | null }[];
    products: Product[];
    reviews: Paginated<Review & { user: { name: string; avatar_path: string | null } }>;
    averageRating: number;
    canReview: boolean;
    myPendingReview: boolean;
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
                    <img src={`/storage/${producer.logo_path}`} alt="" className="size-14 shrink-0 rounded-full border object-cover sm:size-16" />
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
                        {reviews.total > 0 && (
                            <span className="flex items-center gap-1">
                                <Star className="fill-gold text-gold size-4 shrink-0" />
                                {averageRating} ({reviews.total})
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
                                {image.caption && <figcaption className="text-muted-foreground mt-2 text-xs leading-5">{image.caption}</figcaption>}
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
                <h2 className="font-serif text-2xl">Utisci kupaca</h2>

                {reviews.total === 0 ? (
                    <p className="text-muted-foreground mt-2 text-sm">Još niko nije ostavio utisak o ovom proizvođaču.</p>
                ) : (
                    <div className="mt-4 space-y-4">
                        {reviews.data.map((review) => (
                            <div key={review.id} className="border-border border-b pb-4">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className="font-medium break-words">{review.user.name}</span>
                                    <span className="text-olive bg-olive-soft flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold">
                                        <BadgeCheck className="size-3" />
                                        Provereni korisnik
                                    </span>
                                    <span className="text-gold flex items-center gap-0.5" aria-label={`Ocena ${review.rating} od 5`}>
                                        {Array.from({ length: review.rating }).map((_, i) => (
                                            <Star key={i} className="fill-gold size-3.5" />
                                        ))}
                                    </span>
                                    <span className="text-muted-foreground text-xs">{formatRelativeTime(review.approved_at)}</span>
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
                        <Pagination meta={reviews} />
                    </div>
                )}

                {/* An impression that is still with a moderator is invisible
                    above, so say so - otherwise it reads as if it was lost. */}
                {myPendingReview && (
                    <p className="border-border/70 bg-muted/50 text-muted-foreground mt-6 flex items-start gap-2 rounded-md border p-4 text-sm">
                        <Clock className="mt-0.5 size-4 shrink-0" />
                        Vaš utisak čeka odobrenje. Objavićemo ga čim ga pregledamo.
                    </p>
                )}

                {canReview && (
                    <form onSubmit={submitReview} className="border-border/70 mt-6 space-y-3 rounded-lg border p-5">
                        <div>
                            <h3 className="font-serif text-xl">Ostavi utisak</h3>
                            <p className="text-muted-foreground mt-1 text-sm">
                                Utisak može da ostavi neko sa kim se proizvođač već dopisivao. Objavljujemo ga pošto ga pregledamo.
                            </p>
                        </div>
                        <div className="grid gap-1.5">
                            <label htmlFor="review-rating" className="text-muted-foreground text-xs">
                                Vaša ocena
                            </label>
                            <select
                                id="review-rating"
                                value={rating}
                                onChange={(e) => setRating(Number(e.target.value))}
                                className="border-input bg-background w-fit rounded-md border px-3 py-2 text-sm"
                            >
                                {[5, 4, 3, 2, 1].map((n) => (
                                    <option key={n} value={n}>
                                        {'★'.repeat(n)} ({n})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Kako je prošlo? Napišite par rečenica..."
                            aria-label="Vaš utisak"
                            className="border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm"
                        />
                        <div className="grid gap-1.5">
                            <label htmlFor="review-image" className="text-muted-foreground text-xs">
                                Slika onoga što ste dobili (nije obavezno)
                            </label>
                            <input
                                id="review-image"
                                type="file"
                                accept="image/*"
                                onChange={(e) => setImage(e.target.files?.[0] ?? null)}
                                className="border-input bg-background w-full max-w-xs rounded-md border px-3 py-2 text-sm"
                            />
                        </div>
                        <Button>Pošalji utisak</Button>
                    </form>
                )}

                {!canReview && !myPendingReview && (
                    <p className="text-muted-foreground mt-6 text-sm">
                        {auth.user
                            ? 'Utisak možete ostaviti kada vam se proizvođač javi na vašu poruku.'
                            : 'Utiske ostavljaju prijavljeni korisnici koji su se dopisivali sa proizvođačem.'}
                    </p>
                )}
            </section>
        </MarketplaceLayout>
    );
}
