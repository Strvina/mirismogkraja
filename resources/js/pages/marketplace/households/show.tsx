import FavoriteButton from '@/components/favorite-button';
import { Button } from '@/components/ui/button';
import { type Household, type Product, type Review, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { MapPin, Star } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

export default function HouseholdShow({
    household,
    products,
    reviews,
    averageRating,
    canReview,
    isFavorited,
}: {
    household: Household;
    products: Product[];
    reviews: (Review & { user: { name: string } })[];
    averageRating: number;
    canReview: boolean;
    isFavorited: boolean;
}) {
    const { auth } = usePage<SharedData>().props;
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');

    const submitReview: FormEventHandler = (e) => {
        e.preventDefault();
        router.post(
            route('reviews.store', household.id),
            { rating, comment },
            { onSuccess: () => setComment('') },
        );
    };

    return (
        <>
            <Head title={household.name} />

            <main className="min-h-screen bg-background paper-grain">
                <div className="mx-auto max-w-[1380px] px-5 py-12 sm:px-8 lg:px-12">
                    <Link href="/" className="text-sm font-semibold text-primary">
                        ← Vrelina juga
                    </Link>

                    {household.cover_image_path && (
                        <img
                            src={`/storage/${household.cover_image_path}`}
                            alt={household.name}
                            className="image-warm mt-6 aspect-[16/6] w-full rounded-md object-cover"
                        />
                    )}

                    <div className="mt-6 flex items-center gap-4">
                        {household.logo_path && (
                            <img
                                src={`/storage/${household.logo_path}`}
                                alt=""
                                className="size-16 rounded-full border object-cover"
                            />
                        )}
                        <div className="flex-1">
                            <h1 className="font-serif text-4xl">{household.name}</h1>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                {household.city && (
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="size-4" />
                                        {household.city}
                                    </span>
                                )}
                                {reviews.length > 0 && (
                                    <span className="flex items-center gap-1">
                                        <Star className="size-4 fill-gold text-gold" />
                                        {averageRating} ({reviews.length})
                                    </span>
                                )}
                            </div>
                        </div>
                        {auth.user && <FavoriteButton type="household" id={household.id} isFavorited={isFavorited} />}
                    </div>

                    {household.description && (
                        <p className="mt-6 max-w-2xl leading-7 text-muted-foreground">{household.description}</p>
                    )}

                    <section className="mt-12">
                        <h2 className="font-serif text-2xl">Proizvodi</h2>
                        {products.length === 0 ? (
                            <p className="mt-2 text-sm text-muted-foreground">Ovo domaćinstvo još nema objavljene proizvode.</p>
                        ) : (
                            <div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-4">
                                {products.map((product) => (
                                    <Link key={product.id} href={route('marketplace.products.show', product.slug)} className="group">
                                        <div className="aspect-square overflow-hidden rounded-md bg-muted">
                                            {product.images?.[0] && (
                                                <img
                                                    src={`/storage/${product.images[0].path}`}
                                                    alt={product.name}
                                                    className="image-warm size-full object-cover transition group-hover:scale-105"
                                                />
                                            )}
                                        </div>
                                        <p className="mt-2 text-sm font-medium">{product.name}</p>
                                        <p className="text-sm text-muted-foreground">{product.price} RSD</p>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="mt-12 max-w-2xl">
                        <h2 className="font-serif text-2xl">Ocene</h2>

                        {reviews.length === 0 ? (
                            <p className="mt-2 text-sm text-muted-foreground">Ovo domaćinstvo još nema ocena.</p>
                        ) : (
                            <div className="mt-4 space-y-4">
                                {reviews.map((review) => (
                                    <div key={review.id} className="border-b border-border pb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{review.user.name}</span>
                                            <span className="flex items-center gap-0.5 text-gold">
                                                {Array.from({ length: review.rating }).map((_, i) => (
                                                    <Star key={i} className="size-3.5 fill-gold" />
                                                ))}
                                            </span>
                                        </div>
                                        {review.comment && <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p>}
                                    </div>
                                ))}
                            </div>
                        )}

                        {canReview && (
                            <form onSubmit={submitReview} className="mt-6 space-y-3">
                                <select
                                    value={rating}
                                    onChange={(e) => setRating(Number(e.target.value))}
                                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                                    className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                                <Button>Ostavi ocenu</Button>
                            </form>
                        )}

                        {!canReview && auth.user && (
                            <p className="mt-4 text-xs text-muted-foreground">
                                Ocenu možeš ostaviti nakon što ti porudžbina od ovog domaćinstva bude isporučena.
                            </p>
                        )}
                    </section>
                </div>
            </main>
        </>
    );
}
