<?php

namespace App\Http\Controllers;

use App\Http\Middleware\SetLocale;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * The language menu: remembers the choice for a year and goes back to the
 * page it was made on, now in the new language.
 *
 * A plain link rather than a form - it works without JavaScript, and the
 * full page load it causes is what brings the other language's words.
 */
class LocaleController extends Controller
{
    public function __invoke(Request $request, string $locale): RedirectResponse
    {
        abort_unless(in_array($locale, config('app.supported_locales'), true), 404);

        // Only back to this site, whatever the Referer claims.
        $back = url()->previous();
        $target = parse_url($back, PHP_URL_HOST) === $request->getHost() ? $back : url('/');

        return redirect()->to($target)->withCookie(cookie(SetLocale::COOKIE, $locale, 60 * 24 * 365));
    }
}
