/**
 * A stand-in for @inertiajs/react, put in its place for every test (see
 * setup.ts).
 *
 * Nothing here talks to a server. Every request a component makes - through
 * router, through a useForm, or by a click on a Link - is written down as a
 * Visit instead, and the test plays the server: it reads what was sent and
 * answers with succeed(), fail() or drop(). The callbacks then run in the
 * order Inertia runs them, so what the user sees afterwards is what they
 * would see in the browser.
 *
 *     await user.click(screen.getByRole('button', { name: 'Prijavi se' }));
 *     expect(lastVisit()).toMatchObject({ method: 'post', url: route('login') });
 *     lastVisit().fail({ email: 'Pogrešan email ili lozinka.' });
 *
 * usePage() reads the page set with setPage(), and re-renders when it
 * changes - as when the server answers a visit with new props.
 */
import { act } from '@testing-library/react';
import {
    createElement,
    forwardRef,
    useCallback,
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
    type MouseEvent,
    type ReactNode,
    type Ref,
} from 'react';

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
export type Errors = Record<string, string>;
type Props = Record<string, unknown>;

interface Callbacks {
    onBefore?: (visit: Visit) => boolean | void;
    onStart?: (visit: Visit) => void;
    onSuccess?: (page: Page) => unknown;
    onError?: (errors: Errors) => void;
    onFinish?: (visit: Visit) => void;
}

export type VisitOptions = Callbacks & Record<string, unknown>;

export interface Page {
    component: string;
    url: string;
    props: Props;
    version: string | null;
}

/** One request, as the component made it. */
export interface Visit {
    method: Method;
    url: string;
    data: unknown;
    /** Everything else that was asked for: only, preserveScroll, headers… */
    options: VisitOptions;
    /** A router.reload(): the page asking for its own props again. */
    reload: boolean;
    state: 'pending' | 'succeeded' | 'failed' | 'dropped';
    /** The server answers; `props` are merged into the page first, as Inertia does. */
    succeed: (props?: Props) => void;
    /** The server answers with validation errors. */
    fail: (errors: Errors) => void;
    /** No answer at all: the connection is gone or the request was cancelled. */
    drop: () => void;
}

const DEFAULT_PROPS: Props = {
    name: 'Vrelina juga',
    contactEmail: 'kontakt@vrelinajuga.test',
    auth: { user: null },
    unreadMessages: 0,
    unreadNotifications: 0,
    media: { url: '/storage', thumbs: false },
    errors: {},
};

interface PollRequest {
    interval: number;
    requestOptions: unknown;
    options: unknown;
}

interface State {
    page: Page;
    log: Visit[];
    polls: PollRequest[];
    pageListeners: Set<() => void>;
    routerListeners: Map<string, Set<(event: unknown) => void>>;
}

const blankPage = (): Page => ({ component: 'test', url: '/', props: DEFAULT_PROPS, version: null });

// Kept on the global object rather than in this module: a test that reloads
// its modules (vi.resetModules) gets a second copy of this file, and the
// code under test and the test itself must still see one router.
const STATE = Symbol.for('vrelina-juga.tests.inertia');
const globals = globalThis as { [STATE]?: State };
const state: State = (globals[STATE] ??= { page: blankPage(), log: [], polls: [], pageListeners: new Set(), routerListeners: new Map() });

function publishPage(next: Page): void {
    state.page = next;
    state.pageListeners.forEach((listener) => listener());
}

/** The page usePage() returns. Props are laid over the ones every page shares. */
export function setPage(next: { url?: string; props?: Props }): void {
    act(() => publishPage({ ...state.page, url: next.url ?? state.page.url, props: { ...state.page.props, ...next.props } }));
}

export function currentPage(): Page {
    return state.page;
}

/** Every request made so far, oldest first. */
export function visits(): Visit[] {
    return state.log;
}

export function lastVisit(): Visit {
    const visit = state.log[state.log.length - 1];

    if (!visit) {
        throw new Error('Nothing was sent: no visit has been made yet.');
    }

    return visit;
}

/** What usePoll() was asked to do, in the order it was asked. */
export function pollRequests(): PollRequest[] {
    return state.polls;
}

/** Fire one of Inertia's global events ('start', 'navigate'…) at whoever listens with router.on(). */
export function emitRouterEvent(event: string, detail: unknown = {}): void {
    act(() => state.routerListeners.get(event)?.forEach((listener) => listener({ detail })));
}

/**
 * Back to a blank page and an empty log. Listeners added with router.on()
 * stay: the modules that add them do it once, when they are first loaded.
 */
export function resetInertia(): void {
    state.page = blankPage();
    state.log = [];
    state.polls = [];
    state.pageListeners.clear();
}

