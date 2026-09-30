import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { route as routeFn } from 'ziggy-js';
import ConfirmHost from './components/confirm-host';
import { initializeTheme } from './hooks/use-appearance';
import { loadLocale } from './lib/i18n';
import { revalidateOnHistoryNavigation } from './lib/revalidate-on-history-navigation';

declare global {
    const route: typeof routeFn;
}

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        // The words first, so the first paint is already in the reader's
        // language. A change of language is a full page load (see
        // LocaleController), so this runs once per language.
        loadLocale(props.initialPage.props.locale as string).then(() =>
            root.render(
                <>
                    <App {...props} />
                    <ConfirmHost />
                </>,
            ),
        );
    },
    progress: {
        // Matches the brand primary (brick red) instead of the starter
        // kit's generic gray.
        color: '#94412f',
    },
});

// This will set light / dark mode on load...
initializeTheme();

// Back and Forward restore a page from history; re-request it so what it
// shows is current.
revalidateOnHistoryNavigation();
