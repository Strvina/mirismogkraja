<?php

namespace App\Http\Controllers;

use App\Support\LocalUrl;
use App\Support\NotificationText;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

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
    public function open(Request $request, string $notification): RedirectResponse|SymfonyResponse
    {
        $record = $request->user()->notifications()->findOrFail($notification);

        $record->markAsRead();

        // Older rows kept a full address; either way it opens on this host.
        $url = LocalUrl::resolve($record->data['url'] ?? route('notifications.index'));

        // A link to one row (#isticanje-12) needs a real page load: a
        // redirect followed by XHR drops the fragment, and with it the
        // scroll to that row.
        return str_contains($url, '#') ? Inertia::location($url) : redirect($url);
    }

    /** One UPDATE, rather than loading every unread row to save it back. */
    public function readAll(Request $request): RedirectResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return back();
    }
}
