import ClosedNotice from '@/components/messages/closed-notice';
import Composer from '@/components/messages/composer';
import { MessageBubble, PendingBubble } from '@/components/messages/message-bubbles';
import OutcomeBar from '@/components/messages/outcome-bar';
import ThreadHeader from '@/components/messages/thread-header';
import { type Message, type ThreadSide } from '@/components/messages/types';
import { useAdaptivePoll } from '@/hooks/use-adaptive-poll';
import { useFollowScroll } from '@/hooks/use-follow-scroll';
import { useOptimisticSend } from '@/hooks/use-optimistic-send';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

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
    blockedBy: ThreadSide | null;
    /** Which side has left the site, if one has. */
    closed: ThreadSide | null;
    reportReasons: Record<string, string>;
    outcome: string | null;
    outcomeLabels: Record<string, string>;
}) {
    const { auth } = usePage<SharedData>().props;

    // An open conversation checks for replies on its own, so neither side has
    // to refresh to see one. Opening this page is also what marks the other
    // side's messages as read - so a reply that arrives while it's open is
    // read straight away and never lights the badge up. Every 3 seconds
    // while messages are coming, slowing to 20 when the conversation goes
    // quiet; the newest message's id is what counts as something happening.
    const poll = useAdaptivePoll(['messages', 'unreadMessages', 'blockedBy'], messages.data[0]?.id);

    // The seller's side addresses a specific buyer; the buyer's side doesn't
    // need to say who they are.
    const sending = useOptimisticSend({
        url: isOwner ? route('messages.thread.store', [producer.id, buyer.id]) : route('messages.store', producer.slug),
        delivered: messages.data,
        pausePolling: poll.stop,
        resumePolling: poll.start,
    });

    const scroll = useFollowScroll({
        newestKey: `${messages.data[messages.data.length - 1]?.id ?? 0}-${sending.pendingCount}`,
        page: messages.current_page,
    });

    const title = isOwner ? buyer.name : producer.name;
    const blockedByMe = blockedBy === (isOwner ? 'producer' : 'buyer');
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Moje poruke'), href: '/poruke' },
        { title, href: '#' },
    ];

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Poruke')} — ${title}`} />

            <div className="border-border/70 bg-background mx-auto flex h-[calc(100svh-15rem)] max-h-[44rem] min-h-[26rem] w-full max-w-2xl flex-col overflow-hidden rounded-lg border">
                <ThreadHeader
                    title={title}
                    avatar={isOwner ? buyer.avatar_path : producer.logo_path}
                    producer={producer}
                    buyerId={buyer.id}
                    isOwner={isOwner}
                    blocked={blockedBy !== null}
                    blockedByMe={blockedByMe}
                    reportReasons={reportReasons}
                />

                {isOwner && <OutcomeBar producerId={producer.id} buyerId={buyer.id} outcome={outcome} labels={outcomeLabels} />}

                <div ref={scroll.panelRef} onScroll={scroll.onScroll} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                    {/* Older messages live above, as in any chat. The paginator
                        walks backwards, so its "next" page is the older part. */}
                    {messages.next_page_url && (
                        <div className="flex justify-center pb-1">
                            <Link
                                href={messages.next_page_url}
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
                        messages.data.map((message) => <MessageBubble key={message.id} message={message} />)
                    )}

                    {sending.awaiting.map((message) => (
                        <PendingBubble
                            key={message.key}
                            message={message}
                            senderName={auth.user?.name ?? ''}
                            onRetry={() => sending.retry(message)}
                            onDiscard={() => sending.discard(message)}
                        />
                    ))}
                </div>

                {closed || blockedBy ? (
                    <ClosedNotice closed={closed} blockedBy={blockedBy} blockedByMe={blockedByMe} isOwner={isOwner} otherName={title} />
                ) : (
                    <Composer
                        onSend={(text) => {
                            scroll.follow();
                            sending.send(text);
                        }}
                    />
                )}
            </div>
        </MarketplaceLayout>
    );
}
