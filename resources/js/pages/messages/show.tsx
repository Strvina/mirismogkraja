import InfoHint from '@/components/info-hint';
import ReportButton from '@/components/marketplace/report-button';
import { Button } from '@/components/ui/button';
import { useAdaptivePoll } from '@/hooks/use-adaptive-poll';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { ask } from '@/lib/confirm';
import { formatPrice, formatRelativeTime } from '@/lib/format';
import { t } from '@/lib/i18n';
import { thumbUrl } from '@/lib/media';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Ban, Check, ImageOff, SendHorizontal, TriangleAlert } from 'lucide-react';
import { FormEventHandler, KeyboardEventHandler, useLayoutEffect, useRef, useState } from 'react';

interface Message {
    id: number;
    body: string;
    created_at: string;
    mine: boolean;
    sender: { id: number; name: string; avatar_path: string | null };
    // Set only on a message sent from a product page, so the reader can see
    // which listing the question was about.
    product: { id: number; name: string; slug: string; price: string; unit: string; image: string | null } | null;
}

/** How close to the bottom still counts as "following the conversation". */
const STICK_TO_BOTTOM_PX = 80;

/** The composer grows with the message, up to about six lines. */
const MAX_COMPOSER_HEIGHT_PX = 160;

/**
 * A message drawn before the server has confirmed it. While it is on its
 * way it is deliberately indistinguishable from a delivered one: a spinner
 * or a "sending" label would only draw attention to a wait the sender has
 * no reason to care about.
 *
 * A send that never arrives is the one thing they do need to know about, so
 * `failed` is the only state that shows. The text stays in the thread and
 * can be sent again, rather than being dropped back into the composer on
 * top of whatever has been typed since.
 */
interface PendingMessage {
    key: number;
    body: string;
    created_at: string;
    failed: boolean;
}

/**
 * The listing an inquiry was opened from, shown above the message itself:
 * a thumbnail, the name (still the link to the product page) and the asking
 * price, so a producer reading a week-old thread recognises the product
 * without opening it.
 */
function ProductPreview({ product, mine }: { product: NonNullable<Message['product']>; mine: boolean }) {
    return (
        <Link
            href={route('marketplace.products.show', product.slug)}
            className={cn(
                'mb-2.5 flex items-center gap-3 rounded-md p-2 transition-opacity hover:opacity-85',
                mine ? 'bg-primary-foreground/15' : 'bg-background',
            )}
        >
            <span className={cn('size-12 shrink-0 overflow-hidden rounded', mine ? 'bg-primary-foreground/20' : 'bg-muted')}>
                {product.image ? (
                    <img src={thumbUrl(product.image)} alt="" loading="lazy" className="size-full object-cover" />
                ) : (
                    <span className="grid size-full place-items-center opacity-40">
                        <ImageOff className="size-5" />
                    </span>
                )}
            </span>
            <span className="min-w-0">
                <span className="block truncate text-sm font-medium underline underline-offset-2">{product.name}</span>
                <span className={cn('block text-xs', mine ? 'text-primary-foreground/75' : 'text-muted-foreground')}>
                    {formatPrice(product.price)} / {product.unit}
                </span>
            </span>
        </Link>
    );
}

/**
 * One conversation, laid out the way a chat is: a panel of a fixed height
 * with its own scroll, and the composer pinned to its bottom edge. The page
 * itself therefore stays the same length however long the history gets,
 * instead of growing downwards until the input is off screen.
 */
