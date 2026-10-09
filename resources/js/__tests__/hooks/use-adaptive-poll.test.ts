import { lastVisit, visits } from '@/__tests__/support/inertia';
import { useAdaptivePoll } from '@/hooks/use-adaptive-poll';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

/** The server answers the check that is under way: nothing new. */
const answerWithNothingNew = () => lastVisit().succeed();

function tabHidden(hidden: boolean) {
    Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
    act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
    });
}

describe('useAdaptivePoll', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    });

    it('checks for the first time after three seconds, asking only for what it was told to', () => {
        renderHook(() => useAdaptivePoll(['messages', 'unreadMessages'], 1));

        wait(2999);
        expect(visits()).toHaveLength(0);

        wait(1);
        expect(visits()).toHaveLength(1);
        expect(lastVisit()).toMatchObject({
            reload: true,
            options: { only: ['messages', 'unreadMessages'], async: true, showProgress: false },
        });
    });

    it('waits for an answer before it plans the next check', () => {
        renderHook(() => useAdaptivePoll(['messages'], 1));

        wait(3000);
        wait(60_000);

        expect(visits()).toHaveLength(1);
    });

    it('waits half as long again after every check that found nothing, up to twenty seconds', () => {
        renderHook(() => useAdaptivePoll(['messages'], 1));

        wait(3000);
        expect(visits()).toHaveLength(1);

        const pauses = [4500, 6750, 10_125, 15_188, 20_000, 20_000];

        pauses.forEach((pause, index) => {
            answerWithNothingNew();

            wait(pause - 1);
            expect(visits(), `still waiting just before ${pause} ms`).toHaveLength(index + 1);

            wait(1);
            expect(visits(), `checked after ${pause} ms`).toHaveLength(index + 2);
        });
    });

    it('goes back to three seconds as soon as something happens', () => {
        const { rerender } = renderHook(({ newest }) => useAdaptivePoll(['messages'], newest), { initialProps: { newest: 1 } });

        wait(3000);
        answerWithNothingNew();
        wait(4500);
        answerWithNothingNew();
        expect(visits()).toHaveLength(2);

        // A new message arrived: the id of the newest one changed.
        rerender({ newest: 2 });

        wait(2999);
        expect(visits()).toHaveLength(2);
        wait(1);
        expect(visits()).toHaveLength(3);
    });

    it('does not start over when the page re-renders with nothing new', () => {
        const { rerender } = renderHook(({ newest }) => useAdaptivePoll(['messages'], newest), { initialProps: { newest: 1 } });

        wait(2000);
        rerender({ newest: 1 });
        wait(1000);

        expect(visits()).toHaveLength(1);
    });

    it('checks a tab in the background only every twenty seconds', () => {
        tabHidden(true);
        renderHook(() => useAdaptivePoll(['messages'], 1));

        wait(19_999);
        expect(visits()).toHaveLength(0);

        wait(1);
        expect(visits()).toHaveLength(1);
    });

    it('checks soon after the reader comes back to the tab', () => {
        tabHidden(true);
        renderHook(() => useAdaptivePoll(['messages'], 1));
        wait(5000);

        tabHidden(false);

        wait(2999);
        expect(visits()).toHaveLength(0);
        wait(1);
        expect(visits()).toHaveLength(1);
    });

    it('does not hurry when the tab is being hidden rather than shown', () => {
        renderHook(() => useAdaptivePoll(['messages'], 1));
        wait(2000);

        tabHidden(true);
        wait(1000);

        expect(visits()).toHaveLength(1);
    });

    it('stops while a message is being sent, and starts again at three seconds', () => {
        const { result } = renderHook(() => useAdaptivePoll(['messages'], 1));

        act(() => result.current.stop());
        wait(60_000);
        expect(visits()).toHaveLength(0);

        act(() => result.current.start());
        wait(2999);
        expect(visits()).toHaveLength(0);
        wait(1);
        expect(visits()).toHaveLength(1);
    });

    it('does not plan another check when the answer arrives while it is stopped', () => {
        const { result } = renderHook(() => useAdaptivePoll(['messages'], 1));

        wait(3000);
        act(() => result.current.stop());
        answerWithNothingNew();
        wait(60_000);

        expect(visits()).toHaveLength(1);
    });

    it('stops for good when the conversation is closed', () => {
        const { unmount } = renderHook(() => useAdaptivePoll(['messages'], 1));

        unmount();
        wait(60_000);

        expect(visits()).toHaveLength(0);
    });

    it('takes its own fastest and slowest pace', () => {
        renderHook(() => useAdaptivePoll(['threads'], 1, { min: 1000, max: 2000 }));

        wait(1000);
        expect(visits()).toHaveLength(1);

        answerWithNothingNew();
        wait(1500);
        expect(visits()).toHaveLength(2);

        answerWithNothingNew();
        wait(1999);
        expect(visits()).toHaveLength(2);
        wait(1);
        expect(visits()).toHaveLength(3);
    });
});
