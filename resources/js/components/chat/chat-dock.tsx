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
import ChatThread from './chat-thread';

/**
 * Messages in the corner of every page, the way Instagram has them: the
 * chat button, with the unread count, opens a window on the list of
 * conversations; a conversation opens in the same window, with "back" to
 * the list; the cross folds the window into the button again, as it is -
 * the button brings it back on the list or the conversation it was left on.
 * Read and answered without leaving the page one is on.
 *
 * On a phone the window takes the screen, over the page, which stays still
 * under it; the message box rides above the keyboard.
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

    const mine = state.owner === userId;
    const open = mine && state.open;
    const active = mine && state.view === 'thread' ? state.active : null;
    const takesScreen = phone && open;

    const panel = useRef<HTMLDivElement>(null);
    useScrollLock(takesScreen, panel);
    const viewport = useVisualViewport(takesScreen);

    // Escape: back from a conversation to the list, then folded into the button.
    useEffect(() => {
        if (!open) {
            return;
        }

        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !event.defaultPrevented) {
                if (active) {
                    chat.backToList();
                } else {
                    chat.close();
                }
            }
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [open, active]);

    if (!signedIn || onMessagesPage) {
        return null;
    }

    const unread = Number(unreadMessages ?? 0);

    return (
        <>
            {open && (
                <div
                    ref={panel}
                    role="dialog"
                    aria-modal={takesScreen || undefined}
                    aria-label={active ? t('Razgovor') : t('Poruke')}
                    style={takesScreen && viewport ? { top: viewport.top, height: viewport.height } : undefined}
                    className={cn(
                        'bg-background animate-in fade-in-0 fixed z-[60] flex flex-col overflow-hidden shadow-2xl duration-150',
                        takesScreen
                            ? 'inset-x-0 top-0 h-[100dvh]'
                            : 'border-border/70 slide-in-from-bottom-4 right-4 bottom-22 h-[min(36rem,calc(100dvh-8rem))] w-[23rem] rounded-2xl border',
                    )}
                >
                    {active ? <ChatThread key={threadKey(active)} thread={active} /> : <ChatList />}
                </div>
            )}

            {/* The way in - and, with the window open on a computer, the way to fold it back in. */}
            {!takesScreen && (
                <button
                    type="button"
                    onClick={() => (open ? chat.close() : chat.open())}
                    aria-expanded={open}
                    aria-label={open ? t('Spusti poruke') : unread > 0 ? t('Poruke, nepročitanih: :count', { count: unread }) : t('Poruke')}
                    className={cn(
                        'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/50 fixed right-4 bottom-4 z-40 grid size-14 place-items-center rounded-full shadow-lg transition-colors focus-visible:ring-4 focus-visible:outline-none',
                        // A thumb's reach on a phone, and out of the way of the page's own last line.
                        touch && 'size-13',
                    )}
                >
                    {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
                    {unread > 0 && !open && (
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
