import { Link } from '@inertiajs/react';
import { type ComponentProps, createContext, type MouseEvent, useContext } from 'react';

/** Opens a product in the popup over the list; provided by QuickViewProvider. */
export const QuickViewContext = createContext<((href: string) => void) | null>(null);

/** Whether a click is a plain one: with a modifier or another button it opens a tab, as a link does. */
const plainClick = (event: MouseEvent) =>
    !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

/** Opens a product over the list; null where there is no list to stay on. */
export function useQuickView() {
    return useContext(QuickViewContext);
}

/**
 * A link to a product that opens it in the popup when one is at hand, and
 * is a plain link otherwise - and always for a new tab, or without scripts.
 */
export function QuickViewLink({ href, onClick, ...props }: ComponentProps<typeof Link> & { href: string }) {
    const open = useQuickView();

    return (
        <Link
            href={href}
            onClick={(event) => {
                onClick?.(event);

                if (open && plainClick(event)) {
                    event.preventDefault();
                    open(href);
                }
            }}
            {...props}
        />
    );
}
