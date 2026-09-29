<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\CancellationService;
use App\Support\PaidItems;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Stopping anything paid for by slip, and settling the refund - the same
 * two steps for memberships, boosts and campaign places.
 */
class AdminCancellationController extends Controller
{
    public function __construct(private readonly CancellationService $cancellations) {}

    /** Cancel an unpaid request, or deactivate a running item with the refund decided on. */
    public function cancel(Request $request, string $kind, int $id): RedirectResponse
    {
        $item = PaidItems::find($kind, $id);

        abort_unless(in_array($item->status, ['pending_payment', 'active'], true), 422);

        $data = $request->validate(['refund_rsd' => ['nullable', 'integer', 'min:0', 'max:'.$item->amount_rsd]]);

        $this->cancellations->cancel($item, (int) ($data['refund_rsd'] ?? 0));

        return back();
    }

    /** The money has left the bank. */
    public function refunded(string $kind, int $id): RedirectResponse
    {
        $this->cancellations->markRefunded(PaidItems::find($kind, $id));

        return back();
    }
}
