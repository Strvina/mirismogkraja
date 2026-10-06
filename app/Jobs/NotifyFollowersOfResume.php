<?php

namespace App\Jobs;

use App\Models\Producer;
use App\Notifications\SiteNotification;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Notification;

/**
 * Tells a producer's followers that the pause is over. Run after the
 * response, like NotifyFollowersOfProduct, and for the same reason.
 */
class NotifyFollowersOfResume
{
    use Dispatchable, Queueable;

    public function __construct(public readonly Producer $producer) {}

    public function handle(): void
    {
        // Still public and still back by the time it runs.
        if ($this->producer->status !== 'active' || $this->producer->trashed() || $this->producer->isPaused()) {
            return;
        }

        $notification = SiteNotification::producerResumed(
            $this->producer->name,
            route('marketplace.producers.show', $this->producer->slug),
        );

        // In chunks, so the followers are never all in memory at once.
        $this->producer->followers()
            ->select('users.id')
            ->chunkById(200, fn ($followers) => Notification::send($followers, $notification), 'users.id');
    }
}
