<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\CancellationService;
use App\Support\PaidItems;
use Illuminate\Http\RedirectResponse;

/**
 * Stopping anything paid for by slip - the same for memberships, boosts
 * and campaign places.
 */
class AdminCancellationController extends Controller
{
    public function __construct(private readonly CancellationService $cancellations) {}

    /** Cancel an unpaid request, or deactivate a running item. */
    public function cancel(string $kind, int $id): RedirectResponse
    {
        $item = PaidItems::find($kind, $id);

        abort_unless(in_array($item->status, ['pending_payment', 'active'], true), 422);

        $this->cancellations->cancel($item);

        return back();
    }
}
