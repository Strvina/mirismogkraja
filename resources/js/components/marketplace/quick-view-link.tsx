import { Link } from '@inertiajs/react';
import { type ComponentProps, createContext, type MouseEvent, useContext, useEffect, useRef } from 'react';

/** What a card already knows about a product: enough to show it the moment it is clicked. */
export interface QuickViewPreview {
    name: string;
    price?: string;
    unit?: string;
    /** The card's photo, already loaded. */
    image?: string | null;
    producer?: { name: string; city: string | null } | null;
}

export interface QuickViewActions {
    /** Opens the product over the list, showing what is known at once. */
    open: (href: string, preview?: QuickViewPreview) => void;
    /** Starts asking for the product before the click, so it is there when the click comes. */
    prefetch: (href: string) => void;
}

/** Provided by QuickViewProvider. */
export const QuickViewContext = createContext<QuickViewActions | null>(null);

/** How long a pointer rests on a card before it counts as interest, not passing over. */
const HOVER_MS = 70;

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
 *
 * The product is asked for at the first sign of interest - the mouse
 * resting on the card, a finger touching it, the keyboard reaching it - so
 * by the click it has usually arrived; and the card's own photo, name and
 * price fill the popup at once if it has not.
 */
export function QuickViewLink({
    href,
    preview,
    onClick,
    onPointerEnter,
    onPointerLeave,
    onPointerDown,
    onFocus,
    ...props
}: ComponentProps<typeof Link> & { href: string; preview?: QuickViewPreview }) {
    const quick = useQuickView();
    const hover = useRef<number | undefined>(undefined);

    // A card that goes (a new page of results) takes its pending "interest" with it.
    useEffect(() => () => window.clearTimeout(hover.current), []);

    return (
        <Link
            href={href}
            onPointerEnter={(event) => {
                onPointerEnter?.(event);

                if (quick && event.pointerType === 'mouse') {
                    hover.current = window.setTimeout(() => quick.prefetch(href), HOVER_MS);
                }
            }}
            onPointerLeave={(event) => {
                onPointerLeave?.(event);
                window.clearTimeout(hover.current);
            }}
            onPointerDown={(event) => {
                onPointerDown?.(event);
                quick?.prefetch(href);
            }}
            onFocus={(event) => {
                onFocus?.(event);
                quick?.prefetch(href);
            }}
            onClick={(event) => {
                onClick?.(event);

                if (quick && plainClick(event)) {
                    event.preventDefault();
                    quick.open(href, preview);
                }
            }}
            {...props}
        />
    );
}
