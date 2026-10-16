import { chat } from '@/lib/chat/store';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { type ComponentProps } from 'react';

/**
 * "Pošalji poruku" to a producer: opens the conversation in the chat window
 * on the page one is on. Still a link to the conversation's page - for a new
 * tab, without scripts, for a guest (who is asked to sign in there), and on
 * a page with no chat window.
 */
export default function ChatLink({
    producer,
    onClick,
    ...props
}: Omit<ComponentProps<typeof Link>, 'href'> & { producer: { id: number; name: string; slug: string; logo_path?: string | null } }) {
    const { auth } = usePage<SharedData>().props;

    return (
        <Link
            href={route('messages.show', producer.slug)}
            onClick={(event) => {
                onClick?.(event);

                const plain = !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

                if (plain && auth.user && chat.available()) {
                    event.preventDefault();
                    chat.openThread({ producerId: producer.id, buyerId: auth.user.id, title: producer.name, avatarPath: producer.logo_path ?? null });
                }
            }}
            {...props}
        />
    );
}