function record(method: Method, url: string, data: unknown, options: VisitOptions = {}, reload = false): Visit {
    const settle = (state: Visit['state'], answer: () => void) => {
        if (visit.state !== 'pending') {
            throw new Error(`This ${visit.method.toUpperCase()} ${visit.url} was already answered (${visit.state}).`);
        }

        visit.state = state;
        act(() => {
            answer();
            options.onFinish?.(visit);
        });
    };

    const visit: Visit = {
        method,
        url,
        data,
        options,
        reload,
        state: 'pending',
        succeed: (props) =>
            settle('succeeded', () => {
                if (props) {
                    publishPage({ ...state.page, props: { ...state.page.props, ...props } });
                }

                options.onSuccess?.(state.page);
            }),
        fail: (errors) => settle('failed', () => options.onError?.(errors)),
        drop: () => settle('dropped', () => undefined),
    };

    if (options.onBefore?.(visit) === false) {
        visit.state = 'dropped';

        return visit;
    }

    state.log.push(visit);
    options.onStart?.(visit);

    return visit;
}

export const router = {
    visit: (url: string, options: VisitOptions & { method?: Method; data?: unknown } = {}) => {
        record(options.method ?? 'get', url, options.data ?? {}, options);
    },
    get: (url: string, data: unknown = {}, options: VisitOptions = {}) => {
        record('get', url, data, options);
    },
    post: (url: string, data: unknown = {}, options: VisitOptions = {}) => {
        record('post', url, data, options);
    },
    put: (url: string, data: unknown = {}, options: VisitOptions = {}) => {
        record('put', url, data, options);
    },
    patch: (url: string, data: unknown = {}, options: VisitOptions = {}) => {
        record('patch', url, data, options);
    },
    delete: (url: string, options: VisitOptions & { data?: unknown } = {}) => {
        record('delete', url, options.data ?? {}, options);
    },
    reload: (options: VisitOptions = {}) => {
        record('get', state.page.url, {}, options, true);
    },
    on: (event: string, listener: (event: unknown) => void) => {
        const listeners = state.routerListeners.get(event) ?? new Set();

        state.routerListeners.set(event, listeners.add(listener));

        return () => listeners.delete(listener);
    },
};

export function usePage<T extends Props = Props>(): Page & { props: T } {
    return useSyncExternalStore(
        (listener) => {
            state.pageListeners.add(listener);

            return () => state.pageListeners.delete(listener);
        },
        () => state.page,
    ) as Page & { props: T };
}

export function usePoll(interval: number, requestOptions: unknown = {}, options: unknown = { keepAlive: false, autoStart: true }) {
    const asked = useRef(false);

    if (!asked.current) {
        asked.current = true;
        state.polls.push({ interval, requestOptions, options });
    }

    return { start: () => undefined, stop: () => undefined };
}

/** How long a form says "saved" for, as in Inertia. */
const RECENTLY_SUCCESSFUL_MS = 2000;

type FormData = Record<string, unknown>;
type SubmitOptions = Callbacks & Record<string, unknown>;

/**
 * Inertia's form helper, with the same state and the same order of events:
 * processing from the moment it is sent, errors from a failed answer,
 * recentlySuccessful for two seconds after a good one, and reset() back to
 * the values the form started with (or was last saved with).
 */
