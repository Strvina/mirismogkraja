import { arrivedByNavigation } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { usePage } from '@inertiajs/react';
import { type ReactNode } from 'react';

/**
 * A page of cards in a listing.
 *
 * When the list changes - another page of it, a filter, a search - the
 * cards rise in one after another, so it is plain that these are different
 * cards: swapped in place they look as if nothing happened. Keyed by the
 * address, which is what changes with the list.
 */
export default function CardGrid({ className, children }: { className?: string; children: ReactNode }) {
    const { url } = usePage();

    return (
        <div key={url} className={cn('grid', className, arrivedByNavigation() && 'stagger-in')}>
            {children}
        </div>
    );
}
