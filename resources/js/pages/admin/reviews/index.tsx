import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import { Button } from '@/components/ui/button';
import AdminLayout from '@/layouts/admin-layout';
import { ask } from '@/lib/confirm';
import { formatRelativeTime } from '@/lib/format';
import { t, tx } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { type Producer, type Review, type User } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Check, Star, X } from 'lucide-react';

type ReviewWithRelations = Review & { user: User; producer: Producer };

type Status = 'pending' | 'approved' | 'rejected';

const TABS: { status: Status; label: string }[] = [
    { status: 'pending', label: tx('Čekaju odobrenje') },
    { status: 'approved', label: tx('Objavljeni') },
    { status: 'rejected', label: tx('Odbijeni') },
];

/**
 * Moderation queue. Reviews are written by buyers a producer has already
 * replied to, but that's no guarantee of a civil tone - nothing reaches a
 * producer's public page until it's approved here.
 */
export default function AdminReviewsIndex({
    reviews,
    filters,
    counts,
}: {
    reviews: Paginated<ReviewWithRelations>;
    filters: { status: Status };
    counts: Record<Status, number>;
}) {
    const approve = (review: Review) => router.patch(route('admin.reviews.approve', review.id), {}, { preserveScroll: true });
    const reject = (review: Review) => router.patch(route('admin.reviews.reject', review.id), {}, { preserveScroll: true });

    const destroy = async (review: Review) => {
        if (await ask({ title: t('Trajno obrisati ovaj utisak?'), description: t('Ova radnja se ne može poništiti.'), tone: 'danger' })) {
            router.delete(route('admin.reviews.destroy', review.id), { preserveScroll: true });
        }
    };

    return (
        <AdminLayout title={t('Utisci')}>
            <Head title={t('Utisci')} />

            <div className="border-border/70 flex flex-wrap gap-1 border-b pb-3">
                {TABS.map((tab) => (
                    <Link
                        key={tab.status}
                        href={route('admin.reviews.index', { status: tab.status })}
                        preserveScroll
                        className={cn(
                            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            filters.status === tab.status ? 'bg-olive-soft text-olive' : 'text-muted-foreground hover:bg-muted',
                        )}
                    >
                        {t(tab.label)}
                        <span
                            className={cn(
                                'rounded-full px-1.5 py-0.5 text-[0.65rem] tabular-nums',
                                tab.status === 'pending' && counts.pending > 0
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground',
                            )}
                        >
                            {counts[tab.status]}
                        </span>
                    </Link>
                ))}
            </div>

            {reviews.data.length === 0 ? (
                <p className="text-muted-foreground mt-6 text-sm">
                    {filters.status === 'pending' ? t('Nema utisaka koji čekaju odobrenje.') : t('Ovde još nema ničega.')}
                </p>
            ) : (
                <div className="mt-6 space-y-3">
                    {reviews.data.map((review) => (
                        <div key={review.id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl border p-4">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-medium">{review.user.name}</span>
                                    <span className="text-muted-foreground text-xs">
                                        o proizvođaču{' '}
                                        <a
                                            href={route('marketplace.producers.show', review.producer.slug)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="underline underline-offset-2"
                                        >
                                            {review.producer.name}
                                        </a>
                                    </span>
                                    <span className="text-gold flex items-center gap-0.5" aria-label={`Ocena ${review.rating} od 5`}>
                                        {Array.from({ length: review.rating }).map((_, i) => (
                                            <Star key={i} className="fill-gold size-3.5" />
                                        ))}
                                    </span>
                                    <span className="text-muted-foreground text-xs">
                                        napisan {formatRelativeTime(review.created_at)}
                                        {review.approved_at && ` · objavljen ${formatRelativeTime(review.approved_at)}`}
                                    </span>
                                </div>

                                {review.comment && <p className="text-muted-foreground mt-1.5 text-sm break-words">{review.comment}</p>}

                                {review.image_path && (
                                    <img
                                        src={`/storage/${review.image_path}`}
                                        alt={t('Slika uz utisak')}
                                        loading="lazy"
                                        className="mt-3 max-h-40 rounded-md object-cover"
                                    />
                                )}
                            </div>

                            <div className="flex shrink-0 flex-wrap gap-2">
                                {review.status !== 'approved' && (
                                    <Button size="sm" onClick={() => approve(review)}>
                                        <Check className="size-4" />
                                        {t('Objavi')}
                                    </Button>
                                )}
                                {review.status !== 'rejected' && (
                                    <Button variant="outline" size="sm" onClick={() => reject(review)}>
                                        <X className="size-4" />
                                        {t('Odbij')}
                                    </Button>
                                )}
                                <Button variant="destructive" size="sm" onClick={() => destroy(review)}>
                                    {t('Obriši')}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Pagination meta={reviews} />
        </AdminLayout>
    );
}
