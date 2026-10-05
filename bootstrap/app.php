<?php

use App\Http\Middleware\EnsureUserIsNotBlocked;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\SetLocale;
use App\Http\Middleware\ThrottlePerRoute;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Sentry\Laravel\Integration;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Every response, not just pages: a JSON error or the sitemap is
        // served from the same origin as everything else.
        $middleware->append(SecurityHeaders::class);

        // A beacon cannot carry a CSRF token, and this route only counts.
        $middleware->validateCsrfTokens(except: ['statistika/*']);

        // Holds nothing but "sr", "en" or "ru", and is read before the
        // session exists - there is nothing in it to protect.
        $middleware->encryptCookies(except: [SetLocale::COOKIE]);

        $middleware->web(append: [
            // Before the shared props, which are written in the language.
            SetLocale::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            EnsureUserIsNotBlocked::class,
        ]);

        $middleware->alias([
            // Each throttled route keeps its own count (see ThrottlePerRoute).
            'throttle' => ThrottlePerRoute::class,
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Errors also go to Sentry when SENTRY_LARAVEL_DSN is set; without
        // it this does nothing. No personal data is sent (send_default_pii
        // is off by default).
        Integration::handles($exceptions);
    })->create();
