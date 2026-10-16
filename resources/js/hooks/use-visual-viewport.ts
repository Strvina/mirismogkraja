import { useEffect, useState } from 'react';

/**
 * The part of the screen actually visible, for a panel that has to fit it.
 *
 * A phone's keyboard does not shrink the page: it covers the bottom of it,
 * and a full-screen panel sized to the page has its message box under the
 * keyboard. The visual viewport is what is left above it - and on the
 * iPhone it also moves when the page underneath is nudged - so the panel
 * takes its height and its top from it while it is open.
 */
export function useVisualViewport(active: boolean): { height: number; top: number } | null {
    const [box, setBox] = useState<{ height: number; top: number } | null>(null);

    useEffect(() => {
        const viewport = window.visualViewport;

        if (!active || !viewport) {
            setBox(null);

            return;
        }

        const update = () => setBox({ height: Math.round(viewport.height), top: Math.round(viewport.offsetTop) });

        update();
        viewport.addEventListener('resize', update);
        viewport.addEventListener('scroll', update);

        return () => {
            viewport.removeEventListener('resize', update);
            viewport.removeEventListener('scroll', update);
        };
    }, [active]);

    return box;
}
