<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPlan;
use App\Services\BoostService;
use App\Services\FoundingProducerService;
use App\Support\Settings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Everything that sets what producers pay, in one place: the plans, boost
 * prices, the bank details printed on every slip, and how many founding
 * places there are. Kept off the payment queues, which are read far more
 * often and need none of it.
 */
class AdminBillingController extends Controller
{
    public function index(Settings $settings, BoostService $boosts, FoundingProducerService $founding): Response
    {
        return Inertia::render('admin/billing/index', [
            'plans' => SubscriptionPlan::orderBy('level')->get(),
            'featureLabels' => SubscriptionPlan::FEATURES,
            'boostTerms' => $boosts->terms(),
            'payment' => collect(['recipient', 'address', 'account', 'purpose', 'model', 'code'])
                ->mapWithKeys(fn (string $key) => [
                    $key => $settings->get('payment.'.$key, (string) config('platform.payment.'.$key)),
                ])
                ->all(),
            'founding' => ['limit' => $founding->limit(), 'claimed' => $founding->claimed()],
        ]);
    }

    /**
     * How many founding places there are. Never fewer than already given
     * out: a number, once handed to a producer, is theirs for good.
     */
    public function updateFounding(Request $request, Settings $settings, FoundingProducerService $founding): RedirectResponse
    {
        $data = $request->validate([
            'limit' => ['required', 'integer', 'min:'.$founding->claimed(), 'max:1000'],
        ], [
            'limit.min' => 'Već je dodeljeno '.$founding->claimed().' mesta - broj ne može biti manji.',
        ]);

        $settings->put(['founding.limit' => (string) $data['limit']]);

        return back();
    }
}
