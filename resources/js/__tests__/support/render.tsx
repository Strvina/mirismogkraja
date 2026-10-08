import { render, type RenderResult } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { type ReactElement } from 'react';
import { vi } from 'vitest';
import { setPage } from './inertia';

/**
 * Render a component on a page and get a user to operate it.
 *
 * `page` is what usePage() answers with: the address and the props, laid
 * over the ones every page shares (a signed-out visitor, no unread badges).
 */
export function renderOnPage(ui: ReactElement, page: Parameters<typeof setPage>[0] = {}): RenderResult & { user: UserEvent } {
    setPage(page);

    return { user: createUser(), ...render(ui) };
}

/**
 * A user who does not pause between keystrokes: the pause is a timer per
 * key, which on a busy machine turns a typed sentence into seconds - and,
 * under a fake clock, into a wait for a timer nobody advances.
 */
export function createUser(): UserEvent {
    return userEvent.setup({ delay: null });
}

/**
 * Stop the calendar on one moment while timers keep running - enough for
 * anything that only reads the date ("pre 2 dana", "u sezoni", "danas").
 */
export function freezeDate(moment: string): void {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(moment) });
}
