import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { t } from '@/lib/i18n';
import { Link } from '@inertiajs/react';
import { SendHorizontal, Zap } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, useRef, useState } from 'react';
import { type QuickReply } from './types';

/** The composer grows with the message, up to about six lines. */
const MAX_HEIGHT_PX = 160;

const MAX_LENGTH = 2000;

/**
 * The message box at the bottom of a conversation. Enter sends, Shift+Enter
 * starts a new line; the composing check keeps Enter from sending half a
 * word while an input method is still assembling it.
 *
 * A producer also gets their saved answers: picking one writes it into the
 * box, to be read over and sent like anything typed - never sent by itself.
 */
export default function Composer({
    onSend,
    quickReplies,
}: {
    onSend: (text: string) => void;
    /** Present on the producer's side of a thread only. */
    quickReplies?: { items: QuickReply[]; manageHref: string; recipientName: string };
}) {
    const [body, setBody] = useState('');
    const field = useRef<HTMLTextAreaElement>(null);

    const fitHeight = () => {
        if (field.current) {
            field.current.style.height = 'auto';
            field.current.style.height = `${Math.min(field.current.scrollHeight, MAX_HEIGHT_PX)}px`;
        }
    };

    const submit = (event: FormEvent | KeyboardEvent) => {
        event.preventDefault();

        const text = body.trim();

        if (!text) {
            return;
        }

        setBody('');

        if (field.current) {
            field.current.style.height = 'auto';
            field.current.focus();
        }

        onSend(text);
    };

    /** Added after whatever is already typed, with {ime} filled in. */
    const insert = (reply: QuickReply) => {
        const text = reply.body.replaceAll('{ime}', quickReplies?.recipientName ?? '');

        setBody((current) => (current.trim() ? `${current.trimEnd()}\n${text}` : text).slice(0, MAX_LENGTH));
        // After React has written the new text into the box.
        requestAnimationFrame(() => {
            fitHeight();
            field.current?.focus();
        });
    };

    return (
        <form onSubmit={submit} className="border-border/70 flex items-end gap-2 border-t px-3 py-3">
            {quickReplies && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline" size="icon" aria-label={t('Brzi odgovori')} className="size-11 shrink-0">
                            <Zap className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="top" className="max-h-72 w-72 overflow-y-auto">
                        {quickReplies.items.length === 0 ? (
                            <p className="text-muted-foreground px-2 py-2 text-xs leading-5">
                                {t('Sačuvajte odgovore koje često šaljete — cene, dostavu, gde vas mogu naći — i ubacite ih jednim dodirom.')}
                            </p>
                        ) : (
                            quickReplies.items.map((reply) => (
                                <DropdownMenuItem
                                    key={reply.id}
                                    onSelect={() => insert(reply)}
                                    className="cursor-pointer flex-col items-start gap-0.5 py-2"
                                >
                                    <span className="text-sm font-medium">{reply.title}</span>
                                    <span className="text-muted-foreground line-clamp-2 text-xs">{reply.body}</span>
                                </DropdownMenuItem>
                            ))
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href={quickReplies.manageHref} className="text-primary cursor-pointer py-2 text-sm font-medium">
                                {quickReplies.items.length === 0 ? t('Dodaj brze odgovore') : t('Uredi brze odgovore')}
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
            <textarea
                ref={field}
                value={body}
                onChange={(event) => {
                    setBody(event.target.value);
                    fitHeight();
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                        submit(event);
                    }
                }}
                rows={1}
                maxLength={MAX_LENGTH}
                placeholder={t('Napišite poruku...')}
                aria-label={t('Poruka')}
                className="border-input bg-background max-h-40 min-h-11 flex-1 resize-none rounded-md border px-3 py-2.5 text-sm"
            />
            <Button type="submit" size="icon" disabled={!body.trim()} aria-label={t('Pošalji poruku')} className="size-11 shrink-0">
                <SendHorizontal className="size-4" />
            </Button>
        </form>
    );
}
