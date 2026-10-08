import { emitRouterEvent, visits } from '@/__tests__/support/inertia';
import { revalidateOnHistoryNavigation } from '@/lib/revalidate-on-history-navigation';
import { afterEach, describe, expect, it, vi } from 'vitest';

const added: [string, EventListenerOrEventListenerObject][] = [];

// The function is called once per page load and listens for good. A test
// takes its window listeners away again, which leaves the earlier calls
// deaf: they never hear a Back, so they never ask for anything.
function start() {
    const add = window.addEventListener.bind(window);

    vi.spyOn(window, 'addEventListener').mockImplementation((type: string, listener: EventListenerOrEventListenerObject) => {
        added.push([type, listener]);
        add(type, listener);
    });

    revalidateOnHistoryNavigation();

    return {
        reloads: () => visits().filter((visit) => visit.reload),
        pageSwappedIn: () => emitRouterEvent('navigate'),
    };
}

afterEach(() => {
    added.splice(0).forEach(([type, listener]) => window.removeEventListener(type, listener));
});

const pressBack = () => window.dispatchEvent(new PopStateEvent('popstate'));

describe('revalidateOnHistoryNavigation', () => {
    it('leaves an ordinary visit alone: it has just come from the server', () => {
        const { reloads, pageSwappedIn } = start();

        pageSwappedIn();

        expect(reloads()).toHaveLength(0);
    });

    it('asks for the page again after Back or Forward restores it from history', () => {
        const { reloads, pageSwappedIn } = start();

        pressBack();
        expect(reloads()).toHaveLength(0);

        pageSwappedIn();
        expect(reloads()).toHaveLength(1);
    });

    it('marks the request as a refresh, so the server does not count it as a visit', () => {
        const { reloads, pageSwappedIn } = start();

        pressBack();
        pageSwappedIn();

        expect(reloads()[0].options).toEqual({ headers: { 'X-Revalidate': '1' } });
    });

    it('asks once per Back, not on every visit that follows', () => {
        const { reloads, pageSwappedIn } = start();

        pressBack();
        pageSwappedIn();
        pageSwappedIn();
        pageSwappedIn();

        expect(reloads()).toHaveLength(1);
    });

    it('asks again when the browser brings the whole page back from its back/forward cache', () => {
        const { reloads } = start();

        window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));

        expect(reloads()).toHaveLength(1);
        expect(reloads()[0].options).toEqual({ headers: { 'X-Revalidate': '1' } });
    });

    it('does not ask on a first, ordinary page show', () => {
        const { reloads } = start();

        window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false }));

        expect(reloads()).toHaveLength(0);
    });
});
