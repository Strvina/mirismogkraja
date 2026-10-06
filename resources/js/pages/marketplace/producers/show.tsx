import { type Paginated } from '@/components/marketplace/pagination';
import PauseNotice, { type Pause } from '@/components/marketplace/pause-notice';
import { type ResponseTimeBucket } from '@/components/marketplace/response-time-badge';
import { type ReviewWithAuthor } from '@/components/marketplace/review-card';
import ShareButtons from '@/components/marketplace/share-buttons';
import CertificateList, { type PublicCertificate } from '@/components/producer-page/certificate-list';
import ContactCard from '@/components/producer-page/contact-card';
import LocationLinks from '@/components/producer-page/location-links';
import MarketList from '@/components/producer-page/market-list';
import ProducerHeader from '@/components/producer-page/producer-header';
import ProducerPosts from '@/components/producer-page/producer-posts';
import { ProducerGallery, ProducerProducts } from '@/components/producer-page/producer-showcase';
import ReviewsSection from '@/components/producer-page/reviews-section';
import { type PublicProducer } from '@/components/producer-page/types';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { deliveryMethodLabel } from '@/lib/delivery';
import { t } from '@/lib/i18n';
import { mediaUrl } from '@/lib/media';
import { type PostSummary, type ProducerMarket, type Product, type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Truck } from 'lucide-react';

/** A producer's public page: who they are, how to reach them, what they make, what buyers say. */
export default function ProducerShow({
    producer,
    gallery,
    markets,
    certificates,
    posts,
    products,
    productsCount,
    reviews,
    averageRating,
    isPremium,
    place,
    pause,
    responseTime,
    canReview,
    myPendingReview,
    canReply,
    canMessage,
    canFollow,
    isFollowing,
    followersCount,
    canReport,
    reportReasons,
    isFavorited,
    phone,
}: {
    producer: PublicProducer;
    /** Only after "Prikaži broj": fetched by a partial reload, never in the page's HTML. */
    phone?: string | null;
    gallery: { id: number; path: string; caption: string | null }[];
    markets: ProducerMarket[];
    /** Approved and in date; the documents themselves are never sent. */
    certificates: PublicCertificate[];
    /** The latest few stories and recipes. */
    posts: PostSummary[];
    products: Pick<Product, 'id' | 'name' | 'slug' | 'price' | 'unit' | 'images'>[];
    /** All of the producer's published products; more than are shown above. */
    productsCount: number;
    reviews: Paginated<ReviewWithAuthor>;
    averageRating: number;
    isPremium: boolean;
    /** The producer's town as a page of its own, when it has one. */
    place: { slug: string; name: string } | null;
    /** Sold out or away: no new inquiries until they are back. */
    pause: Pause | null;
    responseTime: ResponseTimeBucket | null;
    canReview: boolean;
    myPendingReview: ReviewWithAuthor | null;
    canReply: boolean;
    canMessage: boolean;
    canFollow: boolean;
    isFollowing: boolean;
    followersCount: number;
    canReport: boolean;
    reportReasons: Record<string, string>;
    isFavorited: boolean;
}) {
    const { auth } = usePage<SharedData>().props;

    return (
        <MarketplaceLayout>
            <Head title={producer.name} />

            {producer.cover_image_path && (
                <img
                    src={mediaUrl(producer.cover_image_path)}
                    alt={producer.name}
                    // The largest thing on the first screen (and preloaded by the server).
                    fetchPriority="high"
                    className="image-warm mt-6 aspect-[16/9] w-full rounded-md object-cover sm:aspect-[16/6]"
                />
            )}

            <ProducerHeader
                producer={producer}
                isPremium={isPremium}
                responseTime={responseTime}
                averageRating={averageRating}
                reviewCount={reviews.total}
                followersCount={followersCount}
                isFollowing={isFollowing}
                canFollow={canFollow}
                canMessage={canMessage}
                canFavorite={Boolean(auth.user)}
                isFavorited={isFavorited}
                canReport={canReport}
                reportReasons={reportReasons}
                place={place}
            />

            {pause && (
                <PauseNotice pause={pause} className="mt-5 max-w-2xl">
                    {canFollow && (
                        <p className="text-muted-foreground">
                            {isFollowing
                                ? t('Pratite ovog proizvođača — javićemo vam kad se vrati.')
                                : t('Zapratite proizvođača i javićemo vam kad se vrati.')}
                        </p>
                    )}
                </PauseNotice>
            )}

            <div className="mt-4">
                <ShareButtons url={typeof window === 'undefined' ? '' : window.location.href} title={producer.name} />
            </div>

            <ContactCard producer={producer} phone={phone} />
            <LocationLinks producer={producer} />

            {producer.description && <p className="text-muted-foreground mt-6 max-w-2xl leading-7">{producer.description}</p>}

            {producer.delivery_methods && producer.delivery_methods.length > 0 && (
                <div className="mt-6 flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                        <Truck className="size-4" />
                        {t('Način dostave:')}
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
                    <h2 className="font-serif text-2xl">{t('Kako nastaje')}</h2>
                    <p className="text-muted-foreground mt-3 leading-7 break-words whitespace-pre-line">{producer.story}</p>
                </section>
            )}

            <CertificateList certificates={certificates} />
            <MarketList markets={markets} />
            <ProducerGallery images={gallery} />
            <ProducerProducts producerId={producer.id} producerSlug={producer.slug} products={products} total={productsCount} />
            <ProducerPosts posts={posts} producerSlug={producer.slug} />
            <ReviewsSection
                producer={producer}
                reviews={reviews}
                myPendingReview={myPendingReview}
                canReview={canReview}
                canReply={canReply}
                signedIn={Boolean(auth.user)}
            />
        </MarketplaceLayout>
    );
}
