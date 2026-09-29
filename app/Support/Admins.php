<?php

namespace App\Support;

use App\Models\User;
use App\Notifications\SiteNotification;
use Illuminate\Support\Facades\Notification;

/**
 * Telling the people who run the site that something waits on them - a
 * producer to approve, a payment to confirm, a report to read. The admin
 * dashboard lists the same queues; this is what makes the bell ring.
 */
class Admins
{
    public static function notify(SiteNotification $notification): void
    {
        // whereHas rather than Spatie's role() scope, which throws when the
        // role does not exist yet - on a fresh install that would turn a
        // producer's sign-up into an error.
        $admins = User::whereHas('roles', fn ($roles) => $roles->where('name', 'admin'))->get(['users.id']);

        Notification::send($admins, $notification);
    }
}
