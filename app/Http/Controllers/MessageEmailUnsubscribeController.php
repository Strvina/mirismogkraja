<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Turning off the "new message" e-mails from the link in one, without
 * signing in. The link is signed, so it only works for the account it was
 * sent to. Opening it only asks; the button does it - mail scanners open
 * every link in a message, and must not unsubscribe anyone by doing so.
 */
class MessageEmailUnsubscribeController extends Controller
{
    public function show(Request $request, User $user): Response
    {
        return Inertia::render('notifications/unsubscribe', [
            'action' => $request->fullUrl(),
            'done' => ! $user->notify_messages_by_email,
        ]);
    }

    public function store(User $user): RedirectResponse
    {
        $user->forceFill(['notify_messages_by_email' => false])->saveQuietly();

        return back();
    }
}
