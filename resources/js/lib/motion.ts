import { router } from '@inertiajs/react';

/**
 * Motion on the site, in one place.
 *
 * It is for moving around the site, never for arriving on it. The first
 * page a visitor loads is painted as it is: anything faded in there is
 * simply a later first paint, and that is what the page is measured by.
 * Once they click through, pages and lists ease in.
 *
 * Someone who has asked their device for less motion gets none: the CSS
 * switches the animations off, and scrolling jumps instead of gliding.
 */

let navigated = false;
let leftFrom: string | null = null;

// Fires for visits made in the browser, not for the page load itself.
router.on('start', () => {
    navigated = true;
    leftFrom = window.location.pathname;
});

/** Whether this page was reached by a click inside the site, not by loading it. */
export function arrivedByNavigation(): boolean {
    return navigated;
}

/**
 * The same, and from a different page: another page of the same list, or
 * the list filtered, is the same page - there only its cards move.
 */
export function arrivedFromAnotherPage(): boolean {
    return navigated && leftFrom !== window.location.pathname;
}

function prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** The sticky header, and a little air under it. */
const HEADER_OFFSET = 104;

/** Glide the page so the element starts just under the header. */
export function scrollToStart(element: Element): void {
    const top = window.scrollY + element.getBoundingClientRect().top - HEADER_OFFSET;

    window.scrollTo({ top: Math.max(top, 0), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

/**
 * The same, but only when the element's start is out of sight above: after
 * a list's page changes, the reader at its foot is taken back to its top,
 * and one already looking at the top is left alone.
 */
export function scrollBackToStart(element: Element): void {
    if (element.getBoundingClientRect().top < HEADER_OFFSET) {
        scrollToStart(element);
    }
}
