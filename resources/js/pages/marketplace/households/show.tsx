import FavoriteButton from '@/components/favorite-button';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
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
        router.post(route('reviews.store', household.id), { rating, comment }, { onSuccess: () => setComment('') });
    };

    return (
        <MarketplaceLayout>
            <Head title={household.name} />

            {household.cover_image_path && (
                <img
                    src={`/storage/${household.cover_image_path}`}
                    alt={household.name}
                    className="image-warm mt-6 aspect-[16/6] w-full rounded-md object-cover"
                />
            )}

            <div className="mt-6 flex items-center gap-4">
                {household.logo_path && <img src={`/storage/${household.logo_path}`} alt="" className="size-16 rounded-full border object-cover" />}
                <div className="flex-1">
                    <h1 className="font-serif text-4xl">{household.name}</h1>
                    <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-3 text-sm">
                        {household.city && (
                            <span className="flex items-center gap-1.5">
                                <MapPin className="size-4" />
                                {household.city}
                            </span>
                        )}
                        {reviews.length > 0 && (
                            <span className="flex items-center gap-1">
                                <Star className="fill-gold text-gold size-4" />
                                {averageRating} ({reviews.length})
                            </span>
                        )}
                    </div>
                </div>
                {auth.user && <FavoriteButton type="household" id={household.id} isFavorited={isFavorited} />}
            </div>

            {household.description && <p className="text-muted-foreground mt-6 max-w-2xl leading-7">{household.description}</p>}

            <section className="mt-12">
                <h2 className="font-serif text-2xl">Proizvodi</h2>
                {products.length === 0 ? (
                    <p className="text-muted-foreground mt-2 text-sm">Ovo domaćinstvo još nema objavljene proizvode.</p>
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
                                <p className="mt-2 text-sm font-medium">{product.name}</p>
                                <p className="text-muted-foreground text-sm">{product.price} RSD</p>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            <section className="mt-12 max-w-2xl">
                <h2 className="font-serif text-2xl">Ocene</h2>

                {reviews.length === 0 ? (
                    <p className="text-muted-foreground mt-2 text-sm">Ovo domaćinstvo još nema ocena.</p>
                ) : (
                    <div className="mt-4 space-y-4">
                        {reviews.map((review) => (
                            <div key={review.id} className="border-border border-b pb-4">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{review.user.name}</span>
                                    <span className="text-gold flex items-center gap-0.5">
                                        {Array.from({ length: review.rating }).map((_, i) => (
                                            <Star key={i} className="fill-gold size-3.5" />
                                        ))}
                                    </span>
                                </div>
                                {review.comment && <p className="text-muted-foreground mt-1 text-sm">{review.comment}</p>}
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
                        <Button>Ostavi ocenu</Button>
                    </form>
                )}

                {!canReview && auth.user && (
                    <p className="text-muted-foreground mt-4 text-xs">
                        Ocenu možeš ostaviti nakon što ti porudžbina od ovog domaćinstva bude isporučena.
                    </p>
                )}
            </section>
        </MarketplaceLayout>
    );
}
