import { type Paginated } from '@/components/marketplace/pagination';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { formatPrice, formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePoll } from '@inertiajs/react';
import { ImageOff, SendHorizontal } from 'lucide-react';
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

/** A message shown before the server has confirmed it. */
interface PendingMessage {
    key: number;
    body: string;
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
                    <img src={`/storage/${product.image}`} alt="" loading="lazy" className="size-full object-cover" />
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
}: {
    producer: { id: number; name: string; slug: string; logo_path: string | null };
    buyer: { id: number; name: string; avatar_path: string | null };
    messages: Paginated<Message>;
    isOwner: boolean;
}) {
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
    // read straight away and never lights the badge up. Inertia throttles
    // the poll by itself while the tab is in the background, and the visit
    // preserves scroll and local state, so a half-typed message survives it.
    const poll = usePoll(3000, { only: ['messages', 'unreadMessages'] });

    // The seller's side addresses a specific buyer; the buyer's side doesn't
    // need to say who they are.
    const sendRoute = isOwner ? route('messages.thread.store', [producer.id, buyer.id]) : route('messages.store', producer.slug);

    const breadcrumbs: BreadcrumbItem[] = isOwner
        ? [
              { title: 'Poruke proizvođača', href: '/poruke-proizvodjaca' },
              { title: buyer.name, href: '#' },
          ]
        : [
              { title: 'Moje poruke', href: '/poruke' },
              { title: producer.name, href: '#' },
          ];

    const title = isOwner ? buyer.name : producer.name;
    const avatar = isOwner ? buyer.avatar_path : producer.logo_path;
    const newestId = messages.data[messages.data.length - 1]?.id ?? 0;
    // The paginator walks backwards through the history, so its "next" link
    // is the older part of the conversation.
    const olderPage = messages.links[messages.links.length - 1]?.url ?? null;

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

    const send: FormEventHandler = (event) => {
        event.preventDefault();

        const text = body.trim();

        if (!text) {
            return;
        }

        const sending: PendingMessage = { key: Date.now(), body: text };

        // Sending always brings you back to the newest message, wherever you
        // had scrolled to.
        following.current = true;
        setPending((queued) => [...queued, sending]);
        setBody('');

        if (composerRef.current) {
            composerRef.current.style.height = 'auto';
            composerRef.current.focus();
        }

        // A poll landing mid-send would bring the message back from the
        // server while its local copy is still on screen, showing it twice.
        poll.stop();

        router.post(
            sendRoute,
            { body: text },
            {
                preserveScroll: true,
                // Keep the panel mounted so its scroll position and the
                // composer's focus survive the round trip - a POST would
                // otherwise remount the page and take the cursor with it.
                preserveState: true,
                // The reply only changes the thread and the badge, so the
                // redirect that follows brings back just those.
                only: ['messages', 'unreadMessages'],
                onSuccess: () => setPending((queued) => queued.filter((item) => item.key !== sending.key)),
                onError: () => {
                    // Hand the text back rather than losing it.
                    setPending((queued) => queued.filter((item) => item.key !== sending.key));
                    setBody((current) => current || text);
                },
                onFinish: () => poll.start(),
            },
        );
    };

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
            <Head title={`Poruke — ${title}`} />

            <div className="border-border/70 bg-background mx-auto flex h-[calc(100svh-15rem)] max-h-[44rem] min-h-[26rem] w-full max-w-2xl flex-col overflow-hidden rounded-lg border">
                <header className="border-border/70 flex items-center gap-3 border-b px-4 py-3">
                    {avatar ? (
                        <img src={`/storage/${avatar}`} alt="" className="size-10 shrink-0 rounded-full object-cover" />
                    ) : (
                        <span className="bg-olive-soft text-olive grid size-10 shrink-0 place-items-center rounded-full font-semibold">
                            {title.charAt(0).toUpperCase()}
                        </span>
                    )}
                    <div className="min-w-0">
                        <h1 className="truncate font-serif text-lg leading-tight">{title}</h1>
                        {!isOwner && (
                            <Link
                                href={route('marketplace.producers.show', producer.slug)}
                                className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                            >
                                Otvori profil proizvođača
                            </Link>
                        )}
                    </div>
                </header>

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
                                Starije poruke
                            </Link>
                        </div>
                    )}

                    {messages.total === 0 ? (
                        <p className="text-muted-foreground py-8 text-center text-sm">
                            Još nema poruka. Napišite prvu — pitajte za dostupnost, količine ili dostavu.
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

                    {pending.map((message) => (
                        <div key={message.key} className="flex justify-end">
                            <div className="bg-primary text-primary-foreground max-w-[85%] rounded-lg px-4 py-3 text-sm leading-6 opacity-70">
                                <p className="whitespace-pre-line">{message.body}</p>
                                <p className="text-primary-foreground/70 mt-1.5 text-[0.65rem]">Šalje se…</p>
                            </div>
                        </div>
                    ))}
                </div>

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
                        placeholder="Napišite poruku..."
                        aria-label="Poruka"
                        className="border-input bg-background max-h-40 min-h-11 flex-1 resize-none rounded-md border px-3 py-2.5 text-sm"
                    />
                    <Button type="submit" size="icon" disabled={!body.trim()} aria-label="Pošalji poruku" className="size-11 shrink-0">
                        <SendHorizontal className="size-4" />
                    </Button>
                </form>
            </div>
        </MarketplaceLayout>
    );
}
