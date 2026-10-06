import FavoriteButton from '@/components/favorite-button';
import Head from '@/components/head';
import PauseNotice, { type Pause } from '@/components/marketplace/pause-notice';
import ReportButton from '@/components/marketplace/report-button';
import ResponseTimeBadge, { type ResponseTimeBucket } from '@/components/marketplace/response-time-badge';
import ShareButtons from '@/components/marketplace/share-buttons';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { formatPrice } from '@/lib/format';
import { t } from '@/lib/i18n';
import { mediaUrl, thumbUrl } from '@/lib/media';
import { hasSeason, isInSeason, seasonLabel } from '@/lib/season';
import { type Producer, type Product, type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { BellRing, MapPin } from 'lucide-react';
import { useState } from 'react';

type FullProduct = Product & { producer: Pick<Producer, 'id' | 'name' | 'slug' | 'city' | 'logo_path'> };
type SimilarProduct = Pick<Product, 'id' | 'name' | 'slug' | 'images'>;

export default function ProductShow({
    product,
    similar,
    place,
    canInquire,
    pause,
    canFollow,
    isFollowing,
    responseTime,
    available,
    alertRequested,
    canReport,
    reportReasons,
    isFavorited,
}: {
    product: FullProduct;
    similar: SimilarProduct[];
    /** The producer's town as a page of its own, when it has one. */
    place: { slug: string; name: string } | null;
    canInquire: boolean;
    /** The producer is sold out or away and takes no new inquiries. */
    pause: Pause | null;
    canFollow: boolean;
    isFollowing: boolean;
    responseTime: ResponseTimeBucket | null;
    /** In stock and in season. */
    available: boolean;
    /** The visitor asked to be told when it is available again. */
    alertRequested: boolean;
    canReport: boolean;
    reportReasons: Record<string, string>;
    isFavorited: boolean;
}) {
    const { auth } = usePage<SharedData>().props;
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const images = [...(product.images ?? [])].sort((a, b) => a.order - b.order);
    const shareUrl = typeof window === 'undefined' ? '' : window.location.href;
    const mainImage = images[0];

    const sendInquiry = () => {
        if (!message.trim()) {
            return;
        }

        router.post(
            route('inquiries.store', product.slug),
            { body: message },
            { onStart: () => setSending(true), onFinish: () => setSending(false) },
        );
    };

    return (
        <MarketplaceLayout>
            <Head title={product.name} />

            <div className="grid gap-10 lg:grid-cols-2">
                <div className="bg-muted aspect-square overflow-hidden rounded-md">
                    {mainImage && (
                        <img
                            src={mediaUrl(mainImage.path)}
                            alt={product.name}
                            // The largest thing on the first screen (and preloaded by the server).
                            fetchPriority="high"
                            className="image-warm size-full object-cover"
                        />
                    )}
                </div>

                <div>
                    <p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">{product.category && t(product.category.name)}</p>
                    <h1 className="mt-2 font-serif text-3xl break-words sm:text-4xl">{product.name}</h1>
                    <p className="mt-3 font-serif text-2xl">
                        {formatPrice(product.price)} <span className="text-muted-foreground font-sans text-sm">/ {product.unit}</span>
                    </p>

                    {hasSeason(product) && (
                        <p className="mt-3 flex items-center gap-2 text-sm">
                            <span
                                className={
                                    isInSeason(product)
                                        ? 'bg-olive-soft text-olive rounded-full px-2.5 py-0.5 text-xs font-semibold'
                                        : 'bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-semibold'
                                }
                            >
                                {isInSeason(product) ? t('U sezoni') : t('Van sezone')}
                            </span>
                            <span className="text-muted-foreground">{t('Sezona: :months', { months: seasonLabel(product) ?? '' })}</span>
                        </p>
                    )}

                    {!available && (canInquire || !auth.user) && (
                        <div className="border-border/70 bg-muted/40 mt-4 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-sm">
                            <BellRing className="text-primary size-4 shrink-0" aria-hidden />
                            {auth.user ? (
                                alertRequested ? (
                                    <>
                                        <span>{t('Javićemo vam čim bude ponovo dostupno.')}</span>
                                        <button
                                            type="button"
                                            className="text-muted-foreground hover:text-foreground underline underline-offset-4"
                                            onClick={() => router.post(route('products.alert', product.slug), {}, { preserveScroll: true })}
                                        >
                                            {t('Otkaži')}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <span>{t('Trenutno nije dostupno.')}</span>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => router.post(route('products.alert', product.slug), {}, { preserveScroll: true })}
                                        >
                                            {t('Javi mi kad stigne')}
                                        </Button>
                                    </>
                                )
                            ) : (
                                <span>
                                    {t('Trenutno nije dostupno.')}{' '}
                                    <Link href={route('login')} className="font-medium underline underline-offset-4">
                                        {t('Prijavite se')}
                                    </Link>{' '}
                                    {t('i javićemo vam kad stigne.')}
                                </span>
                            )}
                        </div>
                    )}

                    {product.description && <p className="text-muted-foreground mt-6 leading-7 break-words">{product.description}</p>}

                    <div className="mt-6 space-y-3">
                        {pause && !canInquire && (
                            <PauseNotice pause={pause}>
                                {canFollow ? (
                                    isFollowing ? (
                                        <p className="text-muted-foreground">{t('Pratite ovog proizvođača — javićemo vam kad se vrati.')}</p>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => router.post(route('producers.follow', product.producer.id), {}, { preserveScroll: true })}
                                        >
                                            {t('Javi mi kad se vrati')}
                                        </Button>
                                    )
                                ) : (
                                    !auth.user && (
                                        <p className="text-muted-foreground">
                                            <Link href={route('login')} className="text-foreground font-medium underline underline-offset-4">
                                                {t('Prijavite se')}
                                            </Link>{' '}
                                            {t('i javićemo vam kad se vrati.')}
                                        </p>
                                    )
                                )}
                            </PauseNotice>
                        )}

                        {canInquire && (
                            <>
                                <p className="text-muted-foreground text-sm">
                                    {t('Pitajte proizvođača za dostupnost, količinu i dostavu — dogovor ide direktno između vas.')}
                                </p>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    maxLength={2000}
                                    placeholder={t('Zdravo, zainteresovan/a sam za...')}
                                    aria-label={t('Poruka proizvođaču')}
                                    className="border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm"
                                />
                            </>
                        )}

                        <div className="flex flex-wrap items-center gap-3">
                            {canInquire ? (
                                <Button onClick={sendInquiry} disabled={sending || !message.trim()}>
                                    {t('Pošalji upit')}
                                </Button>
                            ) : (
                                !auth.user &&
                                !pause && (
                                    <Button asChild>
                                        <Link href={route('login')}>{t('Prijavite se da pošaljete upit')}</Link>
                                    </Button>
                                )
                            )}
                            {auth.user && <FavoriteButton type="product" id={product.id} isFavorited={isFavorited} />}
                            {canReport && <ReportButton type="product" id={product.id} reasons={reportReasons} />}
                        </div>

                        {/* A link to a jar of honey travels by Viber here, so
                            the buttons are plain links rather than an embedded
                            widget that would load tracking on every page. */}
                        <ShareButtons url={shareUrl} title={product.name} className="mt-4" />
                    </div>

                    <Link
                        href={route('marketplace.producers.show', product.producer.slug)}
                        className="hover:bg-muted mt-8 flex items-center gap-3 rounded-md border p-4"
                    >
                        {product.producer.logo_path && (
                            <img
                                loading="lazy"
                                src={thumbUrl(product.producer.logo_path)}
                                alt=""
                                className="size-10 shrink-0 rounded-full object-cover"
                            />
                        )}
                        <div className="min-w-0">
                            <p className="font-serif break-words">{product.producer.name}</p>
                            {product.producer.city && (
                                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                                    <MapPin className="size-3" />
                                    {place ? (
                                        <Link
                                            href={route('marketplace.places.show', place.slug)}
                                            // Small text, so the padding is what makes it tappable.
                                            className="hover:text-foreground -my-1.5 inline-block py-1.5 underline-offset-4 hover:underline"
                                        >
                                            {product.producer.city}
                                        </Link>
                                    ) : (
                                        product.producer.city
                                    )}
                                </p>
                            )}
                            <ResponseTimeBadge bucket={responseTime} className="text-muted-foreground mt-1 text-xs" />
                        </div>
                    </Link>
                </div>
            </div>

            {similar.length > 0 && (
                <section className="mt-16">
                    <h2 className="font-serif text-2xl">{t('Slični proizvodi')}</h2>
                    <div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-4">
                        {similar.map((p) => (
                            <Link key={p.id} href={route('marketplace.products.show', p.slug)} className="group">
                                <div className="bg-muted aspect-square overflow-hidden rounded-md">
                                    {p.images?.[0] && (
                                        <img
                                            loading="lazy"
                                            src={thumbUrl(p.images[0].path)}
                                            // The name is the link's text, right below.
                                            alt=""
                                            className="image-warm size-full object-cover transition group-hover:scale-105"
                                        />
                                    )}
                                </div>
                                <p className="mt-2 text-sm font-medium">{p.name}</p>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </MarketplaceLayout>
    );
}
