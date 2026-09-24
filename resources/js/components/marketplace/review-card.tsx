import { formatRelativeTime } from '@/lib/format';
import { type Review } from '@/types';
import { BadgeCheck, Clock, Star } from 'lucide-react';

export type ReviewWithAuthor = Review & { user: { name: string; avatar_path: string | null } };

/**
 * One impression, as everybody sees it.
 *
 * The same card renders a published review and the author's own review that
 * is still with a moderator - deliberately, so submitting one doesn't feel
 * like it vanished. The only difference is the line at the bottom saying it
 * is waiting; a review that has been approved simply stops showing it. The
 * date is when it was written, which is what its author remembers, not when
 * a moderator happened to get to it.
 */
export default function ReviewCard({ review, pending = false }: { review: ReviewWithAuthor; pending?: boolean }) {
    return (
        <article className="border-border border-b pb-4 last:border-b-0">
            <div className="flex gap-3">
                {review.user.avatar_path ? (
                    <img src={`/storage/${review.user.avatar_path}`} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                ) : (
                    <span className="bg-olive-soft text-olive grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold">
                        {review.user.name.charAt(0).toUpperCase()}
                    </span>
                )}

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium break-words">{review.user.name}</span>
                        <span className="text-olive bg-olive-soft flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold">
                            <BadgeCheck className="size-3" />
                            Provereni korisnik
                        </span>
                        <span className="text-gold flex items-center gap-0.5" aria-label={`Ocena ${review.rating} od 5`}>
                            {Array.from({ length: review.rating }).map((_, index) => (
                                <Star key={index} className="fill-gold size-3.5" />
                            ))}
                        </span>
                        <span className="text-muted-foreground text-xs">{formatRelativeTime(review.created_at)}</span>
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

                    {pending && (
                        <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
                            <Clock className="size-3.5 shrink-0" />
                            Čekamo odobrenje — nakon provere vaš utisak će biti objavljen.
                        </p>
                    )}
                </div>
            </div>
        </article>
    );
}
