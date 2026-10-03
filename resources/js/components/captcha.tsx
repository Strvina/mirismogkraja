import { useEffect, useRef } from 'react';

interface TurnstileApi {
    render: (
        element: HTMLElement,
        options: {
            sitekey: string;
            theme?: 'auto' | 'light' | 'dark';
            size?: 'normal' | 'flexible' | 'compact';
            callback: (token: string) => void;
            'expired-callback': () => void;
            'error-callback': () => void;
        },
    ) => string;
    reset: (widgetId: string) => void;
    remove: (widgetId: string) => void;
}

declare global {
    interface Window {
        turnstile?: TurnstileApi;
    }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let loading: Promise<void> | null = null;

/** Cloudflare's script, loaded once and only on a page that shows the check. */
function loadTurnstile(): Promise<void> {
    loading ??= new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = SCRIPT_URL;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => {
            // Let a later mount try again rather than keep a failed promise.
            loading = null;
            script.remove();
            reject(new Error('Turnstile failed to load'));
        };
        document.head.appendChild(script);
    });

    return loading;
}

/**
 * The "you are a person" check (Cloudflare Turnstile). Renders nothing while
 * the server has it switched off - no site key. Most visitors never see a
 * puzzle: the widget checks on its own and hands over a token.
 *
 * A token is good for one submit, so the form bumps `attempt` after each
 * one that comes back, and the widget fetches a fresh token.
 */
export default function Captcha({ siteKey, attempt, onToken }: { siteKey?: string | null; attempt: number; onToken: (token: string) => void }) {
    const box = useRef<HTMLDivElement>(null);
    const widget = useRef<string | undefined>(undefined);
    const report = useRef(onToken);
    report.current = onToken;

    useEffect(() => {
        if (!siteKey) {
            return;
        }

        let cancelled = false;

        loadTurnstile()
            .then(() => {
                if (cancelled || !box.current || !window.turnstile) {
                    return;
                }

                widget.current = window.turnstile.render(box.current, {
                    sitekey: siteKey,
                    theme: 'auto',
                    size: 'flexible',
                    callback: (token) => report.current(token),
                    'expired-callback': () => report.current(''),
                    'error-callback': () => report.current(''),
                });
            })
            // Blocked or offline: the server's message says what is missing.
            .catch(() => undefined);

        return () => {
            cancelled = true;

            if (widget.current) {
                window.turnstile?.remove(widget.current);
                widget.current = undefined;
            }
        };
    }, [siteKey]);

    useEffect(() => {
        if (attempt > 0 && widget.current) {
            report.current('');
            window.turnstile?.reset(widget.current);
        }
    }, [attempt]);

    if (!siteKey) {
        return null;
    }

    // Reserves the widget's height so the form doesn't jump when it appears.
    return <div ref={box} className="min-h-[65px]" />;
}