export function useForm<T extends FormData>(initial: T | (() => T)) {
    const [defaults, setDefaults] = useState<T>(initial);
    const [data, setDataState] = useState<T>(defaults);
    const [errors, setErrors] = useState<Errors>({});
    const [processing, setProcessing] = useState(false);
    const [wasSuccessful, setWasSuccessful] = useState(false);
    const [recentlySuccessful, setRecentlySuccessful] = useState(false);
    // Kept beside the state so a submit in the same handler as a setData()
    // sends the new value, as Inertia's does.
    const latest = useRef(data);
    const transformer = useRef<(data: T) => unknown>((value) => value);
    const mounted = useRef(true);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => {
        mounted.current = true;

        return () => {
            mounted.current = false;
            clearTimeout(timer.current);
        };
    }, []);

    const commit = useCallback((next: T) => {
        latest.current = next;
        setDataState(next);
    }, []);

    const setData = useCallback(
        (keyOrData: keyof T | T | ((current: T) => T), value?: unknown) => {
            if (typeof keyOrData === 'function') {
                commit(keyOrData(latest.current));
            } else if (typeof keyOrData === 'object') {
                commit(keyOrData);
            } else {
                commit({ ...latest.current, [keyOrData]: value });
            }
        },
        [commit],
    );

    const reset = useCallback(
        (...fields: (keyof T)[]) => {
            if (fields.length === 0) {
                commit(defaults);
            } else {
                commit(fields.reduce((next, field) => ({ ...next, [field]: defaults[field] }), { ...latest.current }));
            }
        },
        [commit, defaults],
    );

    const clearErrors = useCallback((...fields: string[]) => {
        setErrors((current) => (fields.length === 0 ? {} : Object.fromEntries(Object.entries(current).filter(([field]) => !fields.includes(field)))));
    }, []);

    const setError = useCallback((fieldOrErrors: string | Errors, message?: string) => {
        setErrors((current) => ({ ...current, ...(typeof fieldOrErrors === 'string' ? { [fieldOrErrors]: message ?? '' } : fieldOrErrors) }));
    }, []);

    const submit = (method: Method, url: string, options: SubmitOptions = {}) => {
        const sent = latest.current;

        record(method, url, transformer.current(sent), {
            ...options,
            onBefore: (visit) => {
                setWasSuccessful(false);
                setRecentlySuccessful(false);
                clearTimeout(timer.current);

                return options.onBefore?.(visit);
            },
            onStart: (visit) => {
                setProcessing(true);
                options.onStart?.(visit);
            },
            onSuccess: (answered) => {
                if (mounted.current) {
                    setProcessing(false);
                    setErrors({});
                    setWasSuccessful(true);
                    setRecentlySuccessful(true);
                    timer.current = setTimeout(() => mounted.current && setRecentlySuccessful(false), RECENTLY_SUCCESSFUL_MS);
                }

                const result = options.onSuccess?.(answered);

                // What was saved is what a later reset() goes back to.
                if (mounted.current) {
                    setDefaults(sent);
                }

                return result;
            },
            onError: (failed) => {
                if (mounted.current) {
                    setProcessing(false);
                    setErrors(failed);
                }

                options.onError?.(failed);
            },
            onFinish: (visit) => {
                if (mounted.current) {
                    setProcessing(false);
                }

                options.onFinish?.(visit);
            },
        });
    };

    return {
        data,
        setData,
        errors,
        hasErrors: Object.keys(errors).length > 0,
        processing,
        progress: null,
        wasSuccessful,
        recentlySuccessful,
        isDirty: JSON.stringify(data) !== JSON.stringify(defaults),
        transform: (callback: (data: T) => unknown) => {
            transformer.current = callback;
        },
        reset,
        clearErrors,
        setError,
        get: (url: string, options?: SubmitOptions) => submit('get', url, options),
        post: (url: string, options?: SubmitOptions) => submit('post', url, options),
        put: (url: string, options?: SubmitOptions) => submit('put', url, options),
        patch: (url: string, options?: SubmitOptions) => submit('patch', url, options),
        delete: (url: string, options?: SubmitOptions) => submit('delete', url, options),
    };
}

interface LinkProps extends Callbacks {
    href?: string;
    method?: Method;
    as?: string;
    data?: unknown;
    children?: ReactNode;
    onClick?: (event: MouseEvent) => void;
    [prop: string]: unknown;
}

/** What Link passes to the visit and must not reach the DOM element. */
const VISIT_PROPS = ['preserveScroll', 'preserveState', 'preserveUrl', 'replace', 'only', 'except', 'headers', 'async', 'prefetch', 'cacheFor'];

/**
 * Inertia's Link: an anchor (a button for anything but GET, as Inertia
 * renders it) whose click is recorded as a visit instead of followed.
 */
export const Link = forwardRef(function Link(
    { href = '', method = 'get', as = 'a', data = {}, children, onClick, onBefore, onStart, onSuccess, onError, onFinish, ...props }: LinkProps,
    ref: Ref<HTMLElement>,
) {
    const tag = as === 'a' && method !== 'get' ? 'button' : as;
    const visitOptions: VisitOptions = { onBefore, onStart, onSuccess, onError, onFinish };
    const attributes: Record<string, unknown> = {};

    for (const [name, value] of Object.entries(props)) {
        if (VISIT_PROPS.includes(name)) {
            visitOptions[name] = value;
        } else {
            attributes[name] = value;
        }
    }

    return createElement(
        tag,
        {
            ...attributes,
            ...(tag === 'a' ? { href } : { type: 'button' }),
            ref,
            onClick: (event: MouseEvent) => {
                onClick?.(event);

                // A click that opens a new tab is the browser's, not Inertia's.
                if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) {
                    return;
                }

                event.preventDefault();
                record(method, href, data, visitOptions);
            },
        },
        children,
    );
});

/** The title lands on the document, where a test can read it. */
export function Head({ title }: { title?: string; children?: ReactNode }) {
    useEffect(() => {
        if (title !== undefined) {
            document.title = title;
        }
    }, [title]);

    return null;
}
