<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class ProfileUpdateService
{
    /**
     * Update the user's profile with the given validated attributes and,
     * optionally, a new avatar.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function update(User $user, array $attributes, ?UploadedFile $avatar): void
    {
        $user->fill($attributes);

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        if ($avatar) {
            $this->replaceAvatar($user, $avatar);
        }

        $user->save();
    }

    /**
     * Store the new avatar and remove the user's previous one, if any.
     */
    private function replaceAvatar(User $user, UploadedFile $avatar): void
    {
        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $user->avatar_path = $avatar->store('avatars', 'public');
    }
}
