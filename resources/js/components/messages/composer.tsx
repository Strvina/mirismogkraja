import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { SendHorizontal } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, useRef, useState } from 'react';

/** The composer grows with the message, up to about six lines. */
const MAX_HEIGHT_PX = 160;

/**
 * The message box at the bottom of a conversation. Enter sends, Shift+Enter
 * starts a new line; the composing check keeps Enter from sending half a
 * word while an input method is still assembling it.
 */
export default function Composer({ onSend }: { onSend: (text: string) => void }) {
    const [body, setBody] = useState('');
    const field = useRef<HTMLTextAreaElement>(null);

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

    return (
        <form onSubmit={submit} className="border-border/70 flex items-end gap-2 border-t px-3 py-3">
            <textarea
                ref={field}
                value={body}
                onChange={(event) => {
                    setBody(event.target.value);
                    event.target.style.height = 'auto';
                    event.target.style.height = `${Math.min(event.target.scrollHeight, MAX_HEIGHT_PX)}px`;
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                        submit(event);
                    }
                }}
                rows={1}
                maxLength={2000}
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
