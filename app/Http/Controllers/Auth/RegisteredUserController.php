<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Rules\Turnstile;
use App\Services\ReferralService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Show the registration page.
     */
    public function create(Request $request, ReferralService $referrals): Response
    {
        return Inertia::render('auth/register', [
            'captchaSiteKey' => Turnstile::siteKey(),
            // Whose referral link brought the visitor here, if one did.
            'referrer' => $referrals->referrerFrom($request)?->name,
        ]);
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request, ReferralService $referrals): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            ...Turnstile::rules(),
        ], Turnstile::messages());

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $user->assignRole('buyer');

        // Arrived through a producer's referral link: noted now, rewarded
        // only if this account's producer is later approved.
        $referrals->attach($user, $request);

        event(new Registered($user));

        Auth::login($user);

        // Straight to "check your inbox": until the link is clicked, messages,
        // reviews and producer pages are closed (the "verified" routes).
        return redirect()->route('verification.notice');
    }
}
