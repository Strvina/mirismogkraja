import { Button } from '@/components/ui/button';
import { chat, useChat } from '@/lib/chat/store';
import { formatRelativeTime } from '@/lib/format';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { LoaderCircle, X } from 'lucide-react';
import { useEffect } from 'react';
import { Avatar } from './chat-thread';

/** How often the open list looks for new conversations and replies. */
const LIST_REFRESH_MS = 20_000;

/** The conversations, newest first: who, the last word, and what is unread. */
export default function ChatList() {
    const { list } = useChat();

    // Fresh while it is open; nothing at all while it is not.
    useEffect(() => {
        const timer = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                void chat.loadList();
            }
        }, LIST_REFRESH_MS);

        return () => window.clearInterval(timer);
    }, []);

    return (
        <div className="flex h-full min-h-0 flex-col">
            <header className="border-border/70 flex items-center justify-between gap-2 border-b py-2 pr-2 pl-4">
                <h2 className="font-serif text-lg">{t('Poruke')}</h2>
                <div className="flex items-center gap-1">
                    <Link
                        href={route('messages.index')}
                        onClick={() => chat.close()}
                        className="text-primary rounded-md px-2 py-1 text-xs font-medium hover:underline"
                    >
                        {t('Sve poruke')}
                    </Link>
                    <Button variant="ghost" size="icon" className="size-8" aria-label={t('Zatvori poruke')} onClick={chat.close}>
                        <X className="size-4" />
                    </Button>
                </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {list.error && (
                    <div className="text-destructive px-4 py-6 text-center text-sm" role="alert">
                        <p>{list.error}</p>
                        <button type="button" className="mt-2 underline underline-offset-4" onClick={() => void chat.loadList()}>
                            {t('Pokušaj ponovo')}
                        </button>
                    </div>
                )}

                {!list.loaded && list.loading && (
                    <p className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
                        <LoaderCircle className="size-4 animate-spin" aria-hidden />
                        {t('Učitavam razgovore…')}
                    </p>
                )}

                {list.loaded && list.items.length === 0 && (
                    <p className="text-muted-foreground px-6 py-10 text-center text-sm leading-6">
                        {t('Još nemate razgovora. Proizvođaču pišete sa njegove stranice, dugmetom „Pošalji poruku”.')}
                    </p>
                )}

                <ul>
                    {list.items.map((item) => (
                        <li key={item.key}>
                            <button
                                type="button"
                                onClick={() =>
                                    chat.openThread({
                                        producerId: item.producer_id,
                                        buyerId: item.buyer_id,
                                        title: item.title,
                                        avatarPath: item.avatar_path,
                                    })
                                }
                                className="hover:bg-muted flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
                            >
                                <Avatar path={item.avatar_path} name={item.title} className="size-11" />
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-baseline justify-between gap-2">
                                        <span className={cn('truncate text-sm', item.unread > 0 ? 'font-semibold' : 'font-medium')}>
                                            {item.title}
                                        </span>
                                        <span className="text-muted-foreground shrink-0 text-[0.7rem]">{formatRelativeTime(item.last_at)}</span>
                                    </span>
                                    {item.subtitle && <span className="text-muted-foreground block truncate text-xs">{item.subtitle}</span>}
                                    <span className="flex items-center justify-between gap-2">
                                        <span
                                            className={cn(
                                                'truncate text-sm',
                                                item.unread > 0 ? 'text-foreground font-medium' : 'text-muted-foreground',
                                            )}
                                        >
                                            {item.last_mine && `${t('Vi')}: `}
                                            {item.last_message}
                                        </span>
                                        {item.unread > 0 && (
                                            <span className="bg-primary text-primary-foreground shrink-0 rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums">
                                                <span className="sr-only">{t('Nepročitano')}: </span>
                                                {item.unread > 99 ? '99+' : item.unread}
                                            </span>
                                        )}
                                    </span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
