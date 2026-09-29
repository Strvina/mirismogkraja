<?php

namespace App\Services;

use App\Models\Producer;
use App\Models\SubscriptionPlan;
use App\Notifications\SiteNotification;
use App\Support\Settings;
use Illuminate\Support\Facades\DB;

/**
 * The founding producers (task 20.4): the first producers to be approved get a
 * permanent number, shown on their page and on a public list, and they keep
 * it for good - including after they start paying like everyone else.
 *
 * The number is handed out on approval rather than on sign-up, so a request
 * that is never approved does not consume a place.
 */
class FoundingProducerService
{
    /**
     * What a founding place comes with besides the number: a year of
     * this plan, free. Premium rather than Basic, so a founding producer
     * sees the statistics and the featured row for themselves - which is
     * what gives them a reason to keep paying once the year is up.
     */
    public const PLAN = 'premium';

    public function __construct(
        private readonly SubscriptionService $subscriptions,
        private readonly Settings $settings,
    ) {}

    /**
     * How many founding places there are. A setting, not a constant: each
     * place is a free year of Premium, so the owner decides how many the
     * launch can afford.
     */
    public function limit(): int
    {
        return (int) $this->settings->get('founding.limit', (string) config('platform.founding_limit'));
    }

    /**
     * Give this producer the next free number, if any are left and it has
     * none already, together with the founding year of membership. Returns
     * the number it now holds, or null if the places are gone.
     *
     * Approving the same producer again - after a block, say - hands out
     * nothing new: the number and the year belong to the first approval.
     */
    public function claimNumberFor(Producer $producer): ?int
    {
        if ($producer->founding_number !== null) {
            return $producer->founding_number;
        }

        $number = $this->takeNextNumber($producer);

        if ($number !== null && $plan = SubscriptionPlan::where('slug', self::PLAN)->first()) {
            $membership = $this->subscriptions->grant($producer, $plan);

            $producer->user?->notify(SiteNotification::foundingGranted(
                $producer->name,
                $number,
                $membership->ends_at,
                route('marketplace.founding'),
            ));
        }

        return $number;
    }

    /**
     * Reading the highest number and writing the next one has to be one
     * step, or two admins approving at the same moment could both be handed
     * the same place - the unique index would then reject one of the saves.
     */
    private function takeNextNumber(Producer $producer): ?int
    {
        return DB::transaction(function () use ($producer) {
            $taken = Producer::withTrashed()
                ->lockForUpdate()
                ->max('founding_number') ?? 0;

            if ($taken >= $this->limit()) {
                return null;
            }

            $producer->forceFill([
                'founding_number' => $taken + 1,
                'founding_joined_at' => now(),
            ])->save();

            return $producer->founding_number;
        });
    }

    /** How many places are left, for the counter on the sign-up page. */
    public function remaining(): int
    {
        return max(0, $this->limit() - $this->claimed());
    }

    /**
     * How many places are gone. Read as the highest number issued rather
     * than as a count of rows: the numbers are handed out in sequence and
     * never reissued, so a producer that was later archived still holds its
     * founding place.
     */
    public function claimed(): int
    {
        return (int) (Producer::withTrashed()->max('founding_number') ?? 0);
    }
}
