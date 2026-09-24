import { router } from '@inertiajs/react';

/**
 * Makes the Back and Forward buttons show current data.
 *
 * Inertia stores the props of every page it visits in the browser's history
 * state and, on a popstate, swaps them straight back in without asking the
 * server. That is fast, but it means going Back lands on a photograph of the
 * page taken before whatever the user did in between: an inbox that still
 * counts a message as unread, and still shows the message before the reply
 * that was just sent.
 *
 * The server can't fix this on its own. `Inertia::clearHistory()` only drops
 * the key used to decrypt stored history, so it has no effect unless history
 * encryption is switched on for the whole app - which exists for keeping
 * sensitive data out of the browser, not for freshness.
 *
 * So the client revalidates instead: after Inertia has restored a page from
 * history, re-request that same page. `reload` keeps the scroll position and
 * local component state, so the only visible change is data that had gone
 * stale. Ordinary Link navigation already hits the server and is left alone.
 */
export function revalidateOnHistoryNavigation(): void {
    let restoringFromHistory = false;

    window.addEventListener('popstate', () => {
        restoringFromHistory = true;
    });

    // Fired after the restored page has been swapped in - reloading from
    // here, rather than from the popstate listener, keeps the fresh response
    // from racing the cached one Inertia is still applying.
    router.on('navigate', () => {
        if (!restoringFromHistory) {
            return;
        }

        restoringFromHistory = false;
        router.reload();
    });

    // Some browsers answer Back from the back/forward cache: the whole
    // document comes back as it was, so no popstate reaches Inertia and the
    // check above never runs.
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            router.reload();
        }
    });
}
