import ClosedNotice from '@/components/messages/closed-notice';
import Composer from '@/components/messages/composer';
import { Button } from '@/components/ui/button';
import { TOUCH_SCREEN, useMediaQuery } from '@/hooks/use-media-query';
import { chat, threadKey, useChat, type ThreadRef } from '@/lib/chat/store';
import { t } from '@/lib/i18n';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ArrowDown, ArrowLeft, LoaderCircle, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Avatar } from './chat-avatar';
import ChatMessages from './chat-messages';

/** How close to the bottom still counts as reading the newest messages. */
const FOLLOW_PX = 80;

/** Checking for replies: soon while a conversation is lively, slower as it goes quiet. */
const FASTEST_MS = 3_000;
const SLOWEST_MS = 20_000;

/**
 * Asks for what came since the last message while the conversation is open
 * and in view, and says it was read; stops when the window is folded away
 * or closed, and when this page goes. One loop at a time: the next check is
 * scheduled only when the last has answered.
 */
function useThreadUpdates(ref: ThreadRef, open: boolean) {
    const key = threadKey(ref);
    const { producerId, buyerId } = ref;

    useEffect(() => {
        if (!open) {
            return;
        }

        let delay = FASTEST_MS;
        let timer: number | undefined;
        let stopped = false;

        const check = async () => {
            window.clearTimeout(timer);

            const visible = document.visibilityState === 'visible';
            const arrived = await chat.refresh({ producerId, buyerId }, { read: visible });

            if (stopped) {
                return;
            }

            delay = arrived ? FASTEST_MS : Math.min(SLOWEST_MS, Math.round(delay * 1.5));
            timer = window.setTimeout(check, document.visibilityState === 'visible' ? delay : SLOWEST_MS);
        };

        // Back to the tab: look now, and count what is on screen as read.
        const wake = () => {
            if (document.visibilityState === 'visible') {
                delay = FASTEST_MS;
                void check();
            }
        };

        void check();
        document.addEventListener('visibilitychange', wake);

        return () => {
            stopped = true;
            window.clearTimeout(timer);
            document.removeEventListener('visibilitychange', wake);
        };
    }, [key, producerId, buyerId, open]);
}

/**
 * One conversation in the chat window: who it is with, the messages, and
 * the box to write in - the same messages and the same box as its page.
 */
