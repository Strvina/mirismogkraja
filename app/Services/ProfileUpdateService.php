<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class ProfileUpdateService
{
    /**
     * Update the user's profile with the given validated attributes.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function update(User $user, array $attributes): void
    {
        $user->fill($attributes);

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();
    }

    /**
     * Store the new avatar and remove the user's previous one, if any.
     *
     * Kept as its own endpoint/request (task 2 fix) so that changing only
     * the avatar never drags in validation for unrelated profile fields.
     */
    public function updateAvatar(User $user, UploadedFile $avatar): void
    {
        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $user->avatar_path = $avatar->store('avatars', 'public');
        $user->save();
    }
}
