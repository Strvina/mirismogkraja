import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/format';
import { t } from '@/lib/i18n';
import { thumbUrl } from '@/lib/media';
import { type Review } from '@/types';
import { router } from '@inertiajs/react';
import { BadgeCheck, Clock, CornerDownRight, Star } from 'lucide-react';
import { useState } from 'react';

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
export default function ReviewCard({
    review,
    pending = false,
    producerName,
    canReply = false,
}: {
    review: ReviewWithAuthor;
    pending?: boolean;
    /** Shown above the producer's answer. */
    producerName?: string;
    /** The producer's own page, seen by its owner. */
    canReply?: boolean;
}) {
    const [editing, setEditing] = useState(false);
    const [reply, setReply] = useState(review.reply ?? '');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const saveReply = () =>
        router.put(
            route('reviews.reply', review.id),
            { reply },
            {
                preserveScroll: true,
                onStart: () => {
                    setSaving(true);
                    setErrors({});
                },
                onError: setErrors,
                onFinish: () => setSaving(false),
                onSuccess: () => setEditing(false),
            },
        );

    return (
        <article className="border-border border-b pb-4 last:border-b-0">
            <div className="flex gap-3">
                {review.user.avatar_path ? (
                    <img loading="lazy" src={thumbUrl(review.user.avatar_path)} alt="" className="size-9 shrink-0 rounded-full object-cover" />
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
                            {t('Provereni korisnik')}
                        </span>
                        <span className="text-gold flex items-center gap-0.5" aria-label={t('Ocena :rating od 5', { rating: review.rating })}>
                            {Array.from({ length: review.rating }).map((_, index) => (
                                <Star key={index} className="fill-gold size-3.5" />
                            ))}
                        </span>
                        <span className="text-muted-foreground text-xs">{formatRelativeTime(review.created_at)}</span>
                    </div>

                    {review.comment && <p className="text-muted-foreground mt-1 text-sm break-words">{review.comment}</p>}

                    {review.image_path && (
                        <img
                            src={thumbUrl(review.image_path)}
                            alt={t('Slika uz utisak kupca')}
                            loading="lazy"
                            className="mt-3 max-h-48 w-full max-w-xs rounded-md object-cover"
                        />
                    )}

                    {review.reply && !editing && (
                        <div className="border-primary/30 bg-muted/40 mt-3 rounded-md border-l-2 px-3 py-2 text-sm">
                            <p className="flex items-center gap-1.5 text-xs font-semibold">
                                <CornerDownRight className="size-3.5" aria-hidden />
                                {producerName ? t('Odgovor proizvođača „:name”', { name: producerName }) : t('Odgovor proizvođača')}
                            </p>
                            <p className="text-muted-foreground mt-1 break-words whitespace-pre-line">{review.reply}</p>
                        </div>
                    )}

                    {canReply &&
                        (editing ? (
                            <div className="mt-3 grid gap-2">
                                {Object.entries(errors).map(([field, message]) => (
                                    <p key={field} role="alert" className="text-destructive text-sm">
                                        {message}
                                    </p>
                                ))}
                                <textarea
                                    value={reply}
                                    onChange={(event) => setReply(event.target.value)}
                                    maxLength={1000}
                                    rows={3}
                                    aria-label={t('Vaš odgovor')}
                                    placeholder={t('Zahvalite se kupcu ili objasnite svoju stranu — odgovor vide svi.')}
                                    className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                                />
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={saveReply} disabled={saving}>
                                        {t('Objavi odgovor')}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                                        {t('Otkaži')}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setEditing(true)}
                                className="text-primary mt-2 text-xs font-medium underline-offset-4 hover:underline"
                            >
                                {review.reply ? t('Izmeni odgovor') : t('Odgovori na utisak')}
                            </button>
                        ))}

                    {pending && (
                        <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
                            <Clock className="size-3.5 shrink-0" />
                            {t('Čekamo odobrenje — nakon provere vaš utisak će biti objavljen.')}
                        </p>
                    )}
                </div>
            </div>
        </article>
    );
}
