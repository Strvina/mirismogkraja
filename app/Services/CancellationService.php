<?php

namespace App\Services;

use App\Models\Boost;
use App\Models\CampaignParticipant;
use App\Models\ProducerSubscription;
use App\Notifications\SiteNotification;
use App\Support\Admins;
use App\Support\PaidItems;
use Illuminate\Support\Carbon;

/**
 * Stopping something a producer paid for, and giving money back.
 *
 * The platform never holds a card or a balance: the payment came by bank
 * slip and the refund goes back the same way. So the site's part is the
 * bookkeeping around that transfer - how much, to which account, and
 * whether it has been sent - with the producer told at every step.
 */
class CancellationService
{
    /**
     * The unused share of what was paid, in whole dinars: a boost stopped
     * halfway through suggests half back. Only a suggestion - the admin
     * decides - and nothing for something that is not running.
     */
    public function suggestedRefund(ProducerSubscription|Boost|CampaignParticipant $item): int
    {
        if ($item->status !== 'active' || $item->amount_rsd <= 0) {
            return 0;
        }

        [$start, $end] = $item instanceof CampaignParticipant
            ? [$item->campaign?->starts_on?->copy()->startOfDay(), $item->campaign?->ends_on?->copy()->endOfDay()]
            : [$item->starts_at, $item->ends_at];

        if (! $start instanceof Carbon || ! $end instanceof Carbon || $end->lte($start)) {
            return 0;
        }

        $unused = max(0, now()->max($start)->diffInSeconds($end, false));

        return (int) round($item->amount_rsd * min(1, $unused / $start->diffInSeconds($end)));
    }

    /**
     * An unpaid request simply lapses. A running one stops now, with the
     * refund the admin decided on, if any - never more than was paid.
     */
    public function cancel(ProducerSubscription|Boost|CampaignParticipant $item, int $refund = 0): void
    {
        $wasActive = $item->status === 'active';
        $refund = $wasActive ? max(0, min($refund, $item->amount_rsd)) : 0;

        $item->forceFill([
            'status' => 'cancelled',
            'refund_rsd' => $refund > 0 ? $refund : null,
        ])->save();

        if (! $wasActive) {
            return;
        }

        $user = $item->producer?->user;

        if ($refund === 0) {
            $user?->notify(match (true) {
                $item instanceof ProducerSubscription => SiteNotification::membershipCancelled(PaidItems::name($item), PaidItems::url($item)),
                $item instanceof Boost => SiteNotification::boostCancelled(PaidItems::name($item), PaidItems::url($item)),
                default => SiteNotification::campaignCancelled(PaidItems::name($item), PaidItems::url($item)),
            });

            return;
        }

        $user?->notify(SiteNotification::refundDecided(
            PaidItems::label($item),
            PaidItems::name($item),
            $refund,
            $item->refund_account,
            PaidItems::url($item),
        ));
    }

    /**
     * Where the producer wants the money. Can be given with the request to
     * cancel, or afterwards; the admins hear about it only when a refund is
     * already decided and waiting on it.
     */
    public function setRefundAccount(ProducerSubscription|Boost|CampaignParticipant $item, string $account): void
    {
        if ($item->refund_account === $account) {
            return;
        }

        $item->forceFill(['refund_account' => $account])->save();

        if ($item->refund_rsd > 0 && $item->refunded_at === null) {
            Admins::notify(SiteNotification::forAdmins('refund-account', [
                'producer' => $item->producer?->name ?? '',
                'amount' => number_format($item->refund_rsd, 0, ',', '.'),
                'account' => $account,
            ], PaidItems::adminUrl($item)));
        }
    }

    /** The admin sent the money. */
    public function markRefunded(ProducerSubscription|Boost|CampaignParticipant $item): void
    {
        abort_unless($item->refund_rsd > 0 && $item->refunded_at === null, 422);

        $item->forceFill(['refunded_at' => now()])->save();

        $item->producer?->user?->notify(SiteNotification::refundPaid(
            PaidItems::label($item),
            PaidItems::name($item),
            $item->refund_rsd,
            (string) $item->refund_account,
            PaidItems::url($item),
        ));
    }

    /**
     * What an admin's row needs to stop the item and settle its refund.
     *
     * @return array<string, mixed>
     */
    public function adminFields(ProducerSubscription|Boost|CampaignParticipant $item): array
    {
        return [
            'paid_kind' => PaidItems::kind($item),
            'anchor' => PaidItems::anchor($item),
            'cancel_requested_at' => $item->cancel_requested_at,
            'refund_account' => $item->refund_account,
            'refund_suggestion' => $item->status === 'active' ? $this->suggestedRefund($item) : null,
            'refund' => self::refundState($item),
        ];
    }

    /**
     * What both sides' pages show about a refund.
     *
     * @return array{amount: int, account: string|null, refunded_at: Carbon|null}|null
     */
    public static function refundState(ProducerSubscription|Boost|CampaignParticipant $item): ?array
    {
        return $item->refund_rsd > 0
            ? ['amount' => $item->refund_rsd, 'account' => $item->refund_account, 'refunded_at' => $item->refunded_at]
            : null;
    }
}
