import { router } from '@inertiajs/react';

/**
 * Push notifications on this device (App\Support\Push, public/sw.js).
 *
 * "unsupported" covers an iPhone using the site in Safari: iOS only offers
 * push to a site that has been added to the home screen first.
 */
export type PushState = 'unsupported' | 'denied' | 'off' | 'on';

export function pushSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** The iPhone/iPad case worth explaining: supported once installed, not before. */
export function isIosOutsideHomeScreen(): boolean {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone;

    return ios && !standalone;
}

/** Registered once per page load, by app.tsx. */
export function registerServiceWorker(): void {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
}

async function subscription(): Promise<PushSubscription | null> {
    const registration = await navigator.serviceWorker.ready;

    return registration.pushManager.getSubscription();
}

export async function pushState(): Promise<PushState> {
    if (!pushSupported()) {
        return 'unsupported';
    }

    if (Notification.permission === 'denied') {
        return 'denied';
    }

    return (await subscription()) ? 'on' : 'off';
}

/** The server's VAPID key, as the browser wants it. */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
    const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const bytes = new Uint8Array(new ArrayBuffer(raw.length));

    for (let i = 0; i < raw.length; i++) {
        bytes[i] = raw.charCodeAt(i);
    }

    return bytes;
}

export async function enablePush(publicKey: string): Promise<PushState> {
    if ((await Notification.requestPermission()) !== 'granted') {
        return Notification.permission === 'denied' ? 'denied' : 'off';
    }

    const registration = await navigator.serviceWorker.ready;
    const created =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));

    await new Promise<void>((resolve, reject) =>
        router.post(
            route('push.store'),
            { ...created.toJSON(), contentEncoding: 'aes128gcm' },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => resolve(),
                onError: () => reject(new Error('push subscription refused')),
            },
        ),
    );

    return 'on';
}

export async function disablePush(): Promise<PushState> {
    const existing = await subscription();

    if (existing) {
        const endpoint = existing.endpoint;
        await existing.unsubscribe();
        router.delete(route('push.destroy'), { data: { endpoint }, preserveScroll: true, preserveState: true });
    }

    return 'off';
}
