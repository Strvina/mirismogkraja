import { LocationPicker, PointsMap } from '@/components/marketplace/map';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Leaflet itself draws on a canvas jsdom does not have. What is ours is what
 * we ask of it: where the map starts, which markers go on it, what their
 * popups say, and what a click reports - so Leaflet is a recorder here.
 */
const leaflet = vi.hoisted(() => {
    const calls = {
        views: [] as { center: unknown; zoom: number }[],
        markers: [] as { position: unknown; popup?: string; removed: boolean; onMap: boolean }[],
        fitted: [] as unknown[],
        mapsRemoved: 0,
        mapOptions: [] as unknown[],
        clickHandlers: [] as ((event: { latlng: { lat: number; lng: number } }) => void)[],
    };

    const map = {
        setView: (center: unknown, zoom: number) => {
            calls.views.push({ center, zoom });

            return map;
        },
        on: (_event: string, handler: (event: { latlng: { lat: number; lng: number } }) => void) => {
            calls.clickHandlers.push(handler);
        },
        fitBounds: (bounds: unknown, options: unknown) => {
            calls.fitted.push({ bounds, options });
        },
        remove: () => {
            calls.mapsRemoved += 1;
        },
    };

    const L = {
        map: (_element: HTMLElement, options?: unknown) => {
            calls.mapOptions.push(options);

            return map;
        },
        tileLayer: () => ({ addTo: () => undefined }),
        circleMarker: (position: unknown) => {
            const record = { position, popup: undefined as string | undefined, removed: false, onMap: false };
            const marker = {
                bindPopup: (html: string) => {
                    record.popup = html;

                    return marker;
                },
                addTo: () => {
                    record.onMap = true;

                    return marker;
                },
                remove: () => {
                    record.removed = true;
                },
            };

            calls.markers.push(record);

            return marker;
        },
        featureGroup: (markers: unknown[]) => ({ addTo: () => ({ getBounds: () => `bounds of ${markers.length}` }) }),
    };

    return { calls, L };
});

vi.mock('leaflet', () => ({ default: leaflet.L }));
vi.mock('leaflet/dist/leaflet.css', () => ({}));

const SOUTH_OF_SERBIA = [43.32, 21.9];

beforeEach(() => {
    leaflet.calls.views = [];
    leaflet.calls.markers = [];
    leaflet.calls.fitted = [];
    leaflet.calls.mapsRemoved = 0;
    leaflet.calls.mapOptions = [];
    leaflet.calls.clickHandlers = [];
});

const drawn = () => waitFor(() => expect(leaflet.calls.views).toHaveLength(1));

describe('PointsMap', () => {
    const points = [
        { id: 1, name: 'Mlekara Zapis', lat: 43.41, lng: 22.01, href: '/proizvodjac/mlekara-zapis', subtitle: 'Svrljig' },
        { id: 2, name: 'Pčelinjak Rtanj', lat: 43.77, lng: 21.89 },
    ];

    it('puts a marker on every producer and frames them all', async () => {
        render(<PointsMap points={points} />);
        await drawn();

        expect(leaflet.calls.markers.map((marker) => marker.position)).toEqual([
            [43.41, 22.01],
            [43.77, 21.89],
        ]);
        expect(leaflet.calls.fitted).toEqual([{ bounds: 'bounds of 2', options: { padding: [30, 30], maxZoom: 12 } }]);
    });

    it('does not let the mouse wheel hijack the page while scrolling past the map', async () => {
        render(<PointsMap points={points} />);
        await drawn();

        expect(leaflet.calls.mapOptions[0]).toMatchObject({ scrollWheelZoom: false });
    });

    it("links a popup to the producer's page, with the town under the name", async () => {
        render(<PointsMap points={points} />);
        await drawn();

        expect(leaflet.calls.markers[0].popup).toBe('<a href="/proizvodjac/mlekara-zapis"><strong>Mlekara Zapis</strong></a><br>Svrljig');
    });

    it('shows a point that has no page as a name alone', async () => {
        render(<PointsMap points={points} />);
        await drawn();

        expect(leaflet.calls.markers[1].popup).toBe('<strong>Pčelinjak Rtanj</strong>');
    });

    it("escapes the producers' own words before they go into the popup's HTML", async () => {
        const hostile = [
            { id: 3, name: '<img src=x onerror="alert(1)">', lat: 43, lng: 22, href: '/p/"onmouseover="x', subtitle: "Niš & 'okolina'" },
        ];

        render(<PointsMap points={hostile} />);
        await drawn();

        const popup = leaflet.calls.markers[0].popup ?? '';
        const parsed = document.createElement('div');
        parsed.innerHTML = popup;

        // Parsed back, the popup is one link with the text as it was typed.
        expect(popup).not.toContain('<img');
        expect(parsed.querySelector('img')).toBeNull();
        expect(parsed.querySelectorAll('a')).toHaveLength(1);
        expect(parsed.querySelector('a')).toHaveAttribute('href', '/p/"onmouseover="x');
        expect(parsed.querySelector('a')).not.toHaveAttribute('onmouseover');
        expect(parsed.querySelector('strong')).toHaveTextContent('<img src=x onerror="alert(1)">');
        expect(parsed).toHaveTextContent("Niš & 'okolina'");
    });

    it('opens on the south of Serbia and frames nothing when there is nobody to show', async () => {
        render(<PointsMap points={[]} />);
        await drawn();

        expect(leaflet.calls.views[0]).toEqual({ center: SOUTH_OF_SERBIA, zoom: 7 });
        expect(leaflet.calls.fitted).toEqual([]);
    });

    it('takes the map down when the page moves on', async () => {
        const { unmount } = render(<PointsMap points={points} />);
        await drawn();

        unmount();

        expect(leaflet.calls.mapsRemoved).toBe(1);
    });
});

