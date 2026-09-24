import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import { Button } from '@/components/ui/button';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { formatPrice, formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePoll } from '@inertiajs/react';
import { ImageOff } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

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

    // An open conversation checks for replies on its own, so neither side has
    // to refresh to see one. Only the thread and the header's badge are
    // re-requested, and opening this page is also what marks the other
    // side's messages as read - so a reply that arrives while it's open is
    // read straight away and never lights the badge up. Inertia throttles
    // the poll by itself while the tab is in the background, and the visit
    // preserves scroll and local state, so a half-typed message survives it.
    usePoll(3000, { only: ['messages', 'unreadMessages'] });

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

    const send: FormEventHandler = (e) => {
        e.preventDefault();

        if (!body.trim()) {
            return;
        }

        router.post(sendRoute, { body }, { preserveScroll: true, onSuccess: () => setBody('') });
    };

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={isOwner ? `Poruke — ${buyer.name}` : `Poruke — ${producer.name}`} />

            <h1 className="font-serif text-4xl sm:text-5xl">{isOwner ? buyer.name : producer.name}</h1>
            {!isOwner && (
                <Link href={route('marketplace.producers.show', producer.slug)} className="text-primary mt-2 inline-block text-sm underline">
                    Otvori profil proizvođača
                </Link>
            )}

            <div className="mt-8 max-w-2xl space-y-4">
                {/* The newest page comes first, so paging forward walks back
                    through the history: the links belong above the thread. */}
                <Pagination meta={messages} />

                {messages.total === 0 ? (
                    <p className="text-muted-foreground text-sm">Još nema poruka. Napišite prvu — pitajte za dostupnost, količine ili dostavu.</p>
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
            </div>

            <form onSubmit={send} className="mt-8 max-w-2xl space-y-3">
                <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    maxLength={2000}
                    placeholder="Napišite poruku..."
                    aria-label="Poruka"
                    className="border-input bg-background min-h-28 w-full rounded-md border px-3 py-2 text-sm"
                />
                <Button disabled={!body.trim()}>Pošalji</Button>
            </form>
        </MarketplaceLayout>
    );
}
