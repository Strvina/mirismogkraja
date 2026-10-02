<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Rules\Turnstile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    /**
     * Show the password reset link request page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
            'captchaSiteKey' => Turnstile::siteKey(),
        ]);
    }

    /**
     * Handle an incoming password reset link request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
            ...Turnstile::rules(),
        ], Turnstile::messages());

        // After the response: the page then answers equally fast whether the
        // account exists or not - waiting on the mail server only for real
        // accounts would give them away - and nobody waits on it either.
        $credentials = $request->only('email');
        dispatch(fn () => Password::sendResetLink($credentials))->afterResponse();

        return back()->with('status', __('A reset link will be sent if the account exists.'));
    }
}
