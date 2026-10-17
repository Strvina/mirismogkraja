import { usePage } from '@inertiajs/react';

type AuthPage = 'login' | 'register';

/**
 * Links to the login and sign-up pages that bring the visitor back
 * afterwards: to `destination` when given, otherwise to the page they are
 * on. Someone asked to sign in to write about a product lands on that
 * product again, rather than having to find it a second time. The server
 * keeps the way back (AuthRedirectService::rememberDestination).
 */
export function useSignInUrl(): (page?: AuthPage, destination?: string) => string {
    const { url } = usePage();

    return (page = 'login', destination = url) => {
        // Only the path goes along: the server takes nothing that leaves the site.
        const target = new URL(destination, window.location.origin);

        return route(page, { redirect: target.pathname + target.search });
    };
}
