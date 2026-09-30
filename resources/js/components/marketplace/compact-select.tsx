import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
    value: string;
    label: string;
}

/**
 * A select whose list stays small: at most a few rows tall and as wide as
 * its button, scrolling inside. A native <select> hands its list to the
 * browser, which on phones (and for long lists anywhere) takes over most of
 * the screen for four options.
 */
export default function CompactSelect({
    id,
    label,
    value,
    options,
    onChange,
    className,
}: {
    id?: string;
    /** Read out when no visible <label> points at it. */
    label?: string;
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
    className?: string;
}) {
    const current = options.find((option) => option.value === value) ?? options[0];

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger
                id={id}
                aria-label={label}
                className={cn(
                    'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 data-[state=open]:border-ring inline-flex h-9 min-w-0 items-center justify-between gap-2 rounded-md border px-3 text-sm shadow-xs transition focus-visible:ring-[3px] focus-visible:outline-none',
                    className,
                )}
            >
                <span className="truncate">{current?.label}</span>
                <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={4} className="max-h-64 min-w-(--radix-dropdown-menu-trigger-width) overflow-y-auto">
                <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
                    {options.map((option) => (
                        <DropdownMenuRadioItem key={option.value} value={option.value} className="text-sm">
                            {option.label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
