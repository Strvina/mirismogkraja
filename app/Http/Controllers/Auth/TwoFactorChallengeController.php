<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\AuthRedirectService;
use App\Services\TwoFactor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

/**
 * The second step of signing in: a code from the authenticator app, or one
 * of the recovery codes. Reached only with a password (or Google) already
 * accepted in this session; until the code is too, nobody is signed in.
 */
class TwoFactorChallengeController extends Controller
{
    /** Wrong codes allowed before the sign-in has to start over. */
    private const ATTEMPTS = 5;

    public function create(Request $request, TwoFactor $twoFactor): Response|RedirectResponse
    {
        if ($twoFactor->pending($request) === null) {
            return to_route('login');
        }

        return Inertia::render('auth/two-factor-challenge');
    }

    public function store(Request $request, TwoFactor $twoFactor, AuthRedirectService $redirects): SymfonyResponse
    {
        $pending = $twoFactor->pending($request);

        if ($pending === null) {
            return to_route('login')->withErrors(['email' => __('Prijava je istekla. Unesite e-mail i lozinku ponovo.')]);
        }

        $data = $request->validate([
            'code' => ['nullable', 'string', 'max:20'],
            'recovery_code' => ['nullable', 'string', 'max:40'],
        ]);

        $user = $pending['user'];
        $key = 'two-factor:'.$user->id;

        // Six digits can be guessed in a million tries; five is what a
        // person with the right phone ever needs.
        if (RateLimiter::tooManyAttempts($key, self::ATTEMPTS)) {
            $twoFactor->forgetPending($request);

            return to_route('login')->withErrors(['email' => __('Previše pogrešnih kodova. Prijavite se ponovo.')]);
        }

        $accepted = filled($data['recovery_code'] ?? null)
            ? $twoFactor->useRecoveryCode($user, $data['recovery_code'])
            : $twoFactor->verify($user, (string) ($data['code'] ?? ''));

        if (! $accepted) {
            RateLimiter::hit($key, 15 * 60);

            throw ValidationException::withMessages(filled($data['recovery_code'] ?? null)
                ? ['recovery_code' => __('Rezervni kod nije ispravan ili je već iskorišćen.')]
                : ['code' => __('Kod nije ispravan. Proverite da li je sat na telefonu tačan i pokušajte ponovo.')]);
        }

        RateLimiter::clear($key);
        $twoFactor->forgetPending($request);

        Auth::login($user, $pending['remember']);
        $request->session()->regenerate();

        $redirect = redirect()->intended($redirects->homeFor($user));

        // A full page load for an admin, as after a plain sign-in: their
        // route list includes the admin panel (see AuthenticatedSessionController).
        return $user->hasRole('admin') ? Inertia::location($redirect) : $redirect;
    }
}
