<?php

namespace App\Http\Middleware;

use App\Models\ProducerMessage;
use App\Support\Media;
use App\Support\NotificationText;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            // Which language the page is in; the client loads its words.
            'locale' => app()->getLocale(),
            // Where images are served from, and whether new uploads get a
            // small copy for cards (see App\Support\Media).
            'media' => ['url' => Media::baseUrl(), 'thumbs' => Media::thumbnailsEnabled()],
            'auth' => [
                // Roles come along so the header can offer the admin panel
                // link without every page having to pass them.
                'user' => $request->user()?->loadMissing('roles:id,name'),
            ],
            'unreadMessages' => fn () => $this->unreadMessageCount($request),
            // A count, not the notifications themselves: the bell only needs
            // a number on every page, and the list is fetched when it is
            // actually opened.
            'unreadNotifications' => fn () => (int) $request->user()?->unreadNotifications()->count(),
            // Evaluated only when a partial reload asks for it by name, so
            // opening the bell costs one small request and every other page
            // load costs nothing.
            //
            // Deliberately not called 'notifications': page props are merged
            // over shared ones, so sharing that name would collide with the
            // notifications page's own paginator - and the bell asking for
            // 'notifications' there would be handed a paginator instead of a
            // list.
            'recentNotifications' => Inertia::optional(fn () => $request->user()
                ?->notifications()
                ->latest()
                // The newest few; the rest are one click away on the full page.
                ->limit(5)
                ->get()
                ->map(fn ($notification) => [
                    'id' => $notification->id,
                    ...NotificationText::for($notification->data),
                    'read' => $notification->read_at !== null,
                    'created_at' => $notification->created_at,
                ])),
        ];
    }

    /**
     * Messages waiting for this user, from either side of a thread: ones
     * addressed to them as a buyer, and ones sent to a producer they own.
     */
    private function unreadMessageCount(Request $request): int
    {
        $user = $request->user();

        if (! $user) {
            return 0;
        }

        // Two indexed counts rather than one query with an OR: this runs on
        // every page of every signed-in visitor, and "buyer is me OR the
        // producer is mine" cannot use an index, so it scanned every unread
        // message on the site. The halves never overlap - nobody writes to
        // their own producer.
        $asBuyer = ProducerMessage::query()
            ->where('buyer_id', $user->id)
            ->whereNull('read_at')
            ->where('sender_id', '!=', $user->id)
            ->count();

        $asSeller = ProducerMessage::query()
            ->whereIn('producer_id', $user->producers()->select('id'))
            ->whereNull('read_at')
            ->where('sender_id', '!=', $user->id)
            ->count();

        return $asBuyer + $asSeller;
    }
}
