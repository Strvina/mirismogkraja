<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Turning off the weekly digest from the link in one, without signing in.
 * Signed, and done by the button rather than by opening the link, for the
 * reasons MessageEmailUnsubscribeController gives.
 */
class DigestUnsubscribeController extends Controller
{
    public function show(Request $request, User $user): Response
    {
        return Inertia::render('notifications/unsubscribe', [
            'kind' => 'digest',
            'action' => $request->fullUrl(),
            'done' => ! $user->notify_weekly_digest,
        ]);
    }

    public function store(User $user): RedirectResponse
    {
        $user->forceFill(['notify_weekly_digest' => false])->saveQuietly();

        return back();
    }
}
