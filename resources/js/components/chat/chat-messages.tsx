import { ProductPreview } from '@/components/messages/message-bubbles';
import { type Message, type PendingMessage } from '@/components/messages/types';
import { formatChatTime } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { TriangleAlert } from 'lucide-react';
import { Fragment } from 'react';
import { Avatar } from './chat-avatar';

/** Messages this close together from one side read as one run, as in Instagram's messages. */
const RUN_MS = 5 * 60_000;

/** A gap this long gets the time written above what follows. */
const GAP_MS = 30 * 60_000;

type Item =
    | { kind: 'sent'; key: string; mine: boolean; at: number; message: Message }
    | { kind: 'pending'; key: string; mine: true; at: number; message: PendingMessage & { error?: string } };

/**
 * A conversation laid out the way Instagram's messages are, in the site's
 * colours: round bubbles, one's own on the right; a run of messages from
 * one side close together, the bubbles joined along their inner edge; the
 * other side's picture once, beside the last of their run; and the time
 * written above a stretch only when one begins - not under every message.
 */
export default function ChatMessages({
    messages,
    pending,
    other,
    onRetry,
    onDiscard,
}: {
    messages: Message[];
    pending: (PendingMessage & { error?: string })[];
    other: { name: string; avatar: string | null };
    onRetry: (message: PendingMessage) => void;
    onDiscard: (message: PendingMessage) => void;
}) {
    const items: Item[] = [
        ...messages.map((message): Item => ({
            kind: 'sent',
            key: `m${message.id}`,
            mine: message.mine,
            at: Date.parse(message.created_at),
            message,
        })),
        ...pending.map((message): Item => ({ kind: 'pending', key: `p${message.key}`, mine: true, at: Date.parse(message.created_at), message })),
    ];

    const joins = (a: Item | undefined, b: Item | undefined) => Boolean(a && b && a.mine === b.mine && Math.abs(b.at - a.at) < RUN_MS);

    return (
        <div className="flex flex-col">
            {items.map((item, index) => {
                const previous = items[index - 1];
                const next = items[index + 1];
                const newStretch = !previous || item.at - previous.at > GAP_MS;
                const withPrevious = !newStretch && joins(previous, item);
                const withNext = joins(item, next) && !(next && next.at - item.at > GAP_MS);
                const failed = item.kind === 'pending' && item.message.failed;

                return (
                    <Fragment key={item.key}>
                        {newStretch && (
                            <p className="text-muted-foreground my-3 text-center text-[0.7rem] font-medium">{formatChatTime(new Date(item.at))}</p>
                        )}

                        <div className={cn('flex items-end gap-2', item.mine ? 'justify-end' : 'justify-start', withPrevious ? 'mt-0.5' : 'mt-2.5')}>
                            {!item.mine &&
                                (withNext ? (
                                    <span className="w-7 shrink-0" aria-hidden />
                                ) : (
                                    <Avatar path={other.avatar} name={other.name} className="size-7 text-xs" />
                                ))}

                            <div
                                title={formatChatTime(new Date(item.at))}
                                className={cn(
                                    'max-w-[78%] rounded-[1.3rem] px-3.5 py-2 text-sm leading-5 break-words whitespace-pre-line',
                                    item.mine ? 'bg-primary text-primary-foreground' : 'bg-muted',
                                    // The inner edge of a run is joined, as one block.
                                    item.mine && withPrevious && 'rounded-tr-md',
                                    item.mine && withNext && 'rounded-br-md',
                                    !item.mine && withPrevious && 'rounded-tl-md',
                                    !item.mine && withNext && 'rounded-bl-md',
                                    failed && 'border-destructive/50 text-foreground border border-dashed bg-transparent',
                                )}
                            >
                                <span className="sr-only">{item.mine ? t('Vi') : other.name}: </span>
                                {item.kind === 'sent' && item.message.product && (
                                    <div className="-mx-1.5 mb-1.5">
                                        <ProductPreview product={item.message.product} mine={item.mine} />
                                    </div>
                                )}
                                {item.kind === 'sent' && item.message.wanted_ad && (
                                    <Link
                                        href={route('wanted.show', item.message.wanted_ad.id)}
                                        className="mb-1.5 block text-xs underline underline-offset-2 opacity-80"
                                    >
                                        {t('Odgovor na oglas')}: {item.message.wanted_ad.title}
                                    </Link>
                                )}
                                {item.message.body}
                            </div>
                        </div>

                        {item.kind === 'pending' && failed && (
                            <div className="mt-1 flex flex-col items-end gap-0.5 text-[0.7rem]" role="alert">
                                <span className="text-destructive flex items-center gap-1">
                                    <TriangleAlert className="size-3" />
                                    {t('Nije poslato')}
                                    {item.message.error ? ` — ${item.message.error}` : ''}
                                </span>
                                <span className="flex gap-3">
                                    <button type="button" onClick={() => onRetry(item.message)} className="font-medium underline underline-offset-2">
                                        {t('Pokušaj ponovo')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDiscard(item.message)}
                                        className="text-muted-foreground underline underline-offset-2"
                                    >
                                        {t('Odbaci')}
                                    </button>
                                </span>
                            </div>
                        )}
                    </Fragment>
                );
            })}
        </div>
    );
}
