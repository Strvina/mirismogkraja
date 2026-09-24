import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { Search, X } from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

/**
 * Free-text search over the catalog.
 *
 * It submits rather than searching as you type: a request per keystroke
 * would put a LIKE scan on the server for every letter, and the result list
 * jumping about underneath a half-typed word is worse to use than pressing
 * Enter. The field is a real form, so Enter and the browser's own search
 * behaviour work without any handling of their own.
 */
export default function SearchForm({
    value,
    target,
    placeholder = 'Pretražite proizvode...',
    className,
    keep,
}: {
    value?: string | null;
    /** Where the search goes - the product catalog by default. */
    target: string;
    placeholder?: string;
    className?: string;
    /** Filters to carry over, so searching inside a filtered list keeps it. */
    keep?: Record<string, string | number | undefined | null>;
}) {
    const [term, setTerm] = useState(value ?? '');

    // The URL is the source of truth: going Back, or following a link that
    // carries a different term, has to be reflected in the field.
    useEffect(() => setTerm(value ?? ''), [value]);

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        router.get(target, { ...keep, q: term.trim() || undefined, page: undefined }, { preserveScroll: true });
    };

    const clear = () => {
        setTerm('');
        router.get(target, { ...keep, q: undefined, page: undefined }, { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} role="search" className={cn('relative', className)}>
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
                type="search"
                name="q"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-md border pr-9 pl-9 text-sm shadow-xs transition focus-visible:ring-[3px] focus-visible:outline-none"
            />
            {term !== '' && (
                <button
                    type="button"
                    onClick={clear}
                    aria-label="Obriši pretragu"
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 p-1"
                >
                    <X className="size-4" />
                </button>
            )}
        </form>
    );
}
