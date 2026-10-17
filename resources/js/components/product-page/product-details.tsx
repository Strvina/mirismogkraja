import ChatLink from '@/components/chat/chat-link';
import FavoriteButton from '@/components/favorite-button';
import FormErrors from '@/components/form-errors';
import PauseNotice, { type Pause } from '@/components/marketplace/pause-notice';
import { QuickViewLink } from '@/components/marketplace/quick-view-link';
import ReportButton from '@/components/marketplace/report-button';
import ResponseTimeBadge, { type ResponseTimeBucket } from '@/components/marketplace/response-time-badge';
import ShareButtons from '@/components/marketplace/share-buttons';
import { Button } from '@/components/ui/button';
import { ChatError, chatApi } from '@/lib/chat/api';
import { chat, type ThreadRef } from '@/lib/chat/store';
import { formatPrice } from '@/lib/format';
import { t } from '@/lib/i18n';
import { mediaUrl, thumbUrl } from '@/lib/media';
import { hasSeason, isInSeason, seasonLabel } from '@/lib/season';
import { sendOnEnter } from '@/lib/send-on-enter';
import { useSignInUrl } from '@/lib/sign-in';
import { cn } from '@/lib/utils';
import { type Producer, type Product, type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { BellRing, MapPin } from 'lucide-react';
import { useState, type ReactNode } from 'react';

type CategoryLink = { id: number; name: string; slug: string };

export type FullProduct = Omit<Product, 'category'> & {
    producer: Pick<Producer, 'id' | 'name' | 'slug' | 'city' | 'logo_path'>;
    /** Where it is filed, each level a link to its page. */
    category?: CategoryLink & { parent?: CategoryLink | null };
};
type SimilarProduct = Pick<Product, 'id' | 'name' | 'slug' | 'images'>;

/** Everything the product's page is given; the popup over a list gets the same. */
export interface ProductPageProps {
    product: FullProduct;
    similar: SimilarProduct[];
    /** The producer's town as a page of its own, when it has one. */
    place: { slug: string; name: string } | null;
    canInquire: boolean;
    /** Why someone signed in has no inquiry form: it is their own product, or the conversation is closed. */
    noInquiry: 'own' | 'blocked' | null;
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
}

/**
 * The product itself - photo, price, season, the inquiry, the producer - and
 * the similar ones below: the body of its page, and of the popup that opens
 * over a list. `compact` fits it to the popup's width.
 */
export default function ProductDetails({
    product,
    similar,
    place,
    canInquire,
    noInquiry,
    pause,
    canFollow,
    isFollowing,
    responseTime,
    available,
    alertRequested,
    canReport,
    reportReasons,
    isFavorited,
    compact = false,
    title: Title = 'h1',
    onConversation,
}: ProductPageProps & {
    compact?: boolean;
    /** The question went into a conversation: the popup closes and the chat window opens it. */
    onConversation?: (thread: ThreadRef) => void;
    /** The element the name is set in: the page's h1, or the popup's own title. */
    title?: 'h1' | ((props: { className: string; children: ReactNode }) => ReactNode);
}) {
    const { auth } = usePage<SharedData>().props;
    const signInUrl = useSignInUrl();
    // Over a list the popup's address is the list's; the way back is to the product itself.
    const productUrl = route('marketplace.products.show', product.slug);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const images = [...(product.images ?? [])].sort((a, b) => a.order - b.order);
    const shareUrl = typeof window === 'undefined' ? '' : window.location.href;
    const mainImage = images[0];

    const sendInquiry = () => {
        if (sending || !message.trim()) {
            return;
        }

        // With a chat window on the page, the question goes into it and the
        // conversation opens there - the reader stays where they were.
        if (chat.available()) {
            setSending(true);
            setErrors({});
            chatApi
                .inquiry(product.slug, message)
                .then(({ thread }) => {
                    setMessage('');
                    const ref = { producerId: thread.producer_id, buyerId: thread.buyer_id, title: thread.title, avatarPath: thread.avatar_path };
                    // Over the popup the window would be out of reach: the popup goes first.
                    if (onConversation) {
                        onConversation(ref);
                    } else {
                        chat.openThread(ref);
                    }
                })
                .catch((error: unknown) =>
                    setErrors({
                        body:
                            error instanceof ChatError && error.message
                                ? error.message
                                : t('Veza sa serverom nije uspela. Proverite internet i pokušajte ponovo.'),
                    }),
                )
                .finally(() => setSending(false));

            return;
        }

        router.post(
            route('inquiries.store', product.slug),
            { body: message },
            {
                onStart: () => {
                    setSending(true);
                    setErrors({});
                },
                onError: setErrors,
                onFinish: () => setSending(false),
            },
        );
    };

    return (
        <>
            {/* The photo beside the inquiry from a tablet up, and the narrower
                column of the two: the question to the producer is what the
                page is for. On a phone it is shorter than square for the same reason. */}
            <div
                className={cn(
                    'grid gap-8',
                    compact ? 'md:grid-cols-2' : 'md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12',
                )}
            >
                {/* The card's small photo underneath, already loaded: the large one comes in over it, not out of nothing. */}
                <div
                    className={cn(
                        'bg-muted overflow-hidden rounded-md bg-cover bg-center',
                        compact ? 'aspect-square' : 'aspect-4/3 md:sticky md:top-24 md:aspect-square',
                    )}
                    style={mainImage ? { backgroundImage: `url(${thumbUrl(mainImage.path)})` } : undefined}
                >
                    {mainImage && (
                        <img
                            src={mediaUrl(mainImage.path)}
                            alt={product.name}
                            // The largest thing on the first screen (and preloaded by the server).
                            fetchPriority={compact ? undefined : 'high'}
                            className="image-warm size-full object-cover"
                        />
                    )}
                </div>

                <div>
                    {product.category && <p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">{t(product.category.name)}</p>}
                    <Title className="mt-2 font-serif text-3xl font-normal break-words sm:text-4xl">{product.name}</Title>
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
                                    <Link href={signInUrl('login', productUrl)} className="font-medium underline underline-offset-4">
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
                                            <Link
                                                href={signInUrl('login', productUrl)}
                                                className="text-foreground font-medium underline underline-offset-4"
                                            >
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
                                    onKeyDown={sendOnEnter(sendInquiry)}
                                    maxLength={2000}
                                    placeholder={t('Zdravo, zainteresovan/a sam za...')}
                                    aria-label={t('Poruka proizvođaču')}
                                    className="border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm"
                                />
                            </>
                        )}

                        {noInquiry === 'own' && (
                            <p className="text-muted-foreground text-sm">
                                {t('Ovo je vaš proizvod.')}{' '}
                                <Link
                                    href={route('producers.products.edit', [product.producer_id, product.id])}
                                    className="text-foreground font-medium underline underline-offset-4"
                                >
                                    {t('Izmenite ga')}
                                </Link>
                            </p>
                        )}
                        {noInquiry === 'blocked' && (
                            <p className="text-muted-foreground text-sm">
                                {t('Razgovor sa ovim proizvođačem je zatvoren, pa mu ne možete poslati upit.')}{' '}
                                <ChatLink producer={product.producer} className="text-foreground font-medium underline underline-offset-4">
                                    {t('Otvorite razgovor')}
                                </ChatLink>
                            </p>
                        )}

                        <FormErrors errors={errors} />
                        <div className="flex flex-wrap items-center gap-3">
                            {canInquire ? (
                                <Button onClick={sendInquiry} disabled={sending || !message.trim()}>
                                    {t('Pošalji upit')}
                                </Button>
                            ) : (
                                !auth.user &&
                                !pause && (
                                    <Button asChild>
                                        <Link href={signInUrl('login', productUrl)}>{t('Prijavite se da pošaljete upit')}</Link>
                                    </Button>
                                )
                            )}
                            {auth.user && <FavoriteButton type="product" id={product.id} isFavorited={isFavorited} />}
                            {canReport && <ReportButton type="product" id={product.id} reasons={reportReasons} />}
                        </div>

                        {/* Someone who came from a search expects a basket.
                        Said here, before they go looking for one. */}
                        {!auth.user && (
                            <p className="text-muted-foreground text-sm leading-6">
                                {t('Na sajtu nema korpe ni plaćanja: pišete proizvođaču, a cenu, količinu i dostavu dogovarate direktno sa njim.')}{' '}
                                <Link href={route('info.how')} className="text-foreground font-medium underline underline-offset-4">
                                    {t('Kako radi')}
                                </Link>
                            </p>
                        )}

                        {/* A link to a jar of honey travels by Viber here, so
                        the buttons are plain links rather than an embedded
                        widget that would load tracking on every page. */}
                        <ShareButtons url={shareUrl} title={product.name} className="mt-4" />
                    </div>

                    <div className="hover:bg-muted relative mt-8 flex items-center gap-3 rounded-md border p-4">
                        <Link
                            href={route('marketplace.producers.show', product.producer.slug)}
                            aria-label={product.producer.name}
                            className="absolute inset-0 rounded-md"
                        />
                        {product.producer.logo_path && (
                            <img
                                loading="lazy"
                                src={thumbUrl(product.producer.logo_path)}
                                alt=""
                                className="size-10 shrink-0 rounded-full object-cover"
                            />
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="text-muted-foreground text-xs">{t('Proizvođač')}</p>
                            <p className="font-serif break-words">{product.producer.name}</p>
                            {product.producer.city && (
                                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                                    <MapPin className="size-3" />
                                    {place ? (
                                        <Link
                                            href={route('marketplace.places.show', place.slug)}
                                            // Small text, so the padding is what makes it tappable.
                                            className="hover:text-foreground relative -my-1.5 inline-block py-1.5 underline-offset-4 hover:underline"
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
                    </div>
                </div>
            </div>

            {similar.length > 0 && (
                <section className={compact ? 'mt-10' : 'mt-16'}>
                    <h2 className="font-serif text-2xl">{t('Slični proizvodi')}</h2>
                    <div className={cn('mt-6 grid grid-cols-2 gap-6', compact ? 'sm:grid-cols-4' : 'md:grid-cols-4')}>
                        {similar.map((p) => (
                            <QuickViewLink
                                key={p.id}
                                href={route('marketplace.products.show', p.slug)}
                                preview={{ name: p.name, image: p.images?.[0]?.path ?? null }}
                                className="group"
                            >
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
                            </QuickViewLink>
                        ))}
                    </div>
                </section>
            )}
        </>
    );
}
