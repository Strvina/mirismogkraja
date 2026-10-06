<?php

namespace App\Jobs;

use App\Models\Category;
use App\Models\Producer;
use App\Models\User;
use App\Models\WantedAd;
use App\Notifications\SiteNotification;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Notification;

/**
 * Tells the producers who sell in an ad's category that a buyer is looking
 * for something. Run after the response, like the follower notifications,
 * and for the same reason.
 *
 * An ad without a category is only listed: telling every producer on the
 * site about every ad would teach them to ignore the bell.
 */
class NotifyProducersOfWantedAd
{
    use Dispatchable, Queueable;

    public function __construct(public readonly WantedAd $ad) {}

    public function handle(): void
    {
        // Still public by the time it runs, and filed under something.
        if ($this->ad->category_id === null || ! $this->ad->isListed()) {
            return;
        }

        $notification = SiteNotification::wantedAdPosted(
            $this->ad->title,
            route('wanted.show', $this->ad->id),
        );

        // The owners, not the producers: someone with two producers in the
        // category is told once. In chunks, so they are never all in memory.
        User::query()
            ->whereKeyNot($this->ad->user_id)
            ->whereNull('blocked_at')
            ->whereIn('id', Producer::published()
                ->whereHas('products', fn ($products) => $products->where('status', 'active')->whereIn('category_id', $this->categoryIds()))
                ->select('user_id'))
            ->select('id')
            ->chunkById(200, fn ($owners) => Notification::send($owners, $notification));
    }

    /**
     * Whose products the ad is about: the category's own, its
     * subcategories' - "Zimnica" is anyone making ajvar - and, for a
     * subcategory, the general category above it, where the same product is
     * filed by a producer who did not pick the narrower one.
     *
     * @return list<int>
     */
    private function categoryIds(): array
    {
        return [
            $this->ad->category_id,
            ...Category::where('parent_id', $this->ad->category_id)->pluck('id'),
            ...array_filter([$this->ad->category?->parent_id]),
        ];
    }
}
