import FavoriteButton from '@/components/favorite-button';
import InfoHint from '@/components/info-hint';
import { PremiumBadge } from '@/components/marketplace/plan-badges';
import ReportButton from '@/components/marketplace/report-button';
import ResponseTimeBadge, { type ResponseTimeBucket } from '@/components/marketplace/response-time-badge';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { thumbUrl } from '@/lib/media';
import { Link, router } from '@inertiajs/react';
import { BadgeCheck, Bell, BellRing, MapPin, MessageCircle, Star } from 'lucide-react';
import { type PublicProducer } from './types';

/**
 * Who the producer is at a glance - name, the marks they have earned, where
 * they are, how quickly they answer, how they are rated - and what a
 * visitor can do: follow, write, save, report.
 */
export default function ProducerHeader({
    producer,
    isPremium,
    responseTime,
    averageRating,
    reviewCount,
    followersCount,
    isFollowing,
    canFollow,
    canMessage,
    canFavorite,
    isFavorited,
    canReport,
    reportReasons,
    place,
}: {
    /** The producer's town as a page of its own, when it has one. */
    place: { slug: string; name: string } | null;
    producer: PublicProducer;
    isPremium: boolean;
    responseTime: ResponseTimeBucket | null;
    averageRating: number;
    reviewCount: number;
    followersCount: number;
    isFollowing: boolean;
    canFollow: boolean;
    canMessage: boolean;
    canFavorite: boolean;
    isFavorited: boolean;
    canReport: boolean;
    reportReasons: Record<string, string>;
}) {
    const founding = producer.founding_number !== null;

    return (
        <div className="mt-6 flex flex-wrap items-start gap-4">
            {producer.logo_path && (
                <img src={thumbUrl(producer.logo_path)} alt="" className="size-14 shrink-0 rounded-full border object-cover sm:size-16" />
            )}

            <div className="min-w-0 flex-1">
                <h1 className="flex flex-wrap items-center gap-2 font-serif text-3xl break-words sm:text-4xl">
                    {producer.name}
                    {producer.verified_at && (
                        <span
                            title={t('Identitet proizvođača je proveren')}
                            className="text-olive bg-olive-soft flex items-center gap-1 rounded-full px-2.5 py-1 font-sans text-xs font-semibold"
                        >
                            <BadgeCheck className="size-3.5" />
                            {t('Provereno')}
                        </span>
                    )}
                    {isPremium && <PremiumBadge className="py-1" />}
                    {(producer.verified_at || isPremium || founding) && (
                        <InfoHint label={t('Šta znače oznake?')} title={t('Oznake na profilu')}>
                            {producer.verified_at && (
                                <p>
                                    <strong>{t('Provereno')}</strong> {t('— proverili smo ko stoji iza ovog proizvođača.')}
                                </p>
                            )}
                            {isPremium && (
                                <p>
                                    <strong>Premium</strong> {t('— proizvođač ima plaćeno Premium ili Pro članstvo na sajtu.')}
                                </p>
                            )}
                            {founding && (
                                <p>
                                    <strong>{t('Osnivač')}</strong>{' '}
                                    {t('— jedan od prvih proizvođača na sajtu; broj označava redosled pridruživanja.')}
                                </p>
                            )}
                        </InfoHint>
                    )}
                </h1>
                <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    {producer.city && (
                        <span className="flex items-center gap-1.5">
                            <MapPin className="size-4 shrink-0" />
                            {place ? (
                                <Link
                                    href={route('marketplace.places.show', place.slug)}
                                    className="hover:text-foreground underline-offset-4 hover:underline"
                                >
                                    {producer.city}
                                </Link>
                            ) : (
                                producer.city
                            )}
                        </span>
                    )}
                    <ResponseTimeBadge bucket={responseTime} />
                    {reviewCount > 0 && (
                        <span className="flex items-center gap-1">
                            <Star className="fill-gold text-gold size-4 shrink-0" />
                            {averageRating} ({reviewCount})
                        </span>
                    )}
                    {followersCount > 0 && <span>{followersCount === 1 ? t('1 pratilac') : t(':count pratilaca', { count: followersCount })}</span>}
                    {founding && (
                        <Link
                            href={route('marketplace.founding')}
                            className="text-gold border-gold/40 rounded-full border px-2 py-0.5 text-xs font-semibold"
                        >
                            {t('Osnivač #:number', { number: String(producer.founding_number).padStart(2, '0') })}
                        </Link>
                    )}
                </div>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                {canFollow && (
                    <Button
                        variant={isFollowing ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => router.post(route('producers.follow', producer.id), {}, { preserveScroll: true })}
                    >
                        {isFollowing ? <BellRing className="size-4" /> : <Bell className="size-4" />}
                        {isFollowing ? t('Pratite') : t('Zaprati')}
                    </Button>
                )}
                {canMessage && (
                    <Button asChild variant="outline" size="sm">
                        <Link href={route('messages.show', producer.slug)}>
                            <MessageCircle className="size-4" />
                            {t('Pošalji poruku')}
                        </Link>
                    </Button>
                )}
                {canFavorite && <FavoriteButton type="producer" id={producer.id} isFavorited={isFavorited} />}
                {canReport && <ReportButton type="producer" id={producer.id} reasons={reportReasons} />}
            </div>
        </div>
    );
}
