/*
 * The site's service worker. Its one job is push notifications: showing
 * one when App\Support\Push sends it, and opening the right page when it
 * is tapped. It deliberately caches nothing - every page and asset comes
 * from the network as usual, so nothing can ever be served stale from here.
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
    let data = {};

    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = { title: event.data ? event.data.text() : '' };
    }

    event.waitUntil(
        self.registration.showNotification(data.title || 'Vrelina juga', {
            body: data.body || '',
            icon: '/icons/icon-192.png',
            badge: '/icons/badge-96.png',
            // One notification per conversation: a newer message replaces
            // the older one, and still buzzes.
            tag: data.tag,
            renotify: Boolean(data.tag),
            data: { url: data.url || '/' },
        }),
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = new URL(event.notification.data?.url || '/', self.location.origin).href;

    event.waitUntil(
        (async () => {
            const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            // A tab of the site is already open: bring it forward there.
            const open = windows.find((client) => new URL(client.url).origin === self.location.origin);

            if (open) {
                await open.focus();

                return open.navigate(url);
            }

            return self.clients.openWindow(url);
        })(),
    );
});
