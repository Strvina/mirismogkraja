import { createUser } from '@/__tests__/support/render';
import CardSlider from '@/components/marketplace/card-slider';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/** A track `visible` pixels wide holding `total` pixels of cards. */
function trackOf({ visible, total }: { visible: number; total: number }) {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(visible);
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(total);
}

/** The cards start `step` pixels apart (a card and the gap after it). */
function cardsEvery(step: number) {
    vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) {
        const row = this.parentElement;

        return row?.getAttribute('role') === 'region' ? Array.from(row.children).indexOf(this) * step : 0;
    });
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
function dragTo(track: HTMLElement, pixels: number) {
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

        dragTo(track, 300);

        expect(previous).toBeEnabled();
        expect(next).toBeEnabled();
    });

    it('offers only the way back at the end, with a pixel of slack for fractional widths', () => {
        trackOf({ visible: 400, total: 1200 });
        const { track, previous, next } = renderSlider();

        dragTo(track, 799);

        expect(previous).toBeEnabled();
        expect(next).toBeDisabled();
    });

    it('moves by the cards fully in view, to the start of one, smoothly', async () => {
        trackOf({ visible: 700, total: 1200 });
        cardsEvery(320);
        const { user, track, next, previous } = renderSlider();
        const scrollTo = vi.spyOn(track, 'scrollTo').mockImplementation(() => undefined);

        // Two whole cards fit: the third one comes to the front.
        await user.click(next);
        expect(scrollTo).toHaveBeenLastCalledWith({ left: 640, behavior: 'smooth' });

        dragTo(track, 640);
        await user.click(previous);
        expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'smooth' });
    });

    it('moves one whole card on a phone, never stopping half-way through one', async () => {
        trackOf({ visible: 350, total: 1200 });
        cardsEvery(324);
        const { user, track, next } = renderSlider();
        const scrollTo = vi.spyOn(track, 'scrollTo').mockImplementation(() => undefined);

        await user.click(next);
        expect(scrollTo).toHaveBeenLastCalledWith({ left: 324, behavior: 'smooth' });

        // From part of the way through the second card, on to the third.
        dragTo(track, 400);
        await user.click(next);
        expect(scrollTo).toHaveBeenLastCalledWith({ left: 648, behavior: 'smooth' });
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
