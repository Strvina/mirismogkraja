import { formatPrice, formatRelativeTime } from '@/lib/format';
import { t } from '@/lib/i18n';
import { thumbUrl } from '@/lib/media';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ImageOff, TriangleAlert } from 'lucide-react';
import { type Message, type PendingMessage } from './types';

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

/** A message the server has. */
export function MessageBubble({ message }: { message: Message }) {
    return (
        <div className={cn('flex', message.mine ? 'justify-end' : 'justify-start')}>
            <div
                className={cn('max-w-[85%] rounded-lg px-4 py-3 text-sm leading-6', message.mine ? 'bg-primary text-primary-foreground' : 'bg-muted')}
            >
                {message.product && <ProductPreview product={message.product} mine={message.mine} />}
                <p className="whitespace-pre-line">{message.body}</p>
                <p className={cn('mt-1.5 text-[0.65rem]', message.mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                    {message.sender.name} · {formatRelativeTime(message.created_at)}
                </p>
            </div>
        </div>
    );
}

/** A message just sent: looks delivered unless it failed, then offers to retry or drop it. */
export function PendingBubble({
    message,
    senderName,
    onRetry,
    onDiscard,
}: {
    message: PendingMessage;
    senderName: string;
    onRetry: () => void;
    onDiscard: () => void;
}) {
    return (
        <div className="flex justify-end">
            <div
                className={cn(
                    'max-w-[85%] rounded-lg px-4 py-3 text-sm leading-6',
                    message.failed ? 'border-destructive/40 text-foreground border border-dashed' : 'bg-primary text-primary-foreground',
                )}
            >
                <p className="whitespace-pre-line">{message.body}</p>

                {message.failed ? (
                    <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[0.65rem]">
                        <span className="text-destructive flex items-center gap-1">
                            <TriangleAlert className="size-3" />
                            {t('Nije poslato')}
                        </span>
                        <button type="button" onClick={onRetry} className="underline underline-offset-2">
                            {t('Pokušaj ponovo')}
                        </button>
                        <button type="button" onClick={onDiscard} className="text-muted-foreground underline underline-offset-2">
                            {t('Odbaci')}
                        </button>
                    </p>
                ) : (
                    <p className="text-primary-foreground/70 mt-1.5 text-[0.65rem]">
                        {senderName} · {formatRelativeTime(message.created_at)}
                    </p>
                )}
            </div>
        </div>
    );
}
