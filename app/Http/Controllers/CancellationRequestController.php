<?php

namespace App\Http\Controllers;

use App\Models\Boost;
use App\Models\CampaignParticipant;
use App\Models\ProducerSubscription;
use App\Notifications\SiteNotification;
use App\Support\Admins;
use Illuminate\Http\RedirectResponse;

/**
 * A producer asking for something they paid for to be stopped - a
 * membership, a boost, a campaign place. The request only records the
 * wish; an admin deactivates it, and any refund is agreed off the site.
 */
class CancellationRequestController extends Controller
{
    public function membership(ProducerSubscription $subscription): RedirectResponse
    {
        return $this->request($subscription, 'članarina '.$subscription->plan?->name, route('admin.memberships.index', ['status' => 'active']));
    }

    public function boost(Boost $boost): RedirectResponse
    {
        return $this->request(
            $boost,
            ($boost->isProduct() ? 'isticanje proizvoda ' : 'isticanje profila ').$boost->boostable?->name,
            route('admin.boosts.index', ['status' => 'active']),
        );
    }

    public function campaign(CampaignParticipant $participant): RedirectResponse
    {
        return $this->request($participant, 'učešće u kampanji '.$participant->campaign->name, route('admin.campaigns.index'));
    }

    /** $what and $adminUrl are for the admins' notification: what is asked about, and where to act on it. */
    private function request(ProducerSubscription|Boost|CampaignParticipant $item, string $what, string $adminUrl): RedirectResponse
    {
        $this->authorize('update', $item->producer);

        // Only something running can be stopped; an unpaid request simply
        // lapses, and a finished one is already over.
        abort_unless($item->status === 'active', 422);

        if ($item->cancel_requested_at === null) {
            $item->forceFill(['cancel_requested_at' => now()])->save();

            Admins::notify(SiteNotification::forAdmins('cancel-requested', [
                'producer' => $item->producer->name,
                'what' => $what,
            ], $adminUrl));
        }

        return back()->with('status', __('Zahtev za otkazivanje je poslat. Javićemo vam se.'));
    }
}
