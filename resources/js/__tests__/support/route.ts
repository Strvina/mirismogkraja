/**
 * A stand-in for Ziggy's global route().
 *
 * The real one needs the route list the server prints into the page, which
 * a component test does not have. This one turns a call into an address that
 * shows what was asked for - the name, then the parameters:
 *
 *     route('messages.thread.store', [3, 7])    → /messages.thread.store/3/7
 *     route('wanted.create', { q: 'ajvar' })    → /wanted.create?q=ajvar
 *
 * so a test says where a link or a request goes by calling route() itself,
 * the way the component does, and never spells an address out.
 */
type RouteParam = string | number | boolean | null | undefined;

export function route(name: string, params?: RouteParam | RouteParam[] | Record<string, RouteParam>): string {
    const path = `/${name}`;

    if (params === undefined || params === null) {
        return path;
    }

    if (Array.isArray(params)) {
        return [path, ...params.map((param) => encodeURIComponent(String(param)))].join('/');
    }

    if (typeof params === 'object') {
        const query = Object.entries(params)
            .filter(([, value]) => value !== undefined && value !== null)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
            .join('&');

        return query ? `${path}?${query}` : path;
    }

    return `${path}/${encodeURIComponent(String(params))}`;
}
