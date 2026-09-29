import { cn } from '@/lib/utils';
import * as Popover from '@radix-ui/react-popover';
import { CircleHelp } from 'lucide-react';
import { type ReactNode } from 'react';

/**
 * A small "?" that opens a short explanation.
 *
 * For the things that are obvious to whoever built the site and not to
 * anyone else - what a boost buys, what the outcome of an inquiry is for.
 * A click rather than a hover, so it works on a phone, and the text stays
 * out of the way of people who already know.
 */
export default function InfoHint({
    label,
    title,
    children,
    className,
}: {
    /** What the button is called for a screen reader, e.g. "Šta je ishod upita?". */
    label: string;
    title?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <Popover.Root>
            <Popover.Trigger
                aria-label={label}
                className={cn(
                    'text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-grid size-6 shrink-0 place-items-center rounded-full transition-colors focus-visible:ring-[3px] focus-visible:outline-none',
                    className,
                )}
            >
                <CircleHelp className="size-4" />
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    side="bottom"
                    align="start"
                    sideOffset={6}
                    collisionPadding={12}
                    className="bg-background text-foreground data-[state=open]:animate-in data-[state=open]:fade-in-0 z-50 w-72 max-w-[calc(100vw-24px)] rounded-lg border p-4 text-sm leading-6 shadow-lg"
                >
                    {title && <p className="mb-1 font-semibold">{title}</p>}
                    <div className="text-muted-foreground space-y-2">{children}</div>
                    <Popover.Arrow className="fill-background" />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
