import { REDUCED_MOTION, setMediaQuery } from '@/__tests__/support/browser';
import { emitRouterEvent } from '@/__tests__/support/inertia';
import { describe, expect, it, vi } from 'vitest';

// "Has the visitor clicked through yet?" is module state that starts with
// the page load, so each test loads the module afresh. The router stays the
// same one: the stand-in for Inertia is not reloaded with the modules.
async function freshMotion() {
    vi.resetModules();

    const motion = await import('@/lib/motion');

    return { ...motion, startVisit: () => emitRouterEvent('start') };
}

const goTo = (address: string) => window.history.pushState(null, '', address);

function elementAt(top: number): Element {
    const element = document.createElement('div');

    element.getBoundingClientRect = () => ({ top }) as DOMRect;

    return element;
}

function scrolledTo(pixels: number) {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: pixels });

    return vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
}

describe('arrivedByNavigation', () => {
    it('is false on the page the visitor loaded: nothing fades in on arrival', async () => {
        const { arrivedByNavigation } = await freshMotion();

        expect(arrivedByNavigation()).toBe(false);
    });

    it('is true once they have clicked through, and stays true', async () => {
        const { arrivedByNavigation, startVisit } = await freshMotion();

        startVisit();
        expect(arrivedByNavigation()).toBe(true);

        startVisit();
        expect(arrivedByNavigation()).toBe(true);
    });
});

describe('arrivedFromAnotherPage', () => {
    it('is false on the page the visitor loaded', async () => {
        const { arrivedFromAnotherPage } = await freshMotion();

        expect(arrivedFromAnotherPage()).toBe(false);
    });

    it('is true after a visit that ended on a different page', async () => {
        const { arrivedFromAnotherPage, startVisit } = await freshMotion();

        goTo('/proizvodi');
        startVisit();
        goTo('/proizvodjaci');

        expect(arrivedFromAnotherPage()).toBe(true);
    });

    it('is false when only the list changed: another page of it, or a filter', async () => {
        const { arrivedFromAnotherPage, startVisit } = await freshMotion();

        goTo('/proizvodi');
        startVisit();
        goTo('/proizvodi?page=2&in_season=1');

        expect(arrivedFromAnotherPage()).toBe(false);
    });
});

describe('scrollToStart', () => {
    it('glides the element to just under the sticky header', async () => {
        const { scrollToStart } = await freshMotion();
        const scrollTo = scrolledTo(200);

        scrollToStart(elementAt(500));

        expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 596, behavior: 'smooth' });
    });

    it('jumps instead of gliding for someone who asked for less motion', async () => {
        const { scrollToStart } = await freshMotion();
        const scrollTo = scrolledTo(200);

        setMediaQuery(REDUCED_MOTION, true);
        scrollToStart(elementAt(500));

        expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 596, behavior: 'auto' });
    });

    it('never asks for a position above the top of the page', async () => {
        const { scrollToStart } = await freshMotion();
        const scrollTo = scrolledTo(0);

        scrollToStart(elementAt(40));

        expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 0, behavior: 'smooth' });
    });
});

describe('scrollBackToStart', () => {
    it('takes the reader back when the start of the list is out of sight above', async () => {
        const { scrollBackToStart } = await freshMotion();
        const scrollTo = scrolledTo(900);

        scrollBackToStart(elementAt(-300));

        expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 496, behavior: 'smooth' });
    });

    it('also when the start is hidden behind the header', async () => {
        const { scrollBackToStart } = await freshMotion();
        const scrollTo = scrolledTo(400);

        scrollBackToStart(elementAt(60));

        expect(scrollTo).toHaveBeenCalledTimes(1);
    });

    it('leaves alone a reader who can already see the start', async () => {
        const { scrollBackToStart } = await freshMotion();
        const scrollTo = scrolledTo(0);

        scrollBackToStart(elementAt(104));
        scrollBackToStart(elementAt(380));

        expect(scrollTo).not.toHaveBeenCalled();
    });
});
