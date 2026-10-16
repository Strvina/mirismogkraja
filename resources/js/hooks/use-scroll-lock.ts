import { type RefObject, useEffect } from 'react';

/** How many open panels hold the page still; the last to close lets it go. */
let holders = 0;
let released: { overflow: string; overscroll: string } | null = null;

/**
 * Holds the page still while a panel over it is open - a phone menu, a chat
 * - so a drag moves the panel and not what is under it.
 *
 * The root stops scrolling, and on a touch screen a drag that does not
 * start inside the panel is refused: Safari on the iPhone scrolls the page
 * past an `overflow: hidden` root, and passes a drag on a panel that cannot
 * scroll (or is at its end) on to the page, whatever `overscroll-behavior`
 * says. The page keeps its place, so nothing jumps when it is let go, and
 * nothing is left locked when the panel goes away with its page (the
 * cleanup runs then too). Counted, so two panels do not unlock each other.
 */
export function useScrollLock(active: boolean, panel?: RefObject<HTMLElement | null>): void {
    useEffect(() => {
        if (!active) {
            return;
        }

        const root = document.documentElement;

        if (holders === 0) {
            released = { overflow: root.style.overflow, overscroll: root.style.overscrollBehavior };
            root.style.overflow = 'hidden';
            root.style.overscrollBehavior = 'none';
        }

        holders++;

        const refuse = (event: TouchEvent) => {
            if (event.cancelable && !scrollsWithin(event.target as Element, panel?.current ?? null)) {
                event.preventDefault();
            }
        };

        document.addEventListener('touchmove', refuse, { passive: false });

        return () => {
            document.removeEventListener('touchmove', refuse);
            holders--;

            if (holders === 0 && released) {
                root.style.overflow = released.overflow;
                root.style.overscrollBehavior = released.overscroll;
                released = null;
            }
        };
    }, [active, panel]);
}

/**
 * Whether a drag from here has something inside the panel to scroll: an
 * element between the touch and the panel (or the panel) with more to show.
 * One with nothing would hand the drag on to the page.
 */
function scrollsWithin(target: Element | null, panel: HTMLElement | null): boolean {
    if (!panel || !target || !panel.contains(target)) {
        return false;
    }

    for (let node: Element | null = target; node && panel.contains(node); node = node.parentElement) {
        const overflowY = getComputedStyle(node).overflowY;

        if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
            return true;
        }
    }

    // Fields scroll their own text, and sideways rows their own items.
    return target.closest('textarea, input, [data-scroll-x]') !== null;
}

/**
 * Keeps the rest of a touch from scrolling the page: for a touch outside an
 * open menu, which closes it - the finger meant "close", not "scroll", and
 * the page should not slide away under it as the menu lets go.
 */
export function holdTouchUntilItEnds(): void {
    const refuse = (event: TouchEvent) => event.cancelable && event.preventDefault();
    const end = () => {
        document.removeEventListener('touchmove', refuse);
        document.removeEventListener('touchend', end);
        document.removeEventListener('touchcancel', end);
    };

    document.addEventListener('touchmove', refuse, { passive: false });
    document.addEventListener('touchend', end);
    document.addEventListener('touchcancel', end);
}
