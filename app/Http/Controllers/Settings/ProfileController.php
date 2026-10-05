<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\AvatarUpdateRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\User;
use App\Services\ProfileUpdateService;
use App\Support\Media;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'hasPassword' => $request->user()->hasPassword(),
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Update the user's profile settings.
     */
    public function update(ProfileUpdateRequest $request, ProfileUpdateService $profiles): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        $profiles->update($user, $request->validated());

        return to_route('profile.edit');
    }

    /**
     * Update the user's avatar only, independent of the rest of the profile
     * form, so changing the picture never requires the name and e-mail.
     */
    public function updateAvatar(AvatarUpdateRequest $request, ProfileUpdateService $profiles): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        $profiles->updateAvatar($user, $request->file('avatar'));

        return to_route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        // The password confirms it is really them. An account opened with
        // Google has none, so its owner types the account's e-mail address
        // instead - a deliberate act, sent in the same field.
        $request->validate([
            'password' => $user->hasPassword() ? ['required', 'current_password'] : ['required', Rule::in([$user->email])],
        ], [
            'password.in' => __('Upišite e-mail adresu naloga da potvrdite brisanje.'),
        ]);

        // Removing the last administrator would lock everyone out of the
        // admin panel with no way back in through the interface.
        if ($user->hasRole('admin') && User::role('admin')->count() === 1) {
            throw ValidationException::withMessages([
                'password' => __('Vaš nalog je jedini administrator, pa ne može biti obrisan.'),
            ]);
        }

        // Messages and audit entries have to stay readable, so the account is
        // archived rather than cascaded away. The e-mail address is released
        // at the same time: it is unique across the table, and a soft-deleted
        // row would otherwise keep the address hostage forever.
        DB::transaction(function () use ($user): void {
            $user->producers->each->delete();

            Media::delete($user->avatar_path);

            // Nothing that identifies the person stays: reviews and
            // conversations keep their place under a neutral name.
            $user->forceFill([
                ...User::ANONYMISED,
                'email' => "obrisan-{$user->id}@obrisan.local",
                // Released like the address, so the same Google account can
                // open a new account later.
                'google_id' => null,
                'password' => Hash::make(Str::random(64)),
                'remember_token' => null,
                // Nothing left to sign in to, so nothing left to guard it.
                'two_factor_secret' => null,
                'two_factor_recovery_codes' => null,
                'two_factor_confirmed_at' => null,
            ])->save();

            $user->delete();
        });

        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
