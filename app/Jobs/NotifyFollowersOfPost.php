<?php

namespace App\Jobs;

use App\Models\Post;
use App\Notifications\SiteNotification;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Notification;

/**
 * Tells a producer's followers about a new story or recipe. Run after the
 * response, like NotifyFollowersOfProduct, and for the same reason.
 */
class NotifyFollowersOfPost
{
    use Dispatchable, Queueable;

    public function __construct(public readonly Post $post) {}

    public function handle(): void
    {
        // Still public by the time it runs - it may have been hidden again.
        if (! $this->post->isPubliclyVisible()) {
            return;
        }

        $producer = $this->post->producer;
        $notification = SiteNotification::postPublished(
            $producer->name,
            $this->post->title,
            route('marketplace.posts.show', $this->post->slug),
        );

        // In chunks, so the followers are never all in memory at once.
        $producer->followers()
            ->select('users.id')
            ->chunkById(200, fn ($followers) => Notification::send($followers, $notification), 'users.id');
    }
}
