<?php

namespace App\Http\Controllers;

use App\Models\Boost;
use App\Models\CampaignParticipant;
use App\Models\ProducerSubscription;
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
        return $this->request($subscription);
    }

    public function boost(Boost $boost): RedirectResponse
    {
        return $this->request($boost);
    }

    public function campaign(CampaignParticipant $participant): RedirectResponse
    {
        return $this->request($participant);
    }

    private function request(ProducerSubscription|Boost|CampaignParticipant $item): RedirectResponse
    {
        $this->authorize('update', $item->producer);

        // Only something running can be stopped; an unpaid request simply
        // lapses, and a finished one is already over.
        abort_unless($item->status === 'active', 422);

        if ($item->cancel_requested_at === null) {
            $item->forceFill(['cancel_requested_at' => now()])->save();
        }

        return back()->with('status', 'Zahtev za otkazivanje je poslat. Javićemo vam se.');
    }
}
