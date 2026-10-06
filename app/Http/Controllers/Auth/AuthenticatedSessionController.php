<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Services\AuthRedirectService;
use App\Services\GoogleAuthService;
use App\Services\TwoFactor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class AuthenticatedSessionController extends Controller
{
    /**
     * Show the login page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => $request->session()->get('status'),
            'googleEnabled' => GoogleAuthService::enabled(),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     *
     * A full page load afterwards, not an Inertia visit: the route list the
     * browser's route() uses is written into the page once, per user (an
     * admin's includes the admin panel, a visitor's does not - see
     * config/ziggy.php). Kept from the login page, an admin would be left
     * with the visitor's list and every admin page calling route() would
     * fail.
     */
    public function store(LoginRequest $request, AuthRedirectService $redirects, TwoFactor $twoFactor): SymfonyResponse
    {
        $user = $request->validateCredentials();

        // The password was right, but this account also asks for a code:
        // nobody is signed in until they have given it.
        if ($user->hasTwoFactor()) {
            return $twoFactor->challenge($request, $user, $request->boolean('remember'));
        }

        Auth::login($user, $request->boolean('remember'));

        $request->session()->regenerate();

        $redirect = redirect()->intended($redirects->homeFor($request->user()));

        // Only an admin needs the whole page reloaded: their route list
        // (Ziggy) includes the admin panel and is written into the page at
        // load. Everyone else keeps the one they have - a normal visit,
        // without reloading every script.
        return $request->user()->hasRole('admin') ? Inertia::location($redirect) : $redirect;
    }

    /**
     * Destroy an authenticated session. A full page load only for an admin,
     * for the same reason as logging in: their route list goes with them.
     */
    public function destroy(Request $request): SymfonyResponse
    {
        $wasAdmin = (bool) $request->user()?->hasRole('admin');

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return $wasAdmin ? Inertia::location(url('/')) : redirect('/');
    }
}
