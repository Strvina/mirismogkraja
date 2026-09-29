<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Boost;
use App\Notifications\SiteNotification;
use App\Services\BoostService;
use App\Support\Settings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Paid boosts in the admin panel (task 20.2): the prices, and the payments
 * waiting to be confirmed. Confirming is a person looking at the bank
 * statement, as with memberships.
 */
class AdminBoostController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString();

        if (! in_array($status, Boost::STATUSES, true)) {
            $status = Boost::STATUS_PENDING;
        }

        return Inertia::render('admin/boosts/index', [
            'boosts' => Boost::query()
                ->with(['producer:id,name,slug', 'boostable'])
                ->where('status', $status)
                ->orderByRaw('cancel_requested_at is null')
                ->latest()
                ->paginate(30)
                ->withQueryString()
                ->through(fn (Boost $boost) => [
                    'id' => $boost->id,
                    'kind' => $boost->isProduct() ? 'product' : 'profile',
                    'name' => $boost->boostable?->name ?? 'Obrisano',
                    'producer' => $boost->producer?->only(['id', 'name', 'slug']),
                    'status' => $boost->status,
                    'reference' => $boost->reference,
                    'amount_rsd' => $boost->amount_rsd,
                    'days' => $boost->days,
                    'ends_at' => $boost->ends_at,
                    'created_at' => $boost->created_at,
                    'cancel_requested_at' => $boost->cancel_requested_at,
                ]),
            'filters' => ['status' => $status],
            'counts' => Boost::countsByStatus(),
        ]);
    }

    public function confirm(Request $request, Boost $boost, BoostService $boosts): RedirectResponse
    {
        abort_unless($boost->status === Boost::STATUS_PENDING, 422);

        $boosts->confirm($boost, $request->user()->id);

        return back();
    }

    /** Cancel an unpaid request, or deactivate a running boost; see AdminMembershipController::cancel(). */
    public function cancel(Boost $boost): RedirectResponse
    {
        $wasActive = $boost->status === Boost::STATUS_ACTIVE;

        $boost->update(['status' => Boost::STATUS_CANCELLED]);

        if ($wasActive) {
            $boost->loadMissing(['producer.user', 'boostable']);
            $boost->producer?->user?->notify(SiteNotification::boostCancelled($boost->boostable?->name ?? '', route('boosts.index')));
        }

        return back();
    }

    /** Applies to boosts asked for from now on; ones already asked for keep their price. */
    public function updateTerms(Request $request, Settings $settings): RedirectResponse
    {
        $data = $request->validate([
            'profile_price' => ['required', 'integer', 'min:0', 'max:1000000'],
            'product_price' => ['required', 'integer', 'min:0', 'max:1000000'],
            'days' => ['required', 'integer', 'min:1', 'max:90'],
        ]);

        $settings->put(collect($data)->mapWithKeys(fn ($value, string $key) => ['boost.'.$key => (string) $value])->all());

        return back();
    }
}
