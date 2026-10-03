<?php

namespace App\Jobs;

use App\Models\Product;
use App\Notifications\SiteNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Support\Facades\Notification;

/**
 * Tell a producer's followers about a product that just became public.
 *
 * Dispatched with afterResponse(): it runs in the same PHP process once the
 * producer already has their page back, so a producer with thousands of
 * followers never waits on thousands of inserts - and it needs no queue
 * worker, so it works on any host. Where a worker does run, dispatching it
 * to the queue instead is a one-word change.
 */
class NotifyFollowersOfProduct
{
    use Dispatchable, Queueable;

    public function __construct(public readonly Product $product) {}

    public function handle(): void
    {
        // Still public by the time it runs - it may have been hidden again.
        if (! $this->product->isPubliclyVisible()) {
            return;
        }

        $producer = $this->product->producer;
        $notification = SiteNotification::productPublished(
            $producer->name,
            $this->product->name,
            route('marketplace.products.show', $this->product->slug),
        );

        // In chunks, so the followers are never all in memory at once.
        $producer->followers()
            ->select('users.id')
            ->chunkById(200, fn ($followers) => Notification::send($followers, $notification), 'users.id');
    }
}
