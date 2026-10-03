<?php

namespace App\Services;

use App\Models\User;

class AuthRedirectService
{
    /**
     * Where a user lands after authenticating: the public home page
     * rather than the starter kit's dashboard - except admins, who go
     * straight to the admin panel.
     */
    public function homeFor(?User $user): string
    {
        return $user?->hasRole('admin')
            ? route('admin.dashboard', absolute: false)
            : route('home', absolute: false);
    }
}
