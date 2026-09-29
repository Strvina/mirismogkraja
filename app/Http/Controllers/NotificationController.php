<?php

namespace App\Http\Controllers;

use App\Support\NotificationText;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('notifications/index', [
            'notifications' => $request->user()
                ->notifications()
                ->paginate(20)
                ->through(fn (DatabaseNotification $notification) => [
                    'id' => $notification->id,
                    ...NotificationText::for($notification->data),
                    'url' => $notification->data['url'] ?? null,
                    'read' => $notification->read_at !== null,
                    'created_at' => $notification->created_at,
                ]),
        ]);
    }

    /**
     * Opening a notification marks it read and forwards to whatever it is
     * about, so the bell empties itself by being used rather than needing a
     * separate "mark as read" step.
     */
    public function open(Request $request, string $notification): RedirectResponse
    {
        $record = $request->user()->notifications()->findOrFail($notification);

        $record->markAsRead();

        return redirect($record->data['url'] ?? route('notifications.index'));
    }

    /** One UPDATE, rather than loading every unread row to save it back. */
    public function readAll(Request $request): RedirectResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return back();
    }
}
