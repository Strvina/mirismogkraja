import { createUser } from '@/__tests__/support/render';
import CardSlider from '@/components/marketplace/card-slider';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/** A track `visible` pixels wide holding `total` pixels of cards. */
function trackOf({ visible, total }: { visible: number; total: number }) {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(visible);
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(total);
}

function renderSlider(props: Partial<Parameters<typeof CardSlider>[0]> = {}) {
    render(
        <CardSlider label="Istaknuti proizvođači" {...props}>
            {[<article key="a">Mlekara Zapis</article>, <article key="b">Pčelinjak Rtanj</article>, <article key="c">Vinarija Jug</article>]}
        </CardSlider>,
    );

    return {
        user: createUser(),
        track: screen.getByRole('region', { name: 'Istaknuti proizvođači' }),
        previous: screen.getByRole('button', { name: 'Istaknuti proizvođači: prethodni' }),
        next: screen.getByRole('button', { name: 'Istaknuti proizvođači: sledeći' }),
    };
}

/** The reader drags the track `pixels` along. */
function scrollTo(track: HTMLElement, pixels: number) {
    track.scrollLeft = pixels;
    fireEvent.scroll(track);
}

describe('CardSlider', () => {
    it('holds every card in a row that can be reached by keyboard', () => {
        const { track } = renderSlider();

        expect(track).toHaveTextContent('Mlekara ZapisPčelinjak RtanjVinarija Jug');
        expect(track).toHaveAttribute('tabindex', '0');
    });

    it('keeps both arrows but switches them off when everything already fits', () => {
        trackOf({ visible: 1200, total: 1200 });
        const { previous, next } = renderSlider();

        expect(previous).toBeDisabled();
        expect(next).toBeDisabled();
    });

    it('offers only the way forward at the start of a row that does not fit', () => {
        trackOf({ visible: 400, total: 1200 });
        const { previous, next } = renderSlider();

        expect(previous).toBeDisabled();
        expect(next).toBeEnabled();
    });

    it('offers both ways in the middle', () => {
        trackOf({ visible: 400, total: 1200 });
        const { track, previous, next } = renderSlider();

        scrollTo(track, 300);

        expect(previous).toBeEnabled();
        expect(next).toBeEnabled();
    });

    it('offers only the way back at the end, with a pixel of slack for fractional widths', () => {
        trackOf({ visible: 400, total: 1200 });
        const { track, previous, next } = renderSlider();

        scrollTo(track, 799);

        expect(previous).toBeEnabled();
        expect(next).toBeDisabled();
    });

    it('moves most of a screen at a time, smoothly', async () => {
        trackOf({ visible: 400, total: 1200 });
        const { user, track, next, previous } = renderSlider();
        const scrollBy = vi.spyOn(track, 'scrollBy').mockImplementation(() => undefined);

        await user.click(next);
        expect(scrollBy).toHaveBeenLastCalledWith({ left: 320, behavior: 'smooth' });

        scrollTo(track, 320);
        await user.click(previous);
        expect(scrollBy).toHaveBeenLastCalledWith({ left: -320, behavior: 'smooth' });
    });

    it('moves at least a card along on a narrow phone', async () => {
        trackOf({ visible: 200, total: 1200 });
        const { user, track, next } = renderSlider();
        const scrollBy = vi.spyOn(track, 'scrollBy').mockImplementation(() => undefined);

        await user.click(next);

        expect(scrollBy).toHaveBeenLastCalledWith({ left: 240, behavior: 'smooth' });
    });

    it('checks the arrows again when the window changes size', () => {
        trackOf({ visible: 400, total: 1200 });
        const { next } = renderSlider();
        expect(next).toBeEnabled();

        trackOf({ visible: 1200, total: 1200 });
        fireEvent(window, new Event('resize'));

        expect(next).toBeDisabled();
    });

    it("sets the row's heading and a link to the whole list on the arrows' own line", () => {
        renderSlider({ header: <h2>Istaknuto</h2>, headerEnd: <a href="/proizvodjaci">Svi proizvođači</a> });

        expect(screen.getByRole('heading', { name: 'Istaknuto' })).toBeVisible();
        expect(screen.getByRole('link', { name: 'Svi proizvođači' })).toBeVisible();
    });
});
