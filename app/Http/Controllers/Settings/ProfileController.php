<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\AvatarUpdateRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\User;
use App\Services\ProfileUpdateService;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
     * form (task 2 fix - avoids requiring name/email when only the picture
     * changes).
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
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