export default function MessageThread({
    producer,
    buyer,
    messages,
    isOwner,
    blockedBy,
    closed,
    reportReasons,
    outcome,
    outcomeLabels,
}: {
    producer: { id: number; name: string; slug: string; logo_path: string | null };
    buyer: { id: number; name: string; avatar_path: string | null };
    /** A simple paginator: it knows whether older messages exist, not how many. */
    messages: { data: Message[]; current_page: number; next_page_url: string | null };
    isOwner: boolean;
    blockedBy: 'producer' | 'buyer' | null;
    /** Which side has left the site, if one has. */
    closed: 'producer' | 'buyer' | null;
    reportReasons: Record<string, string>;
    outcome: string | null;
    outcomeLabels: Record<string, string>;
}) {
    const { auth } = usePage<SharedData>().props;
    const [body, setBody] = useState('');
    // Messages the user has just sent, drawn before the round trip finishes.
    // Waiting for the server to echo one back made every message feel slow,
    // since a send is a POST followed by a redirect - two trips - before
    // anything appears.
    const [pending, setPending] = useState<PendingMessage[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const composerRef = useRef<HTMLTextAreaElement>(null);

    // Whether to keep the newest message in view when one arrives. Someone
    // scrolled up re-reading the history is left where they are; only a
    // reader already at the bottom gets carried along.
    const following = useRef(true);

    // An open conversation checks for replies on its own, so neither side has
    // to refresh to see one. Only the thread and the header's badge are
    // re-requested, and opening this page is also what marks the other
    // side's messages as read - so a reply that arrives while it's open is
    // read straight away and never lights the badge up. Every 3 seconds
    // while messages are coming, slowing to 20 when the conversation goes
    // quiet (see useAdaptivePoll); the newest message's id is what counts
    // as something happening. The visit preserves scroll and local state,
    // so a half-typed message survives it.
    const poll = useAdaptivePoll(['messages', 'unreadMessages', 'blockedBy'], messages.data[0]?.id);

    const blocked = blockedBy !== null;
    // Only the side that closed the conversation can open it again.
    const blockedByMe = blockedBy === (isOwner ? 'producer' : 'buyer');

    const toggleBlock = async () => {
        if (
            blocked ||
            (await ask({
                title: t('Blokirati razgovor sa korisnikom :name?', { name: isOwner ? buyer.name : producer.name }),
                description: t('Nijedno od vas neće moći da šalje poruke dok ga ne odblokirate. Prepiska ostaje sačuvana.'),
                confirmLabel: t('Blokiraj'),
                tone: 'danger',
            }))
        ) {
            router.patch(route('messages.block', [producer.id, buyer.id]), {}, { preserveScroll: true });
        }
    };

    // The seller's side addresses a specific buyer; the buyer's side doesn't
    // need to say who they are.
    const sendRoute = isOwner ? route('messages.thread.store', [producer.id, buyer.id]) : route('messages.store', producer.slug);

    const breadcrumbs: BreadcrumbItem[] = isOwner
        ? [
              { title: t('Moje poruke'), href: '/poruke' },
              { title: buyer.name, href: '#' },
          ]
        : [
              { title: t('Moje poruke'), href: '/poruke' },
              { title: producer.name, href: '#' },
          ];

    const title = isOwner ? buyer.name : producer.name;
    const avatar = isOwner ? buyer.avatar_path : producer.logo_path;
    const newestId = messages.data[messages.data.length - 1]?.id ?? 0;
    // The paginator walks backwards through the history, so its "next" link
    // is the older part of the conversation.
    const olderPage = messages.next_page_url;

    const shownPage = useRef(messages.current_page);

    // Before paint, so the thread never flashes at the wrong scroll position
    // on first render or when the poll appends a reply. Stepping back through
    // the history scrolls to the bottom too: the end of an older page is
    // where the part just read begins.
    useLayoutEffect(() => {
        const panel = scrollRef.current;

        if (!panel) {
            return;
        }

        const pageChanged = shownPage.current !== messages.current_page;
        shownPage.current = messages.current_page;

        if (pageChanged || following.current) {
            panel.scrollTop = panel.scrollHeight;
        }
    }, [newestId, messages.current_page, pending.length]);

    const onPanelScroll = () => {
        const panel = scrollRef.current;

        if (panel) {
            following.current = panel.scrollHeight - panel.scrollTop - panel.clientHeight < STICK_TO_BOTTOM_PX;
        }
    };

    const deliver = (message: PendingMessage) => {
        // Sending always brings you back to the newest message, wherever you
        // had scrolled to.
        following.current = true;

        // A poll landing mid-send would bring the message back from the
        // server while its local copy is still on screen, showing it twice.
        poll.stop();

        const markFailed = () => setPending((queued) => queued.map((item) => (item.key === message.key ? { ...item, failed: true } : item)));

        let answered = false;

        router.post(
            sendRoute,
            { body: message.body },
            {
                preserveScroll: true,
                // Keep the panel mounted so its scroll position and the
                // composer's focus survive the round trip - a POST would
                // otherwise remount the page and take the cursor with it.
                preserveState: true,
                // The reply only changes the thread and the badge, so the
                // redirect that follows brings back just those.
                only: ['messages', 'unreadMessages'],
                // The message is already in the thread, so the loading bar
                // sweeping across the top of the page says nothing except
                // that something is reloading - which is exactly the
                // impression to avoid. Failures are reported on the message
                // itself instead.
                showProgress: false,
                onSuccess: () => {
                    answered = true;
                    setPending((queued) => queued.filter((item) => item.key !== message.key));
                },
                onError: () => {
                    answered = true;
                    markFailed();
                },
                onFinish: () => {
                    poll.start();

                    // Inertia calls onError only when the server answered. A
                    // request that never got there - no connection, server
                    // down, request cancelled - reaches this point and
                    // nothing else, so without this the message would sit in
                    // the thread looking delivered forever.
                    if (!answered) {
                        markFailed();
                    }
                },
            },
        );
    };

    const send: FormEventHandler = (event) => {
        event.preventDefault();

        const text = body.trim();

        if (!text) {
            return;
        }

        setBody('');

        if (composerRef.current) {
            composerRef.current.style.height = 'auto';
            composerRef.current.focus();
        }

        const sending: PendingMessage = { key: Date.now(), body: text, created_at: new Date().toISOString(), failed: false };

        setPending((queued) => [...queued, sending]);
        deliver(sending);
    };

    // onSuccess runs after the new props are applied, so for one render the
    // thread can hold both the server's copy of a message and the local one
    // it replaces. Matching them up here keeps that frame from flickering.
    // Counting, rather than a plain "some message has this text", keeps the
    // second of two identical messages visible until its own reply lands.
    const awaitingDelivery = (() => {
        const mine = messages.data.filter((message) => message.mine).map((message) => message.body);

        return pending.filter((message) => {
            if (message.failed) {
                return true;
            }

            const index = mine.indexOf(message.body);

            if (index === -1) {
                return true;
            }

            mine.splice(index, 1);

            return false;
        });
    })();

    const retry = (message: PendingMessage) => {
        setPending((queued) => queued.map((item) => (item.key === message.key ? { ...item, failed: false } : item)));
        deliver(message);
    };

    const discard = (message: PendingMessage) => setPending((queued) => queued.filter((item) => item.key !== message.key));

    // Enter sends, Shift+Enter starts a new line. The composing check keeps
    // Enter from sending half a word while an input method is still
    // assembling it.
    const onComposerKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            send(event);
        }
    };

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Poruke')} — ${title}`} />

            <div className="border-border/70 bg-background mx-auto flex h-[calc(100svh-15rem)] max-h-[44rem] min-h-[26rem] w-full max-w-2xl flex-col overflow-hidden rounded-lg border">
                <header className="border-border/70 flex items-center gap-3 border-b px-4 py-3">
                    {avatar ? (
                        <img src={thumbUrl(avatar)} alt="" className="size-10 shrink-0 rounded-full object-cover" />
                    ) : (
                        <span className="bg-olive-soft text-olive grid size-10 shrink-0 place-items-center rounded-full font-semibold">
                            {title.charAt(0).toUpperCase()}
                        </span>
                    )}
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate font-serif text-lg leading-tight">{title}</h1>
                        {!isOwner && (
                            <Link
                                href={route('marketplace.producers.show', producer.slug)}
                                className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                            >
                                {t('Otvori profil proizvođača')}
                            </Link>
                        )}
                    </div>

                    {/* Either side's defence against the other: close the
                        conversation, or report them to us. */}
                    <div className="flex shrink-0 items-center gap-1">
                        {(!blocked || blockedByMe) && (
                            <Button variant="ghost" size="sm" onClick={toggleBlock}>
                                {blocked ? t('Odblokiraj') : t('Blokiraj')}
                            </Button>
                        )}
                        {isOwner ? (
                            <ReportButton type="user" id={buyer.id} reasons={reportReasons} />
                        ) : (
                            <ReportButton type="producer" id={producer.id} reasons={reportReasons} />
                        )}
                    </div>
                </header>

                {/* The producer's own note on how the inquiry ended. Optional,
                    invisible to the buyer, and explained right where it is. */}
                {isOwner && (
                    <div className="border-border/70 bg-muted/30 flex flex-wrap items-center gap-2 border-b px-4 py-2 text-xs">
                        <span className="text-muted-foreground flex items-center gap-1 font-medium">
                            {t('Ishod upita')}
                            <InfoHint label={t('Šta je ishod upita?')} title={t('Ishod upita — samo za evidenciju')}>
                                <p>
                                    {t(
                                        'Ovde možete, ako želite, da označite kako se razgovor završio: da ste se čuli sa kupcem, da je kupovina realizovana, ili da je otkazana.',
                                    )}
                                </p>
                                <p>{t('Nije obavezno i ne utiče ni na šta — ni na vaš profil, ni na ocene, ni na cenu. Kupac ovo ne vidi.')}</p>
                                <p>
                                    {t(
                                        'Plaćanje i dostavu dogovarate direktno sa kupcem, pa sajt ne može da zna da li je nešto prodato. Vaša oznaka nam pomaže da vidimo koliko se preko sajta zaista proda i šta se najviše traži.',
                                    )}
                                </p>
                            </InfoHint>
                        </span>
                        {Object.entries(outcomeLabels).map(([value, label]) => {
                            const active = outcome === value;

                            return (
                                <button
                                    key={value}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() =>
                                        // Clicking the chosen one again clears it.
                                        router.patch(
                                            route('messages.outcome', [producer.id, buyer.id]),
                                            { status: active ? null : value },
                                            { preserveScroll: true, only: ['outcome'] },
                                        )
                                    }
                                    className={cn(
                                        'rounded-full border px-2.5 py-1 transition-colors',
                                        active ? 'border-olive bg-olive-soft text-olive font-semibold' : 'border-border/70 hover:bg-muted',
                                    )}
                                >
                                    {active && <Check className="mr-1 inline size-3" aria-hidden />}
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                )}

                <div ref={scrollRef} onScroll={onPanelScroll} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                    {/* Older messages live above, as in any chat. */}
                    {olderPage && (
                        <div className="flex justify-center pb-1">
                            <Link
                                href={olderPage}
                                preserveScroll
                                only={['messages']}
                                className="border-border/70 hover:bg-muted rounded-full border px-3 py-1 text-xs transition-colors"
                            >
                                {t('Starije poruke')}
                            </Link>
                        </div>
                    )}

                    {messages.data.length === 0 && messages.current_page === 1 ? (
                        <p className="text-muted-foreground py-8 text-center text-sm">
                            {t('Još nema poruka. Napišite prvu — pitajte za dostupnost, količine ili dostavu.')}
                        </p>
                    ) : (
                        messages.data.map((message) => (
                            <div key={message.id} className={cn('flex', message.mine ? 'justify-end' : 'justify-start')}>
                                <div
                                    className={cn(
                                        'max-w-[85%] rounded-lg px-4 py-3 text-sm leading-6',
                                        message.mine ? 'bg-primary text-primary-foreground' : 'bg-muted',
                                    )}
                                >
                                    {message.product && <ProductPreview product={message.product} mine={message.mine} />}
                                    <p className="whitespace-pre-line">{message.body}</p>
                                    <p className={cn('mt-1.5 text-[0.65rem]', message.mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                                        {message.sender.name} · {formatRelativeTime(message.created_at)}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}

                    {awaitingDelivery.map((message) => (
                        <div key={message.key} className="flex justify-end">
                            <div
                                className={cn(
                                    'max-w-[85%] rounded-lg px-4 py-3 text-sm leading-6',
                                    message.failed
                                        ? 'border-destructive/40 text-foreground border border-dashed'
                                        : 'bg-primary text-primary-foreground',
                                )}
                            >
                                <p className="whitespace-pre-line">{message.body}</p>

                                {message.failed ? (
                                    <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[0.65rem]">
                                        <span className="text-destructive flex items-center gap-1">
                                            <TriangleAlert className="size-3" />
                                            {t('Nije poslato')}
                                        </span>
                                        <button type="button" onClick={() => retry(message)} className="underline underline-offset-2">
                                            {t('Pokušaj ponovo')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => discard(message)}
                                            className="text-muted-foreground underline underline-offset-2"
                                        >
                                            {t('Odbaci')}
                                        </button>
                                    </p>
                                ) : (
                                    <p className="text-primary-foreground/70 mt-1.5 text-[0.65rem]">
                                        {auth.user?.name} · {formatRelativeTime(message.created_at)}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* A block closes the conversation both ways; the history
                    stays readable. */}
                {closed ? (
                    <p className="border-border/70 bg-muted/50 text-muted-foreground flex items-center gap-2 border-t px-4 py-3 text-sm">
                        <Ban className="size-4 shrink-0" aria-hidden />
                        {closed === 'producer'
                            ? t('Ovaj proizvođač više nije na sajtu. Prepiska ostaje ovde, ali poruke se više ne mogu slati.')
                            : t('Ovaj korisnik je obrisao nalog. Prepiska ostaje ovde, ali poruke se više ne mogu slati.')}
                    </p>
                ) : blocked ? (
                    <p className="border-border/70 bg-muted/50 text-muted-foreground flex items-center gap-2 border-t px-4 py-3 text-sm">
                        <Ban className="size-4 shrink-0" aria-hidden />
                        {blockedByMe
                            ? t('Blokirali ste ovaj razgovor — ni vi ni :name ne možete da šaljete poruke. Odblokirajte ga da biste nastavili.', {
                                  name: isOwner ? buyer.name : producer.name,
                              })
                            : isOwner
                              ? t('Kupac je zatvorio ovaj razgovor. Poruke se više ne mogu slati, ali prepiska ostaje ovde.')
                              : t('Proizvođač je zatvorio ovaj razgovor. Poruke se više ne mogu slati, ali prepiska ostaje ovde.')}
                    </p>
                ) : (
                    <form onSubmit={send} className="border-border/70 flex items-end gap-2 border-t px-3 py-3">
                        <textarea
                            ref={composerRef}
                            value={body}
                            onChange={(event) => {
                                setBody(event.target.value);
                                event.target.style.height = 'auto';
                                event.target.style.height = `${Math.min(event.target.scrollHeight, MAX_COMPOSER_HEIGHT_PX)}px`;
                            }}
                            onKeyDown={onComposerKeyDown}
                            rows={1}
                            maxLength={2000}
                            placeholder={t('Napišite poruku...')}
                            aria-label={t('Poruka')}
                            className="border-input bg-background max-h-40 min-h-11 flex-1 resize-none rounded-md border px-3 py-2.5 text-sm"
                        />
                        <Button type="submit" size="icon" disabled={!body.trim()} aria-label={t('Pošalji poruku')} className="size-11 shrink-0">
                            <SendHorizontal className="size-4" />
                        </Button>
                    </form>
                )}
            </div>
        </MarketplaceLayout>
    );
}
