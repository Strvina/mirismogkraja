import { cn } from '@/lib/utils';
import type { LatLngTuple, Map as LeafletMap } from 'leaflet';
import { useEffect, useRef } from 'react';

/**
 * Maps, drawn with Leaflet over OpenStreetMap tiles.
 *
 * Leaflet is imported when a map mounts, not with the page: it is a split
 * chunk that only the pages showing a map ever download. OpenStreetMap
 * needs no API key and no billing account, unlike Google Maps.
 *
 * Markers are circles drawn by Leaflet itself rather than its default pin
 * image, which a bundler cannot find without extra configuration.
 */

export interface MapPoint {
    id: number;
    name: string;
    lat: number;
    lng: number;
    href?: string;
    subtitle?: string | null;
}

/** The south of Serbia, where most producers are. */
const DEFAULT_CENTER: LatLngTuple = [43.32, 21.9];

const MARKER_STYLE = { radius: 8, color: '#8a3324', weight: 2, fillColor: '#c2542d', fillOpacity: 0.85 };

async function loadLeaflet() {
    const [leaflet] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]);

    return leaflet.default;
}

function tiles(L: Awaited<ReturnType<typeof loadLeaflet>>) {
    return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/** Several producers on one map, each opening a popup with a link to their page. */
export function PointsMap({ points, className }: { points: MapPoint[]; className?: string }) {
    const container = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let map: LeafletMap | null = null;
        let cancelled = false;

        loadLeaflet().then((L) => {
            if (cancelled || !container.current) {
                return;
            }

            // Canvas rather than a DOM node per marker: stays smooth with
            // hundreds of producers on the map.
            map = L.map(container.current, { preferCanvas: true, scrollWheelZoom: false }).setView(DEFAULT_CENTER, 7);
            tiles(L).addTo(map);

            const markers = points.map((point) => {
                // Names are the producers' own text, so they are escaped
                // before going into the popup's HTML.
                const title = point.href
                    ? `<a href="${escapeHtml(point.href)}"><strong>${escapeHtml(point.name)}</strong></a>`
                    : `<strong>${escapeHtml(point.name)}</strong>`;
                const subtitle = point.subtitle ? `<br>${escapeHtml(point.subtitle)}` : '';

                return L.circleMarker([point.lat, point.lng], MARKER_STYLE).bindPopup(title + subtitle);
            });

            if (markers.length > 0) {
                const group = L.featureGroup(markers).addTo(map);
                map.fitBounds(group.getBounds(), { padding: [30, 30], maxZoom: 12 });
            }
        });

        return () => {
            cancelled = true;
            map?.remove();
        };
    }, [points]);

    return <div ref={container} className={cn('z-0 h-80 w-full rounded-lg border', className)} />;
}

/**
 * Choosing a point: a click places it, a click elsewhere moves it. The
 * parent owns the value, so clearing it is a plain button next to the map.
 */
export function LocationPicker({
    value,
    onChange,
    className,
}: {
    value: { lat: number; lng: number } | null;
    onChange: (point: { lat: number; lng: number }) => void;
    className?: string;
}) {
    const container = useRef<HTMLDivElement>(null);
    const mapRef = useRef<LeafletMap | null>(null);
    const markerRef = useRef<import('leaflet').CircleMarker | null>(null);
    const leafletRef = useRef<Awaited<ReturnType<typeof loadLeaflet>> | null>(null);
    // The latest callback, without rebuilding the map when it changes.
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        let cancelled = false;

        loadLeaflet().then((L) => {
            if (cancelled || !container.current) {
                return;
            }

            leafletRef.current = L;
            const map = L.map(container.current).setView(value ? [value.lat, value.lng] : DEFAULT_CENTER, value ? 13 : 7);
            tiles(L).addTo(map);
            map.on('click', (event) => {
                // Five decimals is about a metre - more than a farm needs.
                onChangeRef.current({ lat: Number(event.latlng.lat.toFixed(5)), lng: Number(event.latlng.lng.toFixed(5)) });
            });
            mapRef.current = map;
            // The marker for an initial value is drawn by the effect below.
            placeMarker(value);
        });

        return () => {
            cancelled = true;
            mapRef.current?.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
        // Built once; the value is kept in sync by the effect below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const placeMarker = (point: { lat: number; lng: number } | null) => {
        const L = leafletRef.current;
        const map = mapRef.current;

        if (!L || !map) {
            return;
        }

        markerRef.current?.remove();
        markerRef.current = point ? L.circleMarker([point.lat, point.lng], MARKER_STYLE).addTo(map) : null;
    };

    useEffect(() => {
        placeMarker(value);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value?.lat, value?.lng]);

    return <div ref={container} className={cn('z-0 h-72 w-full cursor-crosshair rounded-lg border', className)} />;
}
