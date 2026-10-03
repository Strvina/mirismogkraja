<?php

namespace App\Http\Middleware;

use App\Support\Media;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

/**
 * The security headers every response carries, and a Content-Security-
 * Policy on every page.
 *
 * The policy lets scripts run only from this site, from Cloudflare's robot
 * check, and inline only with this request's nonce - which Vite puts on its
 * tags and the layout on Ziggy's route list. An injected <script> has no
 * nonce and does not run. Styles stay 'unsafe-inline': React's style
 * attributes and Leaflet's map need it, and a style cannot run code.
 *
 * CSP_REPORT_ONLY=true sends the same policy as report-only, a quick way
 * back if something on a live site turns out to be blocked.
 */
class SecurityHeaders
{
    private const TURNSTILE = 'https://challenges.cloudflare.com';

    private const MAP_TILES = 'https://tile.openstreetmap.org';

    public function handle(Request $request, Closure $next): Response
    {
        $nonce = Vite::useCspNonce();

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

        if (str_contains((string) $response->headers->get('Content-Type'), 'text/html')) {
            // Under `composer dev` the scripts come from Vite's server, often
            // at http://[::1]:5173 - an address a policy cannot name - so
            // there the policy only reports, and never blocks the page.
            $reportOnly = config('app.csp_report_only') || Vite::isRunningHot();
            $header = $reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
            $response->headers->set($header, $this->policy($nonce));
        }

        // Only over HTTPS: sent on plain HTTP it is ignored at best, and on
        // a local setup it would pin the browser to a scheme that isn't there.
        if ($request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }

    private function policy(string $nonce): string
    {
        // `composer dev`: scripts, styles and hot reload come from Vite's server.
        $vite = Vite::isRunningHot() ? rtrim(trim((string) file_get_contents(Vite::hotFile())), '/') : null;
        $viteSocket = $vite ? preg_replace('#^http#', 'ws', $vite) : null;
        // Images on S3 or a CDN, once MEDIA_DISK points there.
        $media = str_starts_with(Media::baseUrl(), 'http') ? (parse_url(Media::baseUrl(), PHP_URL_SCHEME).'://'.parse_url(Media::baseUrl(), PHP_URL_HOST)) : null;

        $directives = [
            'default-src' => ["'self'"],
            'script-src' => ["'self'", "'nonce-{$nonce}'", self::TURNSTILE, $vite],
            'style-src' => ["'self'", "'unsafe-inline'", $vite],
            'img-src' => ["'self'", 'data:', 'blob:', self::MAP_TILES, $media],
            'font-src' => ["'self'", 'data:', $vite],
            'connect-src' => ["'self'", $vite, $viteSocket],
            'frame-src' => [self::TURNSTILE],
            'frame-ancestors' => ["'self'"],
            'base-uri' => ["'self'"],
            'form-action' => ["'self'"],
            'object-src' => ["'none'"],
        ];

        return collect($directives)
            ->map(fn (array $sources, string $name) => $name.' '.implode(' ', array_filter($sources)))
            ->implode('; ');
    }
}