export default function ChatThread({ thread: ref }: { thread: ThreadRef }) {
    const { auth } = usePage<SharedData>().props;
    const state = useChat();
    const key = threadKey(ref);
    const thread = state.threads[key];
    const messages = thread?.messages ?? [];
    const pending = thread?.pending ?? [];
    const meta = thread?.meta;
    const title = meta?.title ?? ref.title ?? '';
    const avatar = meta ? meta.avatar_path : ref.avatarPath;
    const isOwner = auth.user?.id !== ref.buyerId;
    // On a touch screen the keyboard is not opened before one asks for it.
    const touch = useMediaQuery(TOUCH_SCREEN);

    // Only while the window is open: folded into the button, nothing is asked and nothing counts as read.
    useThreadUpdates(ref, state.open);

    // The conversation opens on its newest message and follows new ones -
    // unless the reader has scrolled up into the history, who is left there
    // and told that something new is below.
    const panel = useRef<HTMLDivElement>(null);
    const following = useRef(true);
    const heightBeforeOlder = useRef<number | null>(null);
    const [newBelow, setNewBelow] = useState(false);
    const newest = messages[messages.length - 1]?.id ?? 0;
    const failedCount = pending.filter((message) => message.failed).length;
    const oldest = messages[0]?.id ?? 0;

    useLayoutEffect(() => {
        const box = panel.current;

        if (!box) {
            return;
        }

        if (heightBeforeOlder.current !== null) {
            // History added above: what was being read stays where it was.
            box.scrollTop += box.scrollHeight - heightBeforeOlder.current;
            heightBeforeOlder.current = null;
        } else if (following.current) {
            box.scrollTop = box.scrollHeight;
        } else if (newest) {
            setNewBelow(true);
        }
        // A send that failed grows a line saying why: it has to be in view too.
    }, [newest, oldest, pending.length, failedCount]);

    const onScroll = () => {
        const box = panel.current;

        if (box) {
            following.current = box.scrollHeight - box.scrollTop - box.clientHeight < FOLLOW_PX;

            if (following.current) {
                setNewBelow(false);
            }
        }
    };

    const toBottom = () => {
        following.current = true;
        setNewBelow(false);
        panel.current?.scrollTo({ top: panel.current.scrollHeight });
    };

    const olderMessages = () => {
        heightBeforeOlder.current = panel.current?.scrollHeight ?? null;
        void chat.loadOlder(ref);
    };

    const blockedByMe = meta?.blocked_by === (isOwner ? 'producer' : 'buyer');

    return (
        <div className="flex h-full min-h-0 flex-col">
            <header className="border-border/70 flex items-center gap-1 border-b py-2 pr-2 pl-1">
                <Button variant="ghost" size="icon" aria-label={t('Nazad na razgovore')} onClick={chat.backToList}>
                    <ArrowLeft className="size-5" />
                </Button>
                <Link
                    href={meta?.href ?? '#'}
                    onClick={() => chat.close()}
                    className="hover:bg-muted flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-1.5 py-1 transition-colors"
                    title={t('Otvori ceo razgovor')}
                >
                    <Avatar path={avatar ?? null} name={title} />
                    <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{title}</span>
                        <span className="text-muted-foreground block truncate text-xs">{t('Otvori ceo razgovor')}</span>
                    </span>
                </Link>
                <Button variant="ghost" size="icon" aria-label={t('Spusti poruke')} onClick={chat.close}>
                    <X className="size-5" />
                </Button>
            </header>

            <div className="relative min-h-0 flex-1">
                <div
                    ref={panel}
                    onScroll={onScroll}
                    role="log"
                    aria-label={t('Poruke sa :name', { name: title })}
                    className="h-full overflow-y-auto overscroll-contain px-3 pt-1 pb-3"
                >
                    {thread?.hasOlder && (
                        <div className="flex justify-center">
                            <button
                                type="button"
                                onClick={olderMessages}
                                disabled={thread.loadingOlder}
                                className="border-border/70 hover:bg-muted rounded-full border px-3 py-1 text-xs transition-colors"
                            >
                                {thread.loadingOlder ? t('Učitavam…') : t('Starije poruke')}
                            </button>
                        </div>
                    )}

                    {!meta && thread?.loading && (
                        <p className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
                            <LoaderCircle className="size-4 animate-spin" aria-hidden />
                            {t('Učitavam razgovor…')}
                        </p>
                    )}

                    {thread?.error && (
                        <div className="text-destructive py-6 text-center text-sm" role="alert">
                            <p>{thread.error}</p>
                            <button
                                type="button"
                                className="mt-2 underline underline-offset-4"
                                onClick={() => void chat.refresh(ref, { read: true })}
                            >
                                {t('Pokušaj ponovo')}
                            </button>
                        </div>
                    )}

                    {meta && messages.length === 0 && pending.length === 0 && (
                        <p className="text-muted-foreground py-8 text-center text-sm">
                            {t('Još nema poruka. Napišite prvu — pitajte za dostupnost, količine ili dostavu.')}
                        </p>
                    )}

                    <ChatMessages
                        messages={messages}
                        pending={pending}
                        other={{ name: title, avatar: avatar ?? null }}
                        onRetry={(message) => void chat.send(ref, message.body, message.key)}
                        onDiscard={(message) => chat.discard(ref, message.key)}
                    />
                </div>

                {newBelow && (
                    <button
                        type="button"
                        onClick={toBottom}
                        className="bg-primary text-primary-foreground absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium shadow-md"
                    >
                        <ArrowDown className="size-3.5" />
                        {t('Nova poruka')}
                    </button>
                )}
            </div>

            {meta && (meta.closed || meta.blocked_by) ? (
                <ClosedNotice closed={meta.closed} blockedBy={meta.blocked_by} blockedByMe={blockedByMe} isOwner={isOwner} otherName={title} />
            ) : (
                <Composer
                    // Each conversation keeps its own unsent text.
                    key={key}
                    draft={state.drafts[key] ?? ''}
                    onDraftChange={(text) => chat.setDraft(key, text)}
                    autoFocus={!touch}
                    pill
                    className="border-t-0 py-2"
                    onSend={(text) => {
                        following.current = true;
                        chat.setDraft(key, '');
                        void chat.send(ref, text);
                    }}
                />
            )}
        </div>
    );
}
