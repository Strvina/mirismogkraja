import { router } from '@inertiajs/react';
import { useCallback, useEffect, useRef } from 'react';

/**
 * Polling that slows down when nothing happens.
 *
 * Starts at `min`; every check that finds nothing new waits half as long
 * again, up to `max`. When `signal` changes (a new message arrived, one was
 * sent) it is back to `min` at once. A tab in the background checks only
 * every `max`. An open conversation nobody is typing in costs a request
 * every 20 seconds instead of every 3 - which, across thousands of open
 * tabs, is most of the load polling puts on the server.
 */
export function useAdaptivePoll(only: string[], signal: unknown, { min = 3_000, max = 20_000 } = {}) {
    const delay = useRef(min);
    const timer = useRef<number | undefined>(undefined);
    const running = useRef(true);
    const onlyKey = only.join(',');

    const schedule = useCallback(() => {
        window.clearTimeout(timer.current);

        if (!running.current) {
            return;
        }

        timer.current = window.setTimeout(
            () => {
                router.reload({
                    only: onlyKey.split(','),
                    async: true,
                    showProgress: false,
                    onFinish: () => {
                        delay.current = Math.min(max, Math.round(delay.current * 1.5));
                        schedule();
                    },
                });
            },
            document.hidden ? max : delay.current,
        );
    }, [onlyKey, max]);

    // Something happened: check again soon.
    useEffect(() => {
        delay.current = min;
        schedule();
    }, [signal, min, schedule]);

    // Back to the tab: check right away rather than at the slow pace.
    useEffect(() => {
        const wake = () => {
            if (!document.hidden) {
                delay.current = min;
                schedule();
            }
        };

        document.addEventListener('visibilitychange', wake);

        return () => {
            document.removeEventListener('visibilitychange', wake);
            window.clearTimeout(timer.current);
        };
    }, [min, schedule]);

    return {
        stop: () => {
            running.current = false;
            window.clearTimeout(timer.current);
        },
        start: () => {
            running.current = true;
            delay.current = min;
            schedule();
        },
    };
}
