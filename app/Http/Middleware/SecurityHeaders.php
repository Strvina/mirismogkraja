<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The headers every response should carry and none did.
 *
 * No Content-Security-Policy yet: the page boots from inline scripts (the
 * Inertia page object and Ziggy's route list), so a useful policy needs
 * nonces threaded through both - a change of its own, not a header line.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->add([
            // Uploaded images are served from our own domain; a browser must
            // not be talked into running one as a script.
            'X-Content-Type-Options' => 'nosniff',
            // No page here is meant to be framed, so nobody can overlay the
            // site to trick a click.
            'X-Frame-Options' => 'SAMEORIGIN',
            // Links out still say where the visitor came from, but not which
            // page - a thread URL names the people in it.
            'Referrer-Policy' => 'strict-origin-when-cross-origin',
            // Location only for the site itself: "producers near me".
            'Permissions-Policy' => 'camera=(), microphone=(), geolocation=(self), payment=()',
        ]);

        // Only over HTTPS: sent on plain HTTP it is ignored at best, and on
        // a local setup it would pin the browser to a scheme that isn't there.
        if ($request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }
}
