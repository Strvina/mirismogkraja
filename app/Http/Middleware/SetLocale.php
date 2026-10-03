<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Chooses the language a page is written in.
 *
 * In order: what the visitor picked in the language menu (a cookie), then
 * what their browser says they read, then Serbian. A browser asking for a
 * language close to one the site has is given that one - Croatian or
 * Bosnian reads Serbian, Belarusian reads Russian. A request that states no
 * language at all - which is what search engines send - gets Serbian, the
 * site's own language.
 */
class SetLocale
{
    public const COOKIE = 'locale';

    /** Browser languages answered with one the site has. */
    private const CLOSE_ENOUGH = [
        'sr' => 'sr', 'hr' => 'sr', 'bs' => 'sr', 'sh' => 'sr', 'cnr' => 'sr', 'me' => 'sr',
        'ru' => 'ru', 'be' => 'ru',
        'en' => 'en',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $locale = $this->localeFor($request);
        app()->setLocale($locale);

        $response = $next($request);

        // Remembered for e-mails, which have no browser to ask. Written only
        // when it changes, and without touching updated_at or the audit log.
        $user = $request->user();

        if ($user && $user->locale !== $locale) {
            $user->forceFill(['locale' => $locale])->saveQuietly();
        }

        return $response;
    }

    private function localeFor(Request $request): string
    {
        $supported = config('app.supported_locales');
        $chosen = $request->cookie(self::COOKIE);

        if (is_string($chosen) && in_array($chosen, $supported, true)) {
            return $chosen;
        }

        $languages = $request->getLanguages();

        if ($languages === []) {
            return config('app.locale');
        }

        foreach ($languages as $language) {
            $primary = strtolower(strtok($language, '_-'));

            if (isset(self::CLOSE_ENOUGH[$primary])) {
                return self::CLOSE_ENOUGH[$primary];
            }
        }

        // A language the site does not have: English is the one most
        // visitors from elsewhere can read.
        return 'en';
    }
}
