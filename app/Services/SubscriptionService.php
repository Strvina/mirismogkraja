<?php

namespace App\Services;

use App\Models\Producer;
use App\Models\ProducerSubscription;
use App\Models\SubscriptionPlan;
use App\Notifications\SiteNotification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Memberships (task 20.1).
 *
 * Payment is by bank slip, so this service never talks to a payment
 * provider: it records what a producer asked for, hands back a reference to
 * write on the slip, and waits for an admin to confirm the money.
 *
 * What a producer loses when a membership runs out is deliberately mild -
 * the profile stays online and keeps its founding number, it only drops back
 * to what the lowest plan offers. A marketplace that hides a producer the
 * day they are late to a bank counter loses the buyer's search result, not
 * just the producer's benefit.
 */
class SubscriptionService
{
    /**
     * The plan a producer's benefits are currently based on: their paid one,
     * or the free floor when they have none.
     */
    public function planFor(Producer $producer): ?SubscriptionPlan
    {
        $active = $producer->subscriptions()
            ->active()
            ->with('plan')
            ->orderByDesc('ends_at')
            ->first();

        return $active?->plan ?? $this->basePlan();
    }

    public function hasFeature(Producer $producer, string $feature): bool
    {
        return (bool) $this->planFor($producer)?->has($feature);
    }

    /** The cheapest active plan - what everyone gets without paying. */
    public function basePlan(): ?SubscriptionPlan
    {
        return SubscriptionPlan::where('is_active', true)->orderBy('level')->first();
    }

    /**
     * Record that a producer wants a plan and give them something to write on
     * the slip. An unpaid request for the same producer is replaced rather
     * than stacked, so the queue holds one line per producer.
     */
    public function request(Producer $producer, SubscriptionPlan $plan): ProducerSubscription
    {
        $producer->subscriptions()
            ->where('status', ProducerSubscription::STATUS_PENDING)
            ->delete();

        return $producer->subscriptions()->create([
            'subscription_plan_id' => $plan->id,
            'status' => ProducerSubscription::STATUS_PENDING,
            'reference' => ProducerSubscription::newReference(),
            'amount_rsd' => $plan->price_rsd,
        ]);
    }

    /**
     * The money arrived. A renewal starts where the current membership ends,
     * not today, so paying early never costs the producer the days they have
     * already paid for.
     */
    public function confirmPayment(ProducerSubscription $subscription, int $confirmedBy): ProducerSubscription
    {
        $subscription->loadMissing(['plan', 'producer']);

        $current = $subscription->producer
            ->subscriptions()
            ->active()
            ->max('ends_at');

        $startsAt = $current ? max(now(), Carbon::parse($current)) : now();

        $subscription->update([
            'status' => ProducerSubscription::STATUS_ACTIVE,
            'starts_at' => $startsAt,
            'ends_at' => $startsAt->copy()->addDays($subscription->plan->duration_days),
            'confirmed_by' => $confirmedBy,
            'confirmed_at' => now(),
            'expiry_warned_at' => null,
        ]);

        $subscription->producer->user?->notify(SiteNotification::membershipActivated(
            $subscription->plan->name,
            $subscription->ends_at->translatedFormat('j. F Y.'),
            route('memberships.index'),
        ));

        return $subscription;
    }

    /**
     * Warn about memberships that are about to run out, and close the ones
     * that already have. Run daily; both steps are written so that running
     * it twice in a day changes nothing the second time.
     *
     * @return array{warned: int, expired: int}
     */
    public function processExpiries(): array
    {
        $warned = $this->warnAboutEndings();
        $expired = $this->closeEndedMemberships();

        return ['warned' => $warned, 'expired' => $expired];
    }

    private function warnAboutEndings(): int
    {
        $ending = ProducerSubscription::query()
            ->active()
            ->whereNull('expiry_warned_at')
            ->where('ends_at', '<=', now()->addDays(ProducerSubscription::WARN_DAYS_BEFORE))
            ->with(['plan', 'producer.user'])
            ->get();

        foreach ($ending as $subscription) {
            $subscription->producer->user?->notify(SiteNotification::membershipEnding(
                $subscription->plan->name,
                $subscription->ends_at->translatedFormat('j. F Y.'),
                route('memberships.index'),
            ));

            $subscription->update(['expiry_warned_at' => now()]);
        }

        return $ending->count();
    }

    private function closeEndedMemberships(): int
    {
        /** @var Collection<int, ProducerSubscription> $ended */
        $ended = ProducerSubscription::query()
            ->where('status', ProducerSubscription::STATUS_ACTIVE)
            ->where('ends_at', '<=', now())
            ->with(['plan', 'producer.user'])
            ->get();

        foreach ($ended as $subscription) {
            $subscription->update(['status' => ProducerSubscription::STATUS_EXPIRED]);

            $subscription->producer->user?->notify(SiteNotification::membershipExpired(
                $subscription->plan->name,
                route('memberships.index'),
            ));
        }

        return $ended->count();
    }
}
