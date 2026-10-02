import FavoriteButton from '@/components/favorite-button';
import InfoHint from '@/components/info-hint';
import { PointsMap } from '@/components/marketplace/map';
import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import { PremiumBadge } from '@/components/marketplace/plan-badges';
import ReportButton from '@/components/marketplace/report-button';
import ReviewCard, { type ReviewWithAuthor } from '@/components/marketplace/review-card';
import ShareButtons from '@/components/marketplace/share-buttons';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { deliveryMethodLabel } from '@/lib/delivery';
import { formatPrice } from '@/lib/format';
import { t } from '@/lib/i18n';
import { mediaUrl, thumbUrl } from '@/lib/media';
import { shrinkImage } from '@/lib/shrink-image';
import { mobileNumberForApps, trackContact } from '@/lib/statistics';
import { type Producer, type Product, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { BadgeCheck, Bell, BellRing, MapPin, MessageCircle, Star, Truck } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

export default function ProducerShow({
    producer,
    gallery,
    products,
    reviews,
    averageRating,
    isPremium,
    canReview,
    myPendingReview,
    canMessage,
    canFollow,
    isFollowing,
    followersCount,
    canReport,
    reportReasons,
    isFavorited,
    phone,
}: {
    producer: Omit<Producer, 'user_id' | 'status' | 'created_at' | 'updated_at' | 'phone'> & { has_phone: boolean };
    /** Only after "Prikaži broj": fetched by a partial reload, never in the page's HTML. */
    phone?: string | null;
    gallery: { id: number; path: string; caption: string | null }[];
    products: Pick<Product, 'id' | 'name' | 'slug' | 'price' | 'unit' | 'images'>[];
    reviews: Paginated<ReviewWithAuthor>;
    averageRating: number;
    isPremium: boolean;
    canReview: boolean;
    myPendingReview: ReviewWithAuthor | null;
    canMessage: boolean;
    canFollow: boolean;
    isFollowing: boolean;
    followersCount: number;
    canReport: boolean;
    reportReasons: Record<string, string>;
    isFavorited: boolean;
}) {
    const { auth } = usePage<SharedData>().props;
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [loadingPhone, setLoadingPhone] = useState(false);
    // Opened on request: Leaflet and the map tiles are only fetched for a
    // visitor who asks to see them.
    const [mapShown, setMapShown] = useState(false);
    const point =
        producer.lat && producer.lng ? { id: producer.id, name: producer.name, lat: Number(producer.lat), lng: Number(producer.lng) } : null;
    // Viber and WhatsApp open a chat with a mobile number, so they are only
    // offered when the number is one.
    const mobile = phone ? mobileNumberForApps(phone) : null;

    const revealPhone = () => {
        trackContact(producer.id, 'phone_reveal');
        router.reload({ only: ['phone'], onStart: () => setLoadingPhone(true), onFinish: () => setLoadingPhone(false) });
    };

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
                    src={mediaUrl(producer.cover_image_path)}
                    alt={producer.name}
                    className="image-warm mt-6 aspect-[16/9] w-full rounded-md object-cover sm:aspect-[16/6]"
                />
            )}

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
                        {(producer.verified_at || isPremium || producer.founding_number !== null) && (
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
                                {producer.founding_number !== null && (
                                    <p>
                                        <strong>{t('Osnivač')}</strong> — jedan od prvih proizvođača na sajtu; broj označava redosled pridruživanja.
                                    </p>
                                )}
                            </InfoHint>
                        )}
                    </h1>
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
                        {followersCount > 0 && (
                            <span>
                                {followersCount} {followersCount === 1 ? 'pratilac' : 'pratilaca'}
                            </span>
                        )}
                        {producer.founding_number !== null && (
                            <Link
                                href={route('marketplace.founding')}
                                className="text-gold border-gold/40 rounded-full border px-2 py-0.5 text-xs font-semibold"
                            >
                                Osnivač #{String(producer.founding_number).padStart(2, '0')}
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
                            {isFollowing ? 'Pratite' : 'Zaprati'}
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
                    {auth.user && <FavoriteButton type="household" id={producer.id} isFavorited={isFavorited} />}
                    {canReport && <ReportButton type="household" id={producer.id} reasons={reportReasons} />}
                </div>
            </div>

            <div className="mt-4">
                <ShareButtons url={typeof window === 'undefined' ? '' : window.location.href} title={producer.name} />
            </div>

            {(producer.has_phone || producer.contact_email || producer.address) && (
                <div className="border-border/70 mt-6 grid gap-4 rounded-lg border p-5 text-sm sm:grid-cols-3">
                    {producer.has_phone && (
                        <div className="min-w-0">
                            <p className="text-muted-foreground text-xs">{t('Telefon')}</p>
                            {phone ? (
                                <>
                                    <a href={`tel:${phone}`} className="font-medium break-words">
                                        {phone}
                                    </a>
                                    {mobile && (
                                        <span className="mt-1 flex gap-3 text-xs">
                                            <a
                                                href={`viber://chat?number=%2B${mobile}`}
                                                onClick={() => trackContact(producer.id, 'viber_click')}
                                                className="text-primary font-semibold underline"
                                            >
                                                Viber
                                            </a>
                                            <a
                                                href={`https://wa.me/${mobile}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={() => trackContact(producer.id, 'whatsapp_click')}
                                                className="text-primary font-semibold underline"
                                            >
                                                WhatsApp
                                            </a>
                                        </span>
                                    )}
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={revealPhone}
                                    disabled={loadingPhone}
                                    className="text-primary font-medium underline disabled:opacity-60"
                                >
                                    {loadingPhone ? t('Učitavanje…') : t('Prikaži broj')}
                                </button>
                            )}
                        </div>
                    )}
                    {producer.contact_email && (
                        <div className="min-w-0">
                            <p className="text-muted-foreground text-xs">{t('Email')}</p>
                            <a
                                href={`mailto:${producer.contact_email}`}
                                onClick={() => trackContact(producer.id, 'email_click')}
                                className="font-medium break-all"
                            >
                                {producer.contact_email}
                            </a>
                        </div>
                    )}
                    {producer.address && (
                        <div className="min-w-0">
                            <p className="text-muted-foreground text-xs">{t('Adresa')}</p>
                            <p className="font-medium break-words">{producer.address}</p>
                        </div>
                    )}
                </div>
            )}

            {point && (
                <div className="mt-4">
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                        <button
                            type="button"
                            onClick={() => setMapShown(!mapShown)}
                            aria-expanded={mapShown}
                            className="text-primary font-medium underline"
                        >
                            {mapShown ? t('Sakrij mapu') : t('Prikaži na mapi')}
                        </button>
                        {/* Directions are what a buyer on their way needs, and
                            every phone already has Google Maps. */}
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground underline"
                        >
                            {t('Otvori u Google mapama')}
                        </a>
                    </div>
                    {mapShown && <PointsMap points={[point]} className="mt-3 h-64 max-w-2xl" />}
                </div>
            )}

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

            {gallery.length > 0 && (
                <section className="mt-12">
                    <h2 className="font-serif text-2xl">{t('Galerija')}</h2>
                    <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                        {gallery.map((image) => (
                            <figure key={image.id} className="group">
                                <div className="bg-muted aspect-[4/3] overflow-hidden rounded-md">
                                    <img
                                        src={thumbUrl(image.path)}
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
                <h2 className="font-serif text-2xl">{t('Proizvodi')}</h2>
                {products.length === 0 ? (
                    <p className="text-muted-foreground mt-2 text-sm">{t('Ovaj proizvođač još nema objavljene proizvode.')}</p>
                ) : (
                    <div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-4">
                        {products.map((product) => (
                            <Link key={product.id} href={route('marketplace.products.show', product.slug)} className="group">
                                <div className="bg-muted aspect-square overflow-hidden rounded-md">
                                    {product.images?.[0] && (
                                        <img
                                            loading="lazy"
                                            src={thumbUrl(product.images[0].path)}
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
                <h2 className="font-serif text-2xl">{t('Utisci kupaca')}</h2>

                {/* The author's own review, still with a moderator, sits
                    where it will live once published - same card, same
                    place - so sending it never looks like losing it. */}
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
                            <ReviewCard key={review.id} review={review} />
                        ))}
                        <Pagination meta={reviews} />
                    </div>
                )}

                {canReview && (
                    <form onSubmit={submitReview} className="border-border/70 mt-6 space-y-3 rounded-lg border p-5">
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
                )}

                {!canReview && !myPendingReview && (
                    <p className="text-muted-foreground mt-6 text-sm">
                        {auth.user
                            ? t('Utisak možete ostaviti kada vam se proizvođač javi na vašu poruku.')
                            : t('Utiske ostavljaju prijavljeni korisnici koji su se dopisivali sa proizvođačem.')}
                    </p>
                )}
            </section>
        </MarketplaceLayout>
    );
}
