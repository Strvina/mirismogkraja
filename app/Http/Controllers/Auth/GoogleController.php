<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\AuthRedirectService;
use App\Services\GoogleAuthService;
use App\Services\ReferralService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;
use Symfony\Component\HttpFoundation\RedirectResponse as SymfonyRedirect;
use Throwable;

/**
 * "Nastavi sa Google nalogom": signing in, and opening an account, without
 * a password.
 *
 * Both steps are plain page loads, not Inertia visits - the browser leaves
 * for Google and comes back - so the page that follows is loaded whole, and
 * an admin gets their route list without the special handling a form login
 * needs.
 */
class GoogleController extends Controller
{
    /** Send the visitor to Google's sign-in page. */
    public function redirect(): SymfonyRedirect
    {
        abort_unless(GoogleAuthService::enabled(), 404);

        return $this->google()
            // Always ask which account: on a shared computer the one Google
            // happens to be signed in with is often somebody else's.
            ->with(['prompt' => 'select_account'])
            ->redirect();
    }

    /** Google has sent the visitor back, with a code or with a refusal. */
    public function callback(Request $request, GoogleAuthService $accounts, AuthRedirectService $redirects, ReferralService $referrals): RedirectResponse
    {
        abort_unless(GoogleAuthService::enabled(), 404);

        try {
            $googleUser = $this->google()->user();
        } catch (Throwable $e) {
            // A state that does not match is a request that did not start
            // here, or a sign-in page left open too long; "cancel" at Google
            // comes back without a code. Neither is the site's error. Anything
            // else (Google unreachable, wrong keys) is worth hearing about.
            if (! $e instanceof InvalidStateException && $request->missing('error')) {
                report($e);
            }

            return $this->refuse(__('Prijava preko Google naloga nije uspela. Pokušajte ponovo.'));
        }

        try {
            [$user, $created] = $accounts->resolve($googleUser);
        } catch (ValidationException $e) {
            return $this->refuse($e->validator->errors()->first('email'));
        }

        if ($created) {
            // The same two steps as registering with a password.
            $referrals->attach($user, $request);
            event(new Registered($user));
        }

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        return redirect()->intended($redirects->homeFor($user));
    }

    /**
     * With the state check (Socialite's default) and PKCE on top: the code
     * Google returns is useless to anyone who did not start this sign-in.
     */
    private function google(): Provider
    {
        return Socialite::driver('google')->enablePKCE();
    }

    private function refuse(string $message): RedirectResponse
    {
        return to_route('login')->withErrors(['email' => $message]);
    }
}
