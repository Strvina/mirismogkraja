import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

/**
 * What a list shows while there is nothing in it.
 *
 * On a site that has just opened, this is most of what a visitor sees, so
 * it says what belongs here and offers the step that puts something in it -
 * a bare "nothing to show" is a dead end.
 */
export default function EmptyState({
    title,
    children,
    actions,
    className,
}: {
    title: string;
    /** What belongs here, in a sentence or two. */
    children?: ReactNode;
    /** The way forward: a button, a link or both. */
    actions?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('border-border bg-muted/30 rounded-xl border border-dashed px-6 py-10 text-center', className)}>
            <p className="font-serif text-xl">{title}</p>
            {children && <div className="text-muted-foreground mx-auto mt-2 max-w-md text-sm leading-6">{children}</div>}
            {actions && <div className="mt-5 flex flex-wrap items-center justify-center gap-3">{actions}</div>}
        </div>
    );
}
