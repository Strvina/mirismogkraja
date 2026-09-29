<?php

namespace App\Http\Controllers;

use App\Notifications\SiteNotification;
use App\Services\CancellationService;
use App\Support\Admins;
use App\Support\PaidItems;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * A producer asking for something they paid for to be stopped - a
 * membership, a boost, a campaign place - and saying where any money
 * should go back to. The request only records the wish; an admin
 * deactivates it and decides the refund (see CancellationService).
 */
class CancellationRequestController extends Controller
{
    /** A Serbian bank account, with or without the dashes. */
    public const ACCOUNT_RULE = 'regex:/^\d{3}-?\d{1,13}-?\d{2}$/';

    public function store(Request $request, string $kind, int $id, CancellationService $cancellations): RedirectResponse
    {
        $item = PaidItems::find($kind, $id);
        $this->authorize('update', $item->producer);

        // Only something running can be stopped; an unpaid request simply
        // lapses, and a finished one is already over.
        abort_unless($item->status === 'active', 422);

        $data = $request->validate(['refund_account' => ['nullable', 'string', self::ACCOUNT_RULE]]);

        if (filled($data['refund_account'] ?? null)) {
            $cancellations->setRefundAccount($item, $data['refund_account']);
        }

        if ($item->cancel_requested_at === null) {
            $item->forceFill(['cancel_requested_at' => now()])->save();

            Admins::notify(SiteNotification::forAdmins('cancel-requested', [
                'producer' => $item->producer->name,
                'what_label' => PaidItems::label($item),
                'name' => PaidItems::name($item),
            ], PaidItems::adminUrl($item)));
        }

        return back()->with('status', __('Zahtev za otkazivanje je poslat. Javićemo vam se.'));
    }

    /** The account for a refund already decided, given after the fact. */
    public function refundAccount(Request $request, string $kind, int $id, CancellationService $cancellations): RedirectResponse
    {
        $item = PaidItems::find($kind, $id);
        $this->authorize('update', $item->producer);

        abort_unless($item->refund_rsd > 0 && $item->refunded_at === null, 422);

        $data = $request->validate(['refund_account' => ['required', 'string', self::ACCOUNT_RULE]]);

        $cancellations->setRefundAccount($item, $data['refund_account']);

        return back()->with('status', __('Hvala! Novac šaljemo na taj račun i javljamo vam kada ga uplatimo.'));
    }
}
