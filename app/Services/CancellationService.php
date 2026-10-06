<?php

namespace App\Services;

use App\Models\Boost;
use App\Models\CampaignParticipant;
use App\Models\ProducerSubscription;
use App\Notifications\SiteNotification;
use App\Support\PaidItems;

/**
 * An administrator stopping something paid for by slip - an unpaid request,
 * or one that is running. Money, if any is owed back, is settled with the
 * producer directly; the site only records that it stopped.
 */
class CancellationService
{
    public function __construct(private readonly SubscriptionService $subscriptions) {}

    public function cancel(ProducerSubscription|Boost|CampaignParticipant $item): void
    {
        $wasActive = $item->status === 'active';

        $item->forceFill(['status' => 'cancelled'])->save();

        // An unpaid request simply goes; something running is news.
        if (! $wasActive) {
            return;
        }

        // Memberships run one after another: what was queued behind the
        // stopped one takes its place now.
        if ($item instanceof ProducerSubscription) {
            $this->subscriptions->closeGapLeftBy($item);
        }

        $item->producer?->user?->notify(match (true) {
            $item instanceof ProducerSubscription => SiteNotification::membershipCancelled(PaidItems::name($item), PaidItems::url($item)),
            $item instanceof Boost => SiteNotification::boostCancelled(PaidItems::name($item), PaidItems::url($item)),
            default => SiteNotification::campaignCancelled(PaidItems::name($item), PaidItems::url($item)),
        });
    }

    /**
     * What every admin row of something paid for by slip carries.
     *
     * @return array{paid_kind: string, anchor: string}
     */
    public function adminFields(ProducerSubscription|Boost|CampaignParticipant $item): array
    {
        return [
            'paid_kind' => PaidItems::kind($item),
            'anchor' => PaidItems::anchor($item),
        ];
    }
}
