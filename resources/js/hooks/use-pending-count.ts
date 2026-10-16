import { useEffect, useState } from 'react';

type Values = Partial<Record<string, string>>;

/** Whether two sets of filters say the same thing; an empty value is no value. */
export function sameFilters(a: Values, b: Values): boolean {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

    return [...keys].every((key) => (a[key] ?? '') === (b[key] ?? ''));
}

/**
 * How many results the filters being chosen would show: asked of the server
 * (`routeName`, answering `{ count }`) a moment after the last change, while
 * they differ from the ones in force; those in force show the list's own
 * count. For the button that applies them.
 */
export function usePendingCount(routeName: string, draft: Values, applied: Values, extra: Values, total: number | undefined): number | null {
    const [count, setCount] = useState<number | null>(null);
    const pending = !sameFilters(draft, applied);
    const query = JSON.stringify({ ...extra, ...draft });

    useEffect(() => {
        if (!pending) {
            return;
        }

        setCount(null);
        const controller = new AbortController();
        const timer = setTimeout(() => {
            const params = Object.fromEntries(Object.entries(JSON.parse(query) as Values).filter(([, value]) => value));

            fetch(route(routeName, params), { signal: controller.signal, headers: { Accept: 'application/json' } })
                .then((response) => (response.ok ? response.json() : null))
                .then((body: { count?: number } | null) => setCount(typeof body?.count === 'number' ? body.count : null))
                .catch(() => undefined);
        }, 300);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [routeName, pending, query]);

    return pending ? count : (total ?? null);
}
