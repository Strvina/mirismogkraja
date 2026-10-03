import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';

/**
 * A search field that submits on Enter. Keeps its text in sync with the
 * query it was given, so Back to an earlier search shows that search.
 */
export default function SearchBox({
    value = '',
    onSearch,
    placeholder,
    className,
    autoFocus = false,
}: {
    value?: string;
    onSearch: (query: string) => void;
    placeholder?: string;
    className?: string;
    autoFocus?: boolean;
}) {
    const [query, setQuery] = useState(value);

    useEffect(() => setQuery(value), [value]);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        onSearch(query.trim());
    };

    return (
        <form role="search" onSubmit={submit} className={cn('relative', className)}>
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden />
            <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={placeholder ?? t('Pretraži proizvode…')}
                aria-label={placeholder ?? t('Pretraži proizvode…')}
                maxLength={100}
                autoFocus={autoFocus}
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-full border pr-3 pl-9 text-sm shadow-xs transition outline-none focus-visible:ring-[3px]"
            />
        </form>
    );
}
