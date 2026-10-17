<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;

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

    /**
     * The page a sign-in or sign-up link was followed from (its `redirect`),
     * kept as the place to land once signed in: someone who found a product
     * and was asked to sign in to write to its producer comes back to it,
     * not to the home page. Every way of signing in ends in
     * redirect()->intended(), so this one place covers them all.
     *
     * Only a path on this site counts - never "//elsewhere.com" or a full
     * address, which would make the login page a way to send people off it.
     * The home page clears what an earlier, abandoned link left behind.
     */
    public function rememberDestination(Request $request): void
    {
        $destination = $request->query('redirect');

        if (! is_string($destination) || ! str_starts_with($destination, '/') || str_starts_with($destination, '//') || str_contains($destination, '\\')) {
            return;
        }

        if ($destination === '/') {
            $request->session()->forget('url.intended');

            return;
        }

        redirect()->setIntendedUrl(url($destination));
    }
}
