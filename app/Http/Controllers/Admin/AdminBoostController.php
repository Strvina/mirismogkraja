<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Boost;
use App\Services\BoostService;
use App\Services\CancellationService;
use App\Support\Settings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Paid boosts in the admin panel: the prices on a settings tab,
 * and the payments by status on the others. Confirming is a person looking
 * at the bank statement, as with memberships.
 */
class AdminBoostController extends Controller
{
    public function index(Request $request, BoostService $boosts, CancellationService $cancellations): Response
    {
        $status = $request->string('status')->toString();

        if ($status !== 'settings' && ! in_array($status, Boost::STATUSES, true)) {
            $status = Boost::STATUS_PENDING;
        }

        return Inertia::render('admin/boosts/index', [
            'filters' => ['status' => $status],
            'counts' => Boost::countsByStatus(),
            // Only the open tab's data is loaded: the list, or the prices.
            'terms' => $status === 'settings' ? $boosts->terms() : null,
            'boosts' => $status === 'settings' ? null : Boost::query()
                ->with(['producer:id,name,slug', 'boostable'])
                ->where('status', $status)
                ->latest()
                ->paginate(30)
                ->withQueryString()
                ->through(fn (Boost $boost) => [
                    'id' => $boost->id,
                    'kind' => $boost->isProduct() ? 'product' : 'profile',
                    'name' => $boost->boostable?->name ?? __('Obrisano'),
                    'producer' => $boost->producer?->only(['id', 'name', 'slug']),
                    'status' => $boost->status,
                    'reference' => $boost->reference,
                    'amount_rsd' => $boost->amount_rsd,
                    'days' => $boost->days,
                    'ends_at' => $boost->ends_at,
                    'created_at' => $boost->created_at,
                    ...$cancellations->adminFields($boost),
                ]),
        ]);
    }

    public function confirm(Request $request, Boost $boost, BoostService $boosts): RedirectResponse
    {
        abort_unless($boost->status === Boost::STATUS_PENDING, 422);

        $boosts->confirm($boost, $request->user()->id);

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