describe('LocationPicker', () => {
    const clickOnMap = (lat: number, lng: number) => leaflet.calls.clickHandlers[0]({ latlng: { lat, lng } });
    const markersOnMap = () => leaflet.calls.markers.filter((marker) => marker.onMap && !marker.removed);

    it('opens wide on the south of Serbia, with no marker, while no point is chosen', async () => {
        render(<LocationPicker value={null} onChange={vi.fn()} />);
        await drawn();

        expect(leaflet.calls.views[0]).toEqual({ center: SOUTH_OF_SERBIA, zoom: 7 });
        expect(markersOnMap()).toHaveLength(0);
    });

    it('opens close in on a point already chosen, and marks it', async () => {
        render(<LocationPicker value={{ lat: 43.41, lng: 22.01 }} onChange={vi.fn()} />);
        await drawn();

        expect(leaflet.calls.views[0]).toEqual({ center: [43.41, 22.01], zoom: 13 });
        expect(markersOnMap().map((marker) => marker.position)).toEqual([[43.41, 22.01]]);
    });

    it('reports a click to about a metre, no finer', async () => {
        const onChange = vi.fn();
        render(<LocationPicker value={null} onChange={onChange} />);
        await drawn();

        clickOnMap(43.412345678, 22.019999999);

        expect(onChange).toHaveBeenCalledExactlyOnceWith({ lat: 43.41235, lng: 22.02 });
    });

    it('moves the one marker when the point changes', async () => {
        const { rerender } = render(<LocationPicker value={{ lat: 43.41, lng: 22.01 }} onChange={vi.fn()} />);
        await drawn();

        rerender(<LocationPicker value={{ lat: 43.5, lng: 22.1 }} onChange={vi.fn()} />);

        expect(markersOnMap().map((marker) => marker.position)).toEqual([[43.5, 22.1]]);
    });

    it('takes the marker away when the point is cleared', async () => {
        const { rerender } = render(<LocationPicker value={{ lat: 43.41, lng: 22.01 }} onChange={vi.fn()} />);
        await drawn();

        rerender(<LocationPicker value={null} onChange={vi.fn()} />);

        expect(markersOnMap()).toHaveLength(0);
    });

    it('reports to the newest callback without drawing the map again', async () => {
        const first = vi.fn();
        const second = vi.fn();
        const { rerender } = render(<LocationPicker value={null} onChange={first} />);
        await drawn();

        rerender(<LocationPicker value={null} onChange={second} />);
        clickOnMap(43.4, 22);

        expect(second).toHaveBeenCalledTimes(1);
        expect(first).not.toHaveBeenCalled();
        expect(leaflet.calls.views).toHaveLength(1);
    });
});
