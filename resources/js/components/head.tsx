import { Head as InertiaHead, usePage } from '@inertiajs/react';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

/**
 * The page's title.
 *
 * A public page's title is written by the server into the first HTML
 * (App\Support\PageMeta) - the one search engines and link previews read -
 * and a page must not rename itself once it loads: that title is kept as it
 * is, whatever is passed here. A page the server gave no title to is titled
 * by what is passed, with the site's name after it.
 *
 * Nothing but the title goes in a page's head from React: the description
 * and the rest are the server's, in the first HTML, or nobody reads them.
 */
export default function Head({ title }: { title: string }) {
    const written = usePage<{ meta?: { title?: string } }>().props.meta?.title;

    return <InertiaHead title={written ?? `${title} - ${appName}`} />;
}
