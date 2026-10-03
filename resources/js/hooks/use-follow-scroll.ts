import { useLayoutEffect, useRef } from 'react';

/** How close to the bottom still counts as "following the conversation". */
const STICK_TO_BOTTOM_PX = 80;

/**
 * Keeps a chat panel at its newest message - but only for a reader already
 * there. Someone scrolled up re-reading the history is left where they are.
 *
 * Runs before paint, so the thread never flashes at the wrong position on
 * first render or when a reply arrives. Stepping to an older page scrolls
 * to the bottom too: the end of an older page is where the part just read
 * begins.
 */
export function useFollowScroll({ newestKey, page }: { newestKey: unknown; page: number }) {
    const panelRef = useRef<HTMLDivElement>(null);
    const following = useRef(true);
    const shownPage = useRef(page);

    useLayoutEffect(() => {
        const panel = panelRef.current;

        if (!panel) {
            return;
        }

        const pageChanged = shownPage.current !== page;
        shownPage.current = page;

        if (pageChanged || following.current) {
            panel.scrollTop = panel.scrollHeight;
        }
    }, [newestKey, page]);

    const onScroll = () => {
        const panel = panelRef.current;

        if (panel) {
            following.current = panel.scrollHeight - panel.scrollTop - panel.clientHeight < STICK_TO_BOTTOM_PX;
        }
    };

    /** Sending always brings you back to the newest message, wherever you had scrolled to. */
    const follow = () => {
        following.current = true;
    };

    return { panelRef, onScroll, follow };
}
