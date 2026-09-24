<?php

namespace App\Http\Middleware;

use App\Models\ProducerMessage;
use Illuminate\Http\Request;
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
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                // Roles come along so the header can offer the admin panel
                // link without every page having to pass them.
                'user' => $request->user()?->loadMissing('roles:id,name'),
            ],
            'unreadMessages' => fn () => $this->unreadMessageCount($request),
        ]);
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

        // One query, not two: the producers this user owns are matched
        // through an EXISTS subquery rather than being pulled out first. This
        // runs on every request of every signed-in visitor.
        return ProducerMessage::query()
            ->where('sender_id', '!=', $user->id)
            ->whereNull('read_at')
            ->where(fn ($query) => $query
                ->where('buyer_id', $user->id)
                ->orWhereExists(fn ($producers) => $producers
                    ->from('households')
                    ->whereColumn('households.id', 'producer_messages.household_id')
                    ->where('households.user_id', $user->id)
                    ->whereNull('households.deleted_at')))
            ->count();
    }
}
