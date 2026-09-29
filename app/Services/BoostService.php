<?php

namespace App\Services;

use App\Models\Boost;
use App\Models\Producer;
use App\Models\Product;
use App\Notifications\SiteNotification;
use App\Support\Admins;
use App\Support\PaymentReference;
use App\Support\Settings;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Paid boosts (task 20.2).
 *
 * A boost buys a place in the labelled "Istaknuto" row - of the producer
 * directory for a profile, of the catalog for a product - for a number of
 * days. It never moves anything up the ordinary listings: the row is drawn
 * at random from everyone paying on each visit, so no single payer holds
 * the top, and a visitor can always see what was paid for.
 *
 * Paid by bank slip, like a membership: asking for one hands back a slip,
 * and an admin confirms the money.
 */
class BoostService
{
    public function __construct(private readonly Settings $settings) {}

    /**
     * Current prices and length, as the admin set them.
     *
     * @return array{profile_price: int, product_price: int, days: int}
     */
    public function terms(): array
    {
        return collect(['profile_price', 'product_price', 'days'])
            ->mapWithKeys(fn (string $key) => [
                $key => (int) $this->settings->get('boost.'.$key, (string) config('platform.boost.'.$key)),
            ])
            ->all();
    }

    /**
     * Ask to boost a producer's profile or one of their products. An unpaid
     * request for the same thing is replaced, so the queue holds one line
     * per boosted thing.
     */
    public function request(Producer $producer, Producer|Product $target): Boost
    {
        $terms = $this->terms();
        $type = $target instanceof Product ? Boost::PRODUCT : Boost::PROFILE;

        Boost::query()
            ->where('boostable_type', $type)
            ->where('boostable_id', $target->id)
            ->where('status', Boost::STATUS_PENDING)
            ->delete();

        $boost = Boost::create([
            'household_id' => $producer->id,
            'boostable_type' => $type,
            'boostable_id' => $target->id,
            'status' => Boost::STATUS_PENDING,
            'reference' => PaymentReference::generate(),
            'amount_rsd' => $type === Boost::PRODUCT ? $terms['product_price'] : $terms['profile_price'],
            'days' => $terms['days'],
        ]);

        $producer->user?->notify(SiteNotification::boostRequested($target->name, $boost->amount_rsd, $boost->reference, route('boosts.index')));
        Admins::notify(SiteNotification::forAdmins('boost-requested', [
            'producer' => $producer->name,
            'name' => $target->name,
            'amount' => number_format($boost->amount_rsd, 0, ',', '.'),
            'reference' => $boost->reference,
        ], route('admin.boosts.index')));

        return $boost;
    }

    /**
     * The money arrived. A boost of something already boosted starts where
     * the running one ends, so buying another week early adds a week.
     */
    public function confirm(Boost $boost, int $confirmedBy): Boost
    {
        $current = Boost::query()
            ->running()
            ->where('boostable_type', $boost->boostable_type)
            ->where('boostable_id', $boost->boostable_id)
            ->max('ends_at');

        $startsAt = $current ? max(now(), Carbon::parse($current)) : now();

        $boost->update([
            'status' => Boost::STATUS_ACTIVE,
            'starts_at' => $startsAt,
            'ends_at' => $startsAt->copy()->addDays($boost->days),
            'confirmed_by' => $confirmedBy,
            'confirmed_at' => now(),
        ]);

        $boost->loadMissing(['producer.user', 'boostable']);

        $boost->producer->user?->notify(SiteNotification::boostActivated(
            $boost->boostable?->name ?? $boost->producer->name,
            $boost->ends_at,
            route('boosts.index'),
        ));

        return $boost;
    }

    /**
     * Ids of the producers or products with a boost running now.
     *
     * @return Collection<int, int>
     */
    public function runningIds(string $type): Collection
    {
        return Boost::query()
            ->running()
            ->where('boostable_type', $type)
            ->distinct()
            ->pluck('boostable_id');
    }

    /**
     * Tell producers whose boost ends within a day, once - so a producer who
     * wants to stay on top can buy the next week before this one ends.
     */
    public function warnEnding(): int
    {
        $ending = Boost::query()
            ->running()
            ->whereNull('ending_warned_at')
            ->where('ends_at', '<=', now()->addDay())
            ->with(['producer.user', 'boostable'])
            ->get();

        foreach ($ending as $boost) {
            $boost->producer?->user?->notify(SiteNotification::boostEnding($boost->boostable?->name ?? '', $boost->ends_at, route('boosts.index')));
            $boost->update(['ending_warned_at' => now()]);
        }

        return $ending->count();
    }

    /**
     * Close boosts that have run out, and tell their producers. Listings
     * already stop showing a boost at its end date; this keeps the admin's
     * tabs honest. Safe to run more than once a day.
     */
    public function closeEnded(): int
    {
        $ended = Boost::query()
            ->where('status', Boost::STATUS_ACTIVE)
            ->where('ends_at', '<=', now())
            ->with(['producer.user', 'boostable'])
            ->get();

        foreach ($ended as $boost) {
            $boost->update(['status' => Boost::STATUS_EXPIRED]);
            $boost->producer?->user?->notify(SiteNotification::boostExpired($boost->boostable?->name ?? '', route('boosts.index')));
        }

        return $ended->count();
    }
}
