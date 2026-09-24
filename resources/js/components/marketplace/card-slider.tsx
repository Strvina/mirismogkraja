import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

/**
 * Horizontal, snap-scrolling row of cards used by the homepage sections.
 *
 * It's the browser's own overflow scrolling rather than a carousel library:
 * touch dragging, trackpads, keyboard and screen readers all work by default,
 * and the arrows are a convenience layered on top for mouse users. They hide
 * themselves when everything already fits, so a section with two cards doesn't
 * pretend to be a carousel.
 */
export default function CardSlider({
    children,
    label,
    itemClassName = 'w-[78vw] sm:w-[340px] lg:w-[360px]',
}: {
    children: ReactNode[];
    label: string;
    itemClassName?: string;
}) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [atStart, setAtStart] = useState(true);
    const [atEnd, setAtEnd] = useState(true);

    const sync = useCallback(() => {
        const track = trackRef.current;

        if (!track) {
            return;
        }

        // A pixel of slack: fractional scroll widths otherwise leave the
        // "next" arrow enabled at the very end of the track.
        setAtStart(track.scrollLeft <= 1);
        setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 1);
    }, []);

    useEffect(() => {
        sync();
        window.addEventListener('resize', sync);

        return () => window.removeEventListener('resize', sync);
    }, [sync, children.length]);

    const scrollBy = (direction: -1 | 1) => {
        const track = trackRef.current;

        if (track) {
            track.scrollBy({ left: direction * Math.max(track.clientWidth * 0.8, 240), behavior: 'smooth' });
        }
    };

    const hasArrows = !(atStart && atEnd);

    return (
        <div className="relative">
            {hasArrows && (
                <div className="mb-4 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => scrollBy(-1)}
                        disabled={atStart}
                        aria-label={`${label}: prethodni`}
                        className="border-border/70 hover:bg-muted grid size-10 place-items-center rounded-full border transition-colors disabled:opacity-35 disabled:hover:bg-transparent"
                    >
                        <ChevronLeft className="size-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => scrollBy(1)}
                        disabled={atEnd}
                        aria-label={`${label}: sledeći`}
                        className="border-border/70 hover:bg-muted grid size-10 place-items-center rounded-full border transition-colors disabled:opacity-35 disabled:hover:bg-transparent"
                    >
                        <ChevronRight className="size-4" />
                    </button>
                </div>
            )}

            <div
                ref={trackRef}
                onScroll={sync}
                role="region"
                aria-label={label}
                tabIndex={0}
                className="-mx-1 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {children.map((child, index) => (
                    <div key={index} className={cn('shrink-0 snap-start', itemClassName)}>
                        {child}
                    </div>
                ))}
            </div>
        </div>
    );
}
