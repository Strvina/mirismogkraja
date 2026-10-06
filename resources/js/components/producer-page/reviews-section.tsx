import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import ReviewCard, { type ReviewWithAuthor } from '@/components/marketplace/review-card';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { shrinkImage } from '@/lib/shrink-image';
import { router } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

/** Writing a review, for someone the producer has already answered. Published after moderation. */
function ReviewForm({ producerId }: { producerId: number }) {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [image, setImage] = useState<File | null>(null);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        router.post(
            route('reviews.store', producerId),
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
        <form onSubmit={submit} className="border-border/70 mt-6 space-y-3 rounded-lg border p-5">
            <div>
                <h3 className="font-serif text-xl">{t('Ostavi utisak')}</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                    {t('Utisak može da ostavi neko sa kim se proizvođač već dopisivao. Objavljujemo ga pošto ga pregledamo.')}
                </p>
            </div>
            <div className="grid gap-1.5">
                <label htmlFor="review-rating" className="text-muted-foreground text-xs">
                    {t('Vaša ocena')}
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
                placeholder={t('Kako je prošlo? Napišite par rečenica...')}
                aria-label={t('Vaš utisak')}
                className="border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm"
            />
            <div className="grid gap-1.5">
                <label htmlFor="review-image" className="text-muted-foreground text-xs">
                    {t('Slika onoga što ste dobili (nije obavezno)')}
                </label>
                <input
                    id="review-image"
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                        const file = e.target.files?.[0];
                        setImage(file ? await shrinkImage(file) : null);
                    }}
                    className="border-input bg-background w-full max-w-xs rounded-md border px-3 py-2 text-sm"
                />
            </div>
            <Button>{t('Pošalji utisak')}</Button>
        </form>
    );
}

/** What buyers say about the producer, the producer's replies, and the visitor's own review. */
export default function ReviewsSection({
    producer,
    reviews,
    myPendingReview,
    canReview,
    canReply,
    signedIn,
}: {
    producer: { id: number; name: string };
    reviews: Paginated<ReviewWithAuthor>;
    myPendingReview: ReviewWithAuthor | null;
    canReview: boolean;
    canReply: boolean;
    signedIn: boolean;
}) {
    return (
        <section id="utisci" className="mt-12 max-w-2xl scroll-mt-28">
            <h2 className="font-serif text-2xl">{t('Utisci kupaca')}</h2>

            {/* The author's own review, still with a moderator, sits where it
                will live once published - same card, same place - so sending
                it never looks like losing it. */}
            {myPendingReview && (
                <div className="mt-4">
                    <ReviewCard review={myPendingReview} pending />
                </div>
            )}

            {reviews.total === 0 ? (
                !myPendingReview && <p className="text-muted-foreground mt-2 text-sm">{t('Još niko nije ostavio utisak o ovom proizvođaču.')}</p>
            ) : (
                <div className="mt-4 space-y-4">
                    {reviews.data.map((review) => (
                        <ReviewCard key={review.id} review={review} producerName={producer.name} canReply={canReply} />
                    ))}
                    <Pagination meta={reviews} />
                </div>
            )}

            {canReview && <ReviewForm producerId={producer.id} />}

            {!canReview && !myPendingReview && (
                <p className="text-muted-foreground mt-6 text-sm">
                    {signedIn
                        ? t('Utisak možete ostaviti kada vam se proizvođač javi na vašu poruku.')
                        : t('Utiske ostavljaju prijavljeni korisnici koji su se dopisivali sa proizvođačem.')}
                </p>
            )}
        </section>
    );
}
