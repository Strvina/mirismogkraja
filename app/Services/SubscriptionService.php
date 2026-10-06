<?php

namespace App\Services;

use App\Models\Producer;
use App\Models\ProducerSubscription;
use App\Models\SubscriptionPlan;
use App\Notifications\SiteNotification;
use App\Support\Admins;
use App\Support\PaidItems;
use App\Support\PaymentReference;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Memberships.
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
    /** @var array<string, list<int>> */
    private array $planIdsByFeature = [];

    /** @var EloquentCollection<int, SubscriptionPlan>|null */
    private ?EloquentCollection $plans = null;

    /**
     * The plan a producer's benefits are currently based on: the one in
     * force today, or the free floor when they have none. Not one that is
     * paid for but still waiting behind it.
     */
    public function planFor(Producer $producer): ?SubscriptionPlan
    {
        $running = $producer->subscriptions()
            ->running()
            ->with('plan')
            ->get()
            // Only one runs at a time; should two ever overlap, the higher wins.
            ->sortByDesc(fn (ProducerSubscription $subscription) => $subscription->plan->level)
            ->first();

        return $running?->plan ?? $this->basePlan();
    }

    public function hasFeature(Producer $producer, string $feature): bool
    {
        return ProducerSubscription::query()
            ->running()
            ->where('producer_id', $producer->id)
            ->whereIn('subscription_plan_id', $this->planIdsWith($feature))
            ->exists();
    }

    /**
     * Every producer whose current membership includes a feature - what a
     * listing needs to badge or feature a whole page of cards at once,
     * instead of asking producer by producer.
     *
     * Two small queries: the plans (a handful of rows, whose features are a
     * JSON list and so are read in PHP rather than matched in SQL that
     * differs between MySQL and SQLite), then the active memberships on
     * them.
     *
     * @return Collection<int, int>
     */
    public function producerIdsWith(string $feature): Collection
    {
        return ProducerSubscription::query()
            ->running()
            ->whereIn('subscription_plan_id', $this->planIdsWith($feature))
            ->distinct()
            ->pluck('producer_id');
    }

    /**
     * Flag each producer that carries the premium badge, for the card that
     * shows them. Set as an attribute on the loaded models only - these are
     * read for display, never saved back.
     *
     * @param  iterable<Producer>  $producers
     */
    /**
     * The plans that include a feature. A handful of rows, read once per
     * request however often it is asked.
     *
     * @return list<int>
     */
    private function planIdsWith(string $feature): array
    {
        // The plans themselves are read once, whichever features are asked
        // about: the home page asks about two.
        $this->plans ??= SubscriptionPlan::query()->get(['id', 'features']);

        return $this->planIdsByFeature[$feature] ??= $this->plans
            ->filter(fn (SubscriptionPlan $plan) => $plan->has($feature))
            ->modelKeys();
    }

    public function markPremium(iterable $producers): void
    {
        $premium = $this->producerIdsWith('premium_badge');

        foreach ($producers as $producer) {
            $producer->setAttribute('is_premium', $premium->contains($producer->id));
        }
    }

    /** The cheapest active plan - what everyone gets without paying. */
    public function basePlan(): ?SubscriptionPlan
    {
        return SubscriptionPlan::where('is_active', true)->orderBy('level')->first();
    }

    /**
     * Record that a producer wants a plan and give them something to write on
     * the slip. One unpaid request per producer: the same plan again hands
     * back the same slip (its reference may already be on a payment); a
     * different plan replaces it.
     */
    public function request(Producer $producer, SubscriptionPlan $plan): ProducerSubscription
    {
        $pending = $producer->subscriptions()->where('status', ProducerSubscription::STATUS_PENDING)->get();
        $same = $pending->firstWhere('subscription_plan_id', $plan->id);

        if ($same) {
            return $same;
        }

        $producer->subscriptions()->whereKey($pending->modelKeys())->delete();

        $subscription = $producer->subscriptions()->create([
            'subscription_plan_id' => $plan->id,
            'status' => ProducerSubscription::STATUS_PENDING,
            'reference' => PaymentReference::generate(),
            'amount_rsd' => $plan->price_rsd,
        ]);

        $producer->user?->notify(SiteNotification::membershipRequested($plan->name, $plan->price_rsd, $subscription->reference, PaidItems::slipUrl($subscription)));
        Admins::notify(SiteNotification::forAdmins('membership-requested', [
            'producer' => $producer->name,
            'plan' => $plan->name,
            'amount' => number_format($plan->price_rsd, 0, ',', '.'),
            'reference' => $subscription->reference,
        ], PaidItems::adminUrl($subscription)));

        return $subscription;
    }

    /**
     * A membership nobody pays for - the founding producers' first year, or
     * the month a referral earns ($days).
     * Recorded like any other, at 0 RSD, so it shows in the
     * admin panel, runs out on its own date and sends the same reminders;
     * nothing about it is special-cased later.
     */
    public function grant(Producer $producer, SubscriptionPlan $plan, ?int $days = null): ProducerSubscription
    {
        $subscription = $producer->subscriptions()->create([
            'subscription_plan_id' => $plan->id,
            'status' => ProducerSubscription::STATUS_PENDING,
            'reference' => PaymentReference::generate(),
            'amount_rsd' => 0,
        ]);

        // Quietly: the founding notification says what this is, and a
        // second "membership activated" beside it would only repeat it.
        return $this->confirmPayment($subscription, null, notify: false, days: $days);
    }

    /**
     * The money arrived. Where the membership starts depends on what the
     * producer already has, and either way no paid day is lost:
     *
     * - behind everything on the same plan or a higher one. A renewal starts
     *   where the current membership ends, not today, so paying early costs
     *   nothing;
     * - ahead of everything on a lower plan. An upgrade is in force at once,
     *   and what is left of the lower plan moves back by the upgrade's
     *   length and carries on after it.
     *
     * $confirmedBy is the admin who saw the payment; null when there was no
     * payment to see. $days is for a gift shorter than the plan's own term
     * (a referral's month); a paid membership always runs the plan's length.
     */
    public function confirmPayment(ProducerSubscription $subscription, ?int $confirmedBy, bool $notify = true, ?int $days = null): ProducerSubscription
    {
        $subscription->loadMissing(['plan', 'producer']);
        $days ??= $subscription->plan->duration_days;

        DB::transaction(function () use ($subscription, $confirmedBy, $days) {
            $others = $subscription->producer
                ->subscriptions()
                ->active()
                ->whereKeyNot($subscription->id)
                ->with('plan')
                ->lockForUpdate()
                ->get();

            [$lower, $sameOrHigher] = $others->partition(
                fn (ProducerSubscription $other) => $other->plan->level < $subscription->plan->level
            );

            $startsAt = max(now(), $sameOrHigher->max('ends_at') ?? now());

            foreach ($lower->filter(fn (ProducerSubscription $other) => $other->ends_at->greaterThan($startsAt)) as $other) {
                $other->update([
                    // One already under way stops here and resumes after
                    // the upgrade with exactly the time it had left.
                    'starts_at' => max($other->starts_at, $startsAt)->copy()->addDays($days),
                    'ends_at' => $other->ends_at->copy()->addDays($days),
                    'expiry_warned_at' => null,
                ]);
            }

            $subscription->update([
                'status' => ProducerSubscription::STATUS_ACTIVE,
                'starts_at' => $startsAt,
                'ends_at' => $startsAt->copy()->addDays($days),
                'confirmed_by' => $confirmedBy,
                'confirmed_at' => now(),
                'expiry_warned_at' => null,
            ]);
        });

        if ($notify) {
            $subscription->producer->user?->notify(SiteNotification::membershipActivated(
                $subscription->plan->name,
                $subscription->ends_at,
                PaidItems::url($subscription),
            ));
        }

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
            try {
                // By e-mail as well: paying takes a trip to a bank counter,
                // and a producer may not open the site inside two weeks.
                $subscription->producer->user?->notify(SiteNotification::membershipEnding(
                    $subscription->plan->name,
                    $subscription->ends_at,
                    PaidItems::url($subscription),
                )->alsoByMail());
            } catch (Throwable $e) {
                // The bell has it by now; a mail server that is down must
                // not stop the rest of the run or repeat the warning daily.
                report($e);
            }

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
                PaidItems::url($subscription),
            ));
        }

        return $ended->count();
    }
}
