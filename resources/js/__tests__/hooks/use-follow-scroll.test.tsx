import { useFollowScroll } from '@/hooks/use-follow-scroll';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** A chat panel 400 pixels tall holding `contentHeight` pixels of messages. */
function Thread({ newestKey, page }: { newestKey: unknown; page: number }) {
    const { panelRef, onScroll, follow } = useFollowScroll({ newestKey, page });

    return (
        <div ref={panelRef} onScroll={onScroll} data-testid="panel">
            <button type="button" onClick={follow}>
                Pošalji
            </button>
        </div>
    );
}

let contentHeight = 1000;

const panel = () => screen.getByTestId('panel');

/** The reader drags the panel so that `pixels` of it are above the visible part. */
function scrollTo(pixels: number) {
    panel().scrollTop = pixels;
    fireEvent.scroll(panel());
}

const AT_THE_BOTTOM = () => contentHeight;

describe('useFollowScroll', () => {
    beforeEach(() => {
        contentHeight = 1000;
        vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(() => contentHeight);
        vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(400);
    });

    it('opens the conversation at its newest message', () => {
        render(<Thread newestKey="10-0" page={1} />);

        expect(panel().scrollTop).toBe(AT_THE_BOTTOM());
    });

    it('stays with the newest message when another arrives', () => {
        const { rerender } = render(<Thread newestKey="10-0" page={1} />);

        contentHeight = 1100;
        rerender(<Thread newestKey="11-0" page={1} />);

        expect(panel().scrollTop).toBe(1100);
    });

    it('leaves a reader who scrolled up to re-read where they are', () => {
        const { rerender } = render(<Thread newestKey="10-0" page={1} />);

        scrollTo(200);
        contentHeight = 1100;
        rerender(<Thread newestKey="11-0" page={1} />);

        expect(panel().scrollTop).toBe(200);
    });

    it('still follows a reader who is within a message or so of the bottom', () => {
        const { rerender } = render(<Thread newestKey="10-0" page={1} />);

        // 1000 tall, 400 visible: 600 is the very bottom, 530 is 70 pixels short of it.
        scrollTo(530);
        contentHeight = 1100;
        rerender(<Thread newestKey="11-0" page={1} />);

        expect(panel().scrollTop).toBe(1100);
    });

    it('stops following at 80 pixels from the bottom', () => {
        const { rerender } = render(<Thread newestKey="10-0" page={1} />);

        scrollTo(520);
        contentHeight = 1100;
        rerender(<Thread newestKey="11-0" page={1} />);

        expect(panel().scrollTop).toBe(520);
    });

    it('follows again once the reader has scrolled back down', () => {
        const { rerender } = render(<Thread newestKey="10-0" page={1} />);

        scrollTo(100);
        scrollTo(600);
        contentHeight = 1100;
        rerender(<Thread newestKey="11-0" page={1} />);

        expect(panel().scrollTop).toBe(1100);
    });

    it('goes to the end of an older page, wherever the reader was', () => {
        const { rerender } = render(<Thread newestKey="10-0" page={1} />);

        scrollTo(0);
        contentHeight = 1400;
        rerender(<Thread newestKey="5-0" page={2} />);

        expect(panel().scrollTop).toBe(1400);
    });

    it('returns to the newest message when the reader sends one, even from far up', () => {
        const { rerender } = render(<Thread newestKey="10-0" page={1} />);

        scrollTo(0);
        fireEvent.click(screen.getByRole('button', { name: 'Pošalji' }));
        contentHeight = 1100;
        rerender(<Thread newestKey="10-1" page={1} />);

        expect(panel().scrollTop).toBe(1100);
    });

    it('does not move when the page re-renders with nothing new', () => {
        const { rerender } = render(<Thread newestKey="10-0" page={1} />);

        panel().scrollTop = 600;
        contentHeight = 1100;
        rerender(<Thread newestKey="10-0" page={1} />);

        expect(panel().scrollTop).toBe(600);
    });
});
