import { setMediaQuery } from '@/__tests__/support/browser';
import { renderOnPage } from '@/__tests__/support/render';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TOUCH_SCREEN } from '@/hooks/use-media-query';
import { holdTouchUntilItEnds, useScrollLock } from '@/hooks/use-scroll-lock';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

function Panel({ open }: { open: boolean }) {
    useScrollLock(open);

    return null;
}

const locked = () => document.documentElement.style.overflow === 'hidden';

describe('useScrollLock', () => {
    it('holds the page while a panel is open and lets it go after, as it was', () => {
        document.documentElement.style.overflow = '';
        const view = render(<Panel open />);

        expect(locked()).toBe(true);

        view.rerender(<Panel open={false} />);
        expect(locked()).toBe(false);
    });

    it('lets go when the panel goes away with its page', () => {
        const view = render(<Panel open />);

        view.unmount();

        expect(locked()).toBe(false);
    });

    it('keeps the page held until the last of two panels closes', () => {
        const first = render(<Panel open />);
        const second = render(<Panel open />);

        first.unmount();
        expect(locked()).toBe(true);

        second.unmount();
        expect(locked()).toBe(false);
    });

    it('refuses a drag outside the panel on a touch screen', () => {
        const view = render(<Panel open />);
        const drag = new Event('touchmove', { cancelable: true, bubbles: true });

        document.body.dispatchEvent(drag);

        expect(drag.defaultPrevented).toBe(true);
        view.unmount();
    });
});

function Menu() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger>Meni</DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem>Proizvodi</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

describe('a dropdown menu and the page behind it', () => {
    it('on a touch screen, holds the page exactly while the menu is open - and only then', async () => {
        setMediaQuery(TOUCH_SCREEN, true);
        const { user } = renderOnPage(<Menu />);

        // Mounted but closed: the page is free (the lock used to sit in the
        // always-mounted wrapper and never let go).
        expect(locked()).toBe(false);

        await user.click(screen.getByRole('button', { name: 'Meni' }));
        expect(screen.getByRole('menu')).toBeInTheDocument();
        expect(locked()).toBe(true);

        await user.keyboard('{Escape}');
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(locked()).toBe(false);
    });

    it("with a mouse, never - and never Radix's own lock, which made the body a scroller and let the sticky header loose", async () => {
        const { user } = renderOnPage(<Menu />);

        await user.click(screen.getByRole('button', { name: 'Meni' }));

        expect(screen.getByRole('menu')).toBeInTheDocument();
        expect(locked()).toBe(false);
        expect(document.body).not.toHaveAttribute('data-scroll-locked');
    });

    it('with a finger, opens on a tap - not at the touch, which may be the start of a scroll', async () => {
        setMediaQuery(TOUCH_SCREEN, true);
        const { user } = renderOnPage(<Menu />);
        const button = screen.getByRole('button', { name: 'Meni' });

        // A finger down on the button and away: a scroll of the page.
        fireEvent.pointerDown(button, { pointerType: 'touch', button: 0 });
        fireEvent.pointerUp(document.body, { pointerType: 'touch', button: 0 });
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();

        // Down and up on it: a tap.
        await user.pointer({ keys: '[TouchA]', target: button });
        expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('with a mouse, closes when the page scrolls - not when the menu itself scrolls', async () => {
        const { user } = renderOnPage(<Menu />);

        await user.click(screen.getByRole('button', { name: 'Meni' }));
        fireEvent.scroll(screen.getByRole('menu'));
        expect(screen.getByRole('menu')).toBeInTheDocument();

        fireEvent.scroll(window);
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('on a touch screen, is a sheet over a dimmed page', async () => {
        setMediaQuery(TOUCH_SCREEN, true);
        const { user } = renderOnPage(<Menu />);

        await user.pointer({ keys: '[TouchA]', target: screen.getByRole('button', { name: 'Meni' }) });

        expect(screen.getByRole('menu')).toHaveAttribute('data-sheet');
        expect(document.querySelector('[class*="bg-black"]')).not.toBeNull();
    });
});

describe('holdTouchUntilItEnds', () => {
    it('refuses the rest of the touch, and lets the next touch scroll even if this one never reports its end', async () => {
        holdTouchUntilItEnds();
        const move = () => {
            const drag = new Event('touchmove', { cancelable: true, bubbles: true });
            document.body.dispatchEvent(drag);

            return drag.defaultPrevented;
        };

        // The touch that closed the menu: its own start, just behind its pointerdown, does not end the hold.
        document.dispatchEvent(new Event('touchstart', { bubbles: true }));
        expect(move()).toBe(true);

        // Its end went to the backdrop, gone from the page: the document never heard it.
        await new Promise((resolve) => setTimeout(resolve, 0));
        document.dispatchEvent(new Event('touchstart', { bubbles: true }));
        expect(move()).toBe(false);
    });
});
