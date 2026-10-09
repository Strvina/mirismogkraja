/**
 * The parts of a browser that jsdom leaves out and the components reach
 * for: media queries, the observers and pointer capture Radix needs, page
 * scrolling, beacons and object URLs. Installed once by setup.ts.
 */
import { act } from '@testing-library/react';

type ChangeListener = (event: { matches: boolean }) => void;

interface FakeMediaQueryList {
    media: string;
    matches: boolean;
    onchange: null;
    addEventListener: (type: string, listener: ChangeListener) => void;
    removeEventListener: (type: string, listener: ChangeListener) => void;
    addListener: (listener: ChangeListener) => void;
    removeListener: (listener: ChangeListener) => void;
    dispatchEvent: () => boolean;
}

// One object per query, for the life of the test file: a module that asks at
// load time (the theme does) keeps the object it was given.
const queries = new Map<string, { list: FakeMediaQueryList; listeners: Set<ChangeListener> }>();

function query(media: string) {
    let entry = queries.get(media);

    if (!entry) {
        const listeners = new Set<ChangeListener>();

        entry = {
            listeners,
            list: {
                media,
                matches: false,
                onchange: null,
                addEventListener: (_type, listener) => listeners.add(listener),
                removeEventListener: (_type, listener) => listeners.delete(listener),
                addListener: (listener) => listeners.add(listener),
                removeListener: (listener) => listeners.delete(listener),
                dispatchEvent: () => true,
            },
        };
        queries.set(media, entry);
    }

    return entry;
}

export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
export const DARK_SCHEME = '(prefers-color-scheme: dark)';

/** Make a media query match (or stop matching) and tell whoever listens - as when the device's setting changes. */
export function setMediaQuery(media: string, matches: boolean): void {
    const entry = query(media);

    entry.list.matches = matches;
    act(() => entry.listeners.forEach((listener) => listener({ matches })));
}

/** A clean browser for the next test; listeners stay with the modules that added them. */
export function resetBrowser(): void {
    queries.forEach((entry) => {
        entry.list.matches = false;
    });
    localStorage.clear();
    document.documentElement.className = '';
    document.title = '';
    window.history.replaceState(null, '', '/');
}

class FakeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
        return [];
    }
}

export function installBrowser(): void {
    window.matchMedia = ((media: string) => query(media).list) as unknown as typeof window.matchMedia;
    window.ResizeObserver = FakeObserver as unknown as typeof ResizeObserver;
    window.IntersectionObserver = FakeObserver as unknown as typeof IntersectionObserver;

    // jsdom has these as stubs that only log "not implemented".
    window.scrollTo = () => undefined;
    Element.prototype.scrollTo = () => undefined;
    Element.prototype.scrollBy = () => undefined;
    Element.prototype.scrollIntoView = () => undefined;

    Element.prototype.hasPointerCapture = () => false;
    Element.prototype.setPointerCapture = () => undefined;
    Element.prototype.releasePointerCapture = () => undefined;

    Object.defineProperty(navigator, 'sendBeacon', { configurable: true, writable: true, value: () => true });

    URL.createObjectURL = (file: Blob | MediaSource) => `blob:test/${file instanceof File ? file.name : 'object'}`;
    URL.revokeObjectURL = () => undefined;
}
