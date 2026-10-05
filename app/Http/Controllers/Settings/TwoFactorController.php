<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Services\TwoFactor;
use App\Support\Qr;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Turning two-step sign-in on and off. Every step that weakens or replaces
 * it asks for the password again: a session left open on a shared computer
 * should not be enough to take the second step away.
 */
class TwoFactorController extends Controller
{
    public function edit(Request $request): Response
    {
        $user = $request->user();
        $settingUp = $user->two_factor_secret !== null && ! $user->hasTwoFactor();

        return Inertia::render('settings/two-factor', [
            'enabled' => $user->hasTwoFactor(),
            // An account opened with Google has no password to confirm with yet.
            'hasPassword' => $user->hasPassword(),
            // While setting up: the secret for typing by hand; the QR code
            // is an image on its own address.
            'setup' => $settingUp ? ['secret' => $user->two_factor_secret] : null,
            // Shown once, right after they are made.
            'recoveryCodes' => $request->session()->get('two_factor.recovery_codes'),
            'recoveryCodesLeft' => $user->hasTwoFactor() ? count($user->two_factor_recovery_codes ?? []) : null,
        ]);
    }

    /** The QR code for the secret being set up. Never cached: it is the secret. */
    public function qr(Request $request, TwoFactor $twoFactor): HttpResponse
    {
        $user = $request->user();

        abort_if($user->two_factor_secret === null || $user->hasTwoFactor(), 404);

        return response(Qr::svg($twoFactor->otpauthUrl($user), size: 220), 200, [
            'Content-Type' => 'image/svg+xml',
            'Cache-Control' => 'no-store, private',
        ]);
    }

    /** Start setting up. Nothing is in force until a code confirms it. */
    public function store(Request $request, TwoFactor $twoFactor): RedirectResponse
    {
        $this->confirmPassword($request);

        abort_if($request->user()->hasTwoFactor(), 409);

        $twoFactor->begin($request->user());

        return back();
    }

    public function confirm(Request $request, TwoFactor $twoFactor): RedirectResponse
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:20']]);

        $codes = $twoFactor->confirm($request->user(), $data['code']);

        if ($codes === null) {
            throw ValidationException::withMessages([
                'code' => __('Kod nije ispravan. Proverite da li je sat na telefonu tačan i pokušajte ponovo.'),
            ]);
        }

        return back()->with('two_factor.recovery_codes', $codes);
    }

    public function regenerateRecoveryCodes(Request $request, TwoFactor $twoFactor): RedirectResponse
    {
        $this->confirmPassword($request);

        abort_unless($request->user()->hasTwoFactor(), 409);

        return back()->with('two_factor.recovery_codes', $twoFactor->regenerateRecoveryCodes($request->user()));
    }

    /** Turn it off, or abandon a set-up that was never confirmed. */
    public function destroy(Request $request, TwoFactor $twoFactor): RedirectResponse
    {
        $this->confirmPassword($request);

        $twoFactor->disable($request->user());

        return back()->with('status', __('Dvostruka potvrda je isključena.'));
    }

    private function confirmPassword(Request $request): void
    {
        if (! $request->user()->hasPassword()) {
            throw ValidationException::withMessages([
                'current_password' => __('Prvo postavite lozinku za nalog, pa uključite dvostruku potvrdu.'),
            ]);
        }

        $request->validate(['current_password' => ['required', 'current_password']]);
    }
}
