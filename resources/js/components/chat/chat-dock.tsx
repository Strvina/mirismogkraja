import { TOUCH_SCREEN, useMediaQuery } from '@/hooks/use-media-query';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { useVisualViewport } from '@/hooks/use-visual-viewport';
import { chat, threadKey, useChat } from '@/lib/chat/store';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { MessageCircle, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import ChatList from './chat-list';
import ChatThread, { Avatar } from './chat-thread';

/**
 * Messages in the corner of every page, the way Messenger has them: a
 * button with the unread count opens the list of conversations, and a
 * conversation opens in a small window at the foot of the screen - read
 * and answered without leaving the page one is on. Folded into a bar it
 * keeps the conversation and anything typed; closed, it goes, and the
 * conversation stays where it always is, on its page.
 *
 * On a phone the list and a conversation take the screen, over the page,
 * which stays still under them; the message box rides above the keyboard.
 *
 * Not on the messages pages: there the conversation is the page.
 */
export default function ChatDock() {
    const { auth, unreadMessages } = usePage<SharedData>().props;
    const { url } = usePage();
    const state = useChat();
    const phone = !useMediaQuery('(min-width: 40rem)');
    const touch = useMediaQuery(TOUCH_SCREEN);
    const onMessagesPage = /^\/poruke(-proizvodjaca)?(\/|$|\?)/.test(url);
    const signedIn = Boolean(auth.user);

    useEffect(() => (signedIn && !onMessagesPage ? chat.attach() : undefined), [signedIn, onMessagesPage]);

    // Signed out and in as someone else in this tab: the last account's
    // conversation and drafts are not theirs to see.
    const userId = auth.user?.id;
    useEffect(() => {
        if (userId) {
            chat.claim(userId);
        }
    }, [userId]);

    const active = state.owner === userId ? state.active : null;

    const listOpen = state.panel === 'list';
    const threadOpen = state.panel === 'thread' && active !== null && !state.minimized;
    const takesScreen = phone && (listOpen || threadOpen);

    const panel = useRef<HTMLDivElement>(null);
    useScrollLock(takesScreen, panel);
    const viewport = useVisualViewport(takesScreen);

    // Escape folds a conversation away and closes the list.
    useEffect(() => {
        if (!listOpen && !threadOpen) {
            return;
        }

        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !event.defaultPrevented) {
                if (threadOpen) {
                    chat.minimize();
                } else {
                    chat.close();
                }
            }
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [listOpen, threadOpen]);

    if (!signedIn || onMessagesPage) {
        return null;
    }

    const unread = Number(unreadMessages ?? 0);

    return (
        <>
            {(listOpen || threadOpen) && (
                <div
                    ref={panel}
                    role="dialog"
                    aria-modal={takesScreen || undefined}
                    aria-label={threadOpen ? t('Razgovor') : t('Poruke')}
                    style={takesScreen && viewport ? { top: viewport.top, height: viewport.height } : undefined}
                    className={cn(
                        'bg-background fixed z-[60] flex flex-col overflow-hidden shadow-2xl',
                        takesScreen
                            ? 'inset-x-0 top-0 h-[100dvh]'
                            : cn(
                                  'border-border/70 right-4 w-[23rem] rounded-xl border',
                                  threadOpen ? 'bottom-4 h-[min(34rem,calc(100dvh-7rem))]' : 'bottom-22 h-[min(32rem,calc(100dvh-9rem))]',
                              ),
                    )}
                >
                    {threadOpen && active ? <ChatThread key={threadKey(active)} thread={active} phone={phone} /> : <ChatList />}
                </div>
            )}

            {/* Folded away: the conversation as a bar, to bring back or close. */}
            {state.panel === 'thread' && active && state.minimized && (
                <div className="border-border/70 bg-background fixed right-22 bottom-4 z-40 flex max-w-[calc(100vw-7rem)] items-center rounded-full border shadow-lg sm:max-w-56">
                    <button
                        type="button"
                        onClick={chat.restore}
                        className="hover:bg-muted flex min-w-0 flex-1 items-center gap-2 rounded-full py-1.5 pr-1 pl-1.5 text-left text-sm font-medium"
                        aria-label={t('Otvori razgovor sa :name', { name: active.title ?? '' })}
                    >
                        <Avatar
                            path={state.threads[threadKey(active)]?.meta?.avatar_path ?? active.avatarPath ?? null}
                            name={active.title ?? ''}
                            className="size-8"
                        />
                        <span className="truncate">{state.threads[threadKey(active)]?.meta?.title ?? active.title}</span>
                    </button>
                    <button
                        type="button"
                        onClick={chat.close}
                        aria-label={t('Zatvori razgovor')}
                        className="hover:bg-muted mr-1 grid size-8 shrink-0 place-items-center rounded-full"
                    >
                        <X className="size-4" />
                    </button>
                </div>
            )}

            {/* The way in, unless a conversation already fills its corner. */}
            {!threadOpen && !takesScreen && (
                <button
                    type="button"
                    onClick={() => (listOpen ? chat.close() : chat.openList())}
                    aria-expanded={listOpen}
                    aria-label={unread > 0 ? t('Poruke, nepročitanih: :count', { count: unread }) : t('Poruke')}
                    className={cn(
                        'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/50 fixed right-4 bottom-4 z-40 grid size-14 place-items-center rounded-full shadow-lg transition-colors focus-visible:ring-4 focus-visible:outline-none',
                        // A thumb's reach on a phone, and out of the way of the page's own last line.
                        touch && 'size-13',
                    )}
                >
                    {listOpen ? <X className="size-6" /> : <MessageCircle className="size-6" />}
                    {unread > 0 && !listOpen && (
                        <span
                            className="bg-background text-primary ring-primary absolute -top-1 -right-1 min-w-5 rounded-full px-1 text-center text-[0.7rem] leading-5 font-bold tabular-nums ring-2"
                            aria-hidden
                        >
                            {unread > 99 ? '99+' : unread}
                        </span>
                    )}
                </button>
            )}
        </>
    );
}
